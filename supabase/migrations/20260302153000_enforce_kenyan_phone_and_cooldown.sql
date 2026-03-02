-- Enforce Kenyan mobile phone numbers and 6-hour daily cooldown per number.
-- This is implemented at database level so it cannot be bypassed by client changes.

CREATE OR REPLACE FUNCTION normalize_kenyan_phone(input_phone text)
RETURNS text AS $$
DECLARE
  cleaned text;
BEGIN
  IF input_phone IS NULL THEN
    RETURN NULL;
  END IF;

  -- Keep digits only for robust normalization.
  cleaned := regexp_replace(input_phone, '[^0-9]', '', 'g');

  -- Convert common local/international forms to +254XXXXXXXXX.
  IF cleaned ~ '^254[71][0-9]{8}$' THEN
    RETURN '+' || cleaned;
  ELSIF cleaned ~ '^0[71][0-9]{8}$' THEN
    RETURN '+254' || substring(cleaned FROM 2);
  ELSIF cleaned ~ '^[71][0-9]{8}$' THEN
    RETURN '+254' || cleaned;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION enforce_kenyan_phone_on_patients()
RETURNS trigger AS $$
DECLARE
  normalized text;
BEGIN
  normalized := normalize_kenyan_phone(NEW.phone_number);
  IF normalized IS NULL THEN
    RAISE EXCEPTION 'Only Kenyan mobile numbers are allowed. Use formats like +2547XXXXXXXX or +2541XXXXXXXX.'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.phone_number := normalized;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_kenyan_phone_on_patients ON patients;
CREATE TRIGGER trigger_enforce_kenyan_phone_on_patients
  BEFORE INSERT OR UPDATE OF phone_number ON patients
  FOR EACH ROW
  EXECUTE FUNCTION enforce_kenyan_phone_on_patients();

CREATE OR REPLACE FUNCTION enforce_queue_cooldown_per_phone()
RETURNS trigger AS $$
DECLARE
  patient_phone text;
  entry_time timestamptz;
  latest_same_day timestamptz;
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

DROP TRIGGER IF EXISTS trigger_enforce_queue_cooldown_per_phone ON queue_entries;
CREATE TRIGGER trigger_enforce_queue_cooldown_per_phone
  BEFORE INSERT ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_queue_cooldown_per_phone();
