-- Unique constraint for upsert on daily_scores
ALTER TABLE daily_scores ADD CONSTRAINT daily_scores_user_group_date_key
  UNIQUE (user_id, group_id, score_date);

-- RLS: owner can manage their own scores
CREATE POLICY "gestionar mis puntajes" ON daily_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Server-side function to recalculate a day's score
-- Called after every check upload and after every audit decision
CREATE OR REPLACE FUNCTION recalc_day_score(p_user_id uuid, p_group_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_pts    int := 0;
  v_diet_done  int := 0;
  v_diet_total int := 0;
  v_goal_done  int := 0;
  v_goal_total int := 0;
  v_diet_pts   int := 0;
  v_goal_pts   int := 0;
  v_base       int;
BEGIN
  SELECT LEAST(COUNT(*), 1) * 3 INTO v_gym_pts
  FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'gym' AND status <> 'rejected';

  SELECT COUNT(*) INTO v_diet_total FROM goals
  WHERE user_id = p_user_id AND kind = 'diet' AND active = true;

  SELECT COUNT(*) INTO v_diet_done FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'diet' AND status <> 'rejected';

  IF v_diet_total > 0 THEN
    v_diet_pts := FLOOR((v_diet_done::float / v_diet_total) * 5);
  END IF;

  SELECT COUNT(*) INTO v_goal_total FROM goals
  WHERE user_id = p_user_id AND kind = 'goal' AND active = true;

  SELECT COUNT(*) INTO v_goal_done FROM daily_checks
  WHERE user_id = p_user_id AND group_id = p_group_id
    AND check_date = p_date AND kind = 'goal' AND status <> 'rejected';

  IF v_goal_total > 0 THEN
    v_goal_pts := FLOOR((v_goal_done::float / v_goal_total) * 5);
  END IF;

  v_base := v_gym_pts + v_diet_pts + v_goal_pts;

  INSERT INTO daily_scores (user_id, group_id, score_date, base_points, bonus_points, penalty_points, total_points)
  VALUES (p_user_id, p_group_id, p_date, v_base, 0, 0, v_base)
  ON CONFLICT (user_id, group_id, score_date)
  DO UPDATE SET
    base_points  = v_base,
    total_points = v_base + daily_scores.bonus_points - daily_scores.penalty_points;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_day_score(uuid, uuid, date) TO authenticated;
