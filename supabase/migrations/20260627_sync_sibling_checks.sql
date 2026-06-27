-- RPC SECURITY DEFINER para actualizar filas hermanas de un check (fan-out)
-- Necesaria porque el revisor sólo tiene RLS sobre su propio grupo,
-- pero la evidencia puede existir en múltiples grupos simultáneamente.
CREATE OR REPLACE FUNCTION sync_sibling_checks(
  p_user_id   uuid,
  p_check_date date,
  p_kind      text,
  p_goal_id   uuid,   -- NULL cuando es gimnasio o cuando la meta no tiene goal_id
  p_status    text    -- 'approved' | 'rejected'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE daily_checks
  SET status = p_status
  WHERE user_id    = p_user_id
    AND check_date = p_check_date
    AND kind       = p_kind
    AND (
      (p_goal_id IS NULL AND goal_id IS NULL)
      OR goal_id = p_goal_id
    );
END;
$$;
