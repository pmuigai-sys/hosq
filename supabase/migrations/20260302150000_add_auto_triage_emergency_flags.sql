-- Add additional emergency flags used by rule-based auto-triage.
-- Existing records are preserved via ON CONFLICT.

INSERT INTO emergency_flags (name, description) VALUES
  ('stroke_symptoms', 'Possible stroke symptoms - sudden weakness, slurred speech, facial droop'),
  ('seizure_active', 'Seizure/convulsions - active or recurrent fits'),
  ('obstetric_emergency', 'Pregnancy emergency - heavy bleeding, severe abdominal pain, labor danger signs'),
  ('anaphylaxis', 'Severe allergic reaction - swelling, breathing difficulty, shock'),
  ('poisoning_overdose', 'Poisoning or overdose - chemical/drug ingestion, toxic exposure'),
  ('major_trauma', 'Major trauma - road traffic accident, deep wounds, fractures, head injury'),
  ('severe_dehydration', 'Severe dehydration - persistent vomiting/diarrhea with weakness or confusion'),
  ('high_fever_risk', 'Dangerous fever pattern - very high fever, especially in infants/elderly'),
  ('diabetic_emergency', 'Dangerous glucose symptoms - confusion, collapse, suspected DKA/hypoglycemia'),
  ('hypertensive_crisis', 'Very high blood pressure symptoms - severe headache, chest pain, neurologic signs')
ON CONFLICT (name) DO NOTHING;
