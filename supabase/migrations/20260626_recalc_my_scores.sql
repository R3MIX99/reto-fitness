-- Recalcula los puntajes del usuario (auth.uid()) en todos los días con
-- registro dentro del rango, para todos sus grupos. Se usa al crear/borrar
-- metas, ya que cambia el denominador proporcional (dieta/metas) y por tanto
-- los puntos de esos días deben recalcularse y propagarse a las tablas.
CREATE OR REPLACE FUNCTION recalc_my_scores(p_from date DEFAULT '2000-01-01', p_to date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT dc.group_id, dc.check_date
    FROM daily_checks dc
    JOIN group_members gm
      ON gm.group_id = dc.group_id AND gm.user_id = auth.uid()
    WHERE dc.user_id = auth.uid()
      AND dc.check_date BETWEEN p_from AND p_to
    GROUP BY dc.group_id, dc.check_date
  LOOP
    PERFORM recalc_day_score(auth.uid(), r.group_id, r.check_date);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION recalc_my_scores(date, date) TO authenticated;
