-- Fix goals kind constraint to match app values (diet, goal, gym)
ALTER TABLE goals DROP CONSTRAINT goals_kind_check;
ALTER TABLE goals ADD CONSTRAINT goals_kind_check CHECK (kind = ANY (ARRAY['gym'::text, 'diet'::text, 'goal'::text]));
