-- Allow anonymous patient self-serve flow to log queue history
CREATE POLICY "Anon can insert queue history"
  ON queue_history FOR INSERT
  TO anon
  WITH CHECK (true);
