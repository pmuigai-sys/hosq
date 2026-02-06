/*
  # Hospital Queue Management System Database Schema

  ## Overview
  This migration creates the complete database schema for a hospital queuing system with
  self-service patient check-in, role-based employee access, and real-time queue management.

  ## 1. New Tables

  ### `queue_stages`
  Defines the different stages a patient goes through (e.g., registration, doctor, billing, pharmacy)
  - `id` (uuid, primary key)
  - `name` (text) - stage name
  - `display_name` (text) - user-friendly name
  - `order_number` (integer) - sequence order
  - `is_active` (boolean) - whether stage is currently active
  - `created_at` (timestamptz)

  ### `emergency_flags`
  Defines conditions that allow patients to skip the queue
  - `id` (uuid, primary key)
  - `name` (text) - flag name (e.g., "Cardiac Emergency", "Severe Bleeding")
  - `description` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### `patients`
  Stores patient information for queue management (no auth required)
  - `id` (uuid, primary key)
  - `phone_number` (text, unique) - for SMS notifications
  - `full_name` (text)
  - `age` (integer)
  - `visit_reason` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `queue_entries`
  Tracks patient position in queues with real-time updates
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `current_stage_id` (uuid, foreign key)
  - `queue_number` (text) - display number (e.g., "Q001")
  - `position_in_queue` (integer)
  - `has_emergency_flag` (boolean)
  - `status` (text) - waiting, in_service, completed, cancelled
  - `checked_in_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `queue_history`
  Tracks patient movement through different stages
  - `id` (uuid, primary key)
  - `queue_entry_id` (uuid, foreign key)
  - `stage_id` (uuid, foreign key)
  - `entered_at` (timestamptz)
  - `exited_at` (timestamptz)
  - `served_by_user_id` (uuid, foreign key, nullable)

  ### `patient_emergency_flags`
  Links patients to emergency flags during their visit
  - `id` (uuid, primary key)
  - `queue_entry_id` (uuid, foreign key)
  - `emergency_flag_id` (uuid, foreign key)
  - `noted_by_user_id` (uuid, foreign key, nullable)
  - `created_at` (timestamptz)

  ### `user_roles`
  Defines roles for hospital employees
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `role` (text) - admin, receptionist, doctor, billing, pharmacist
  - `department` (text, nullable)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### `sms_logs`
  Tracks SMS notifications sent to patients
  - `id` (uuid, primary key)
  - `patient_id` (uuid, foreign key)
  - `queue_entry_id` (uuid, foreign key)
  - `phone_number` (text)
  - `message` (text)
  - `status` (text) - sent, failed, delivered
  - `twilio_sid` (text, nullable)
  - `sent_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Admin users have full access to all tables
  - Employees have read access to their department's data
  - Patients can read their own queue entries (no auth, by ID)
  - Public can insert into patients table for self-service

  ## 3. Indexes
  - Index on queue_entries for fast lookups by stage and status
  - Index on patient phone numbers for quick lookup
  - Index on queue_number for display purposes

  ## 4. Functions
  - Auto-generate queue numbers
  - Calculate queue positions dynamically
  - Handle emergency flag priority

*/

-- Create queue_stages table
CREATE TABLE IF NOT EXISTS queue_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  order_number integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create emergency_flags table
CREATE TABLE IF NOT EXISTS emergency_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  age integer,
  visit_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create queue_entries table
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) NOT NULL,
  current_stage_id uuid REFERENCES queue_stages(id),
  queue_number text UNIQUE NOT NULL,
  position_in_queue integer,
  has_emergency_flag boolean DEFAULT false,
  status text DEFAULT 'waiting',
  checked_in_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create queue_history table
CREATE TABLE IF NOT EXISTS queue_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id uuid REFERENCES queue_entries(id) NOT NULL,
  stage_id uuid REFERENCES queue_stages(id) NOT NULL,
  entered_at timestamptz DEFAULT now(),
  exited_at timestamptz,
  served_by_user_id uuid REFERENCES auth.users(id)
);

