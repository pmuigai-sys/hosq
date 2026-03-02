-- Admin operations controls:
-- 1) Global SMS enable/disable switch.
-- 2) Cooldown bypass controls for Kenyan phone numbers.

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS checkin_cooldown_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  bypass_until timestamptz NOT NULL,
  reason text,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_settings (key, value)
VALUES ('sms_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_cooldown_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
CREATE POLICY "Admins can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (check_is_admin());

DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

DROP POLICY IF EXISTS "Admins can view cooldown overrides" ON checkin_cooldown_overrides;
CREATE POLICY "Admins can view cooldown overrides"
  ON checkin_cooldown_overrides FOR SELECT
  TO authenticated
  USING (check_is_admin());

DROP POLICY IF EXISTS "Admins can manage cooldown overrides" ON checkin_cooldown_overrides;
CREATE POLICY "Admins can manage cooldown overrides"
  ON checkin_cooldown_overrides FOR ALL
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Replace cooldown function to support admin bypass overrides.
CREATE OR REPLACE FUNCTION enforce_queue_cooldown_per_phone()
RETURNS trigger AS $$
DECLARE
  patient_phone text;
  entry_time timestamptz;
  latest_same_day timestamptz;
  bypass_until_ts timestamptz;
BEGIN
  entry_time := COALESCE(NEW.checked_in_at, now());

  SELECT phone_number
  INTO patient_phone
  FROM patients
  WHERE id = NEW.patient_id;

  IF patient_phone IS NULL THEN
    RAISE EXCEPTION 'Patient phone number not found for queue entry.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT bypass_until
  INTO bypass_until_ts
  FROM checkin_cooldown_overrides
  WHERE phone_number = patient_phone;

  IF bypass_until_ts IS NOT NULL AND entry_time <= bypass_until_ts THEN
    RETURN NEW;
  END IF;

  SELECT qe.checked_in_at
  INTO latest_same_day
  FROM queue_entries qe
  JOIN patients p ON p.id = qe.patient_id
  WHERE p.phone_number = patient_phone
    AND (qe.checked_in_at AT TIME ZONE 'Africa/Nairobi')::date = (entry_time AT TIME ZONE 'Africa/Nairobi')::date
  ORDER BY qe.checked_in_at DESC
  LIMIT 1;

  IF latest_same_day IS NOT NULL AND entry_time < latest_same_day + interval '6 hours' THEN
    RAISE EXCEPTION 'This phone number can only check in once every 6 hours. Please try again later.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
