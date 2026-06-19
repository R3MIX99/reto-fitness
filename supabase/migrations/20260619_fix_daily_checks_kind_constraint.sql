-- Fix daily_checks kind constraint to match app values (diet, goal, gym)
ALTER TABLE daily_checks DROP CONSTRAINT daily_checks_kind_check;
ALTER TABLE daily_checks ADD CONSTRAINT daily_checks_kind_check CHECK (kind = ANY (ARRAY['gym'::text, 'diet'::text, 'goal'::text]));
