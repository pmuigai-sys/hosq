/*
  Add Triage stage between Registration and Doctor Consultation.
  Shifts existing stage order numbers up to make room.
*/

-- Shift doctor (2→3), billing (3→4), pharmacy (4→5)
UPDATE queue_stages SET order_number = 5 WHERE name = 'pharmacy';
UPDATE queue_stages SET order_number = 4 WHERE name = 'billing';
UPDATE queue_stages SET order_number = 3 WHERE name = 'doctor';

-- Insert triage as stage 2
INSERT INTO queue_stages (name, display_name, order_number)
VALUES ('triage', 'Triage', 2)
ON CONFLICT (name) DO UPDATE SET order_number = 2, is_active = true;
