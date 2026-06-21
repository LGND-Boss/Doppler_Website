INSERT INTO seats (label, zone) VALUES
  ('Table 1', 'Floor Hall'),
  ('Table 2', 'Floor Hall'),
  ('Window Bar 1', 'Espresso Bar'),
  ('Lounge 1', 'Lounge')
ON CONFLICT DO NOTHING;