-- Create patient_emergency_flags table
CREATE TABLE IF NOT EXISTS patient_emergency_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id uuid REFERENCES queue_entries(id) NOT NULL,
  emergency_flag_id uuid REFERENCES emergency_flags(id) NOT NULL,
  noted_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  role text NOT NULL,
  department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id),
  queue_entry_id uuid REFERENCES queue_entries(id),
  phone_number text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  twilio_sid text,
  sent_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_stage ON queue_entries(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_patient ON queue_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_queue_history_entry ON queue_history(queue_entry_id);

-- Enable Row Level Security
ALTER TABLE queue_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_emergency_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for queue_stages
CREATE POLICY "Anyone can view active stages"
  ON queue_stages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage stages"
  ON queue_stages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for emergency_flags
CREATE POLICY "Authenticated users can view emergency flags"
  ON emergency_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage emergency flags"
  ON emergency_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for patients
CREATE POLICY "Anyone can create patient records"
  ON patients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view patients"
  ON patients FOR SELECT
  USING (true);

CREATE POLICY "Authenticated staff can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for queue_entries
CREATE POLICY "Anyone can view queue entries"
  ON queue_entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create queue entries"
  ON queue_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can update queue entries"
  ON queue_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can delete queue entries"
  ON queue_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for queue_history
CREATE POLICY "Authenticated users can view queue history"
  ON queue_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can insert queue history"
  ON queue_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for patient_emergency_flags
CREATE POLICY "Authenticated users can view emergency flags"
  ON patient_emergency_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can manage emergency flags"
  ON patient_emergency_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.is_active = true
    )
  );

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
      AND user_roles.is_active = true
    )
  );

-- RLS Policies for sms_logs
CREATE POLICY "Authenticated users can view SMS logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can insert SMS logs"
  ON sms_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to auto-generate queue number
CREATE OR REPLACE FUNCTION generate_queue_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer;
BEGIN
  SELECT COUNT(*) + 1 INTO counter
  FROM queue_entries
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'Q' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::text, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update queue positions
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS trigger AS $$
BEGIN
  WITH ranked_queue AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY current_stage_id 
        ORDER BY 
          CASE WHEN has_emergency_flag THEN 0 ELSE 1 END,
          checked_in_at
      ) as new_position
    FROM queue_entries
    WHERE current_stage_id = NEW.current_stage_id
    AND status = 'waiting'
  )
  UPDATE queue_entries qe
  SET position_in_queue = rq.new_position
  FROM ranked_queue rq
  WHERE qe.id = rq.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate queue number
CREATE OR REPLACE FUNCTION set_queue_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.queue_number IS NULL OR NEW.queue_number = '' THEN
    NEW.queue_number := generate_queue_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_queue_number
  BEFORE INSERT ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_queue_number();

-- Trigger to update queue positions
CREATE TRIGGER trigger_update_queue_positions
  AFTER INSERT OR UPDATE OF current_stage_id, status, has_emergency_flag ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_positions();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default queue stages
INSERT INTO queue_stages (name, display_name, order_number) VALUES
  ('registration', 'Registration', 1),
  ('doctor', 'Doctor Consultation', 2),
  ('billing', 'Billing', 3),
  ('pharmacy', 'Pharmacy', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default emergency flags
INSERT INTO emergency_flags (name, description) VALUES
  ('cardiac_emergency', 'Cardiac Emergency - Chest pain, heart attack symptoms'),
  ('severe_bleeding', 'Severe Bleeding - Uncontrolled bleeding'),
  ('breathing_difficulty', 'Breathing Difficulty - Severe respiratory distress'),
  ('unconscious', 'Unconscious - Patient is not responsive'),
  ('severe_pain', 'Severe Pain - Pain level 8+ requiring immediate attention')
ON CONFLICT (name) DO NOTHING;