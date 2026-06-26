-- Fix: ciclo infinito en RLS entre group_leagues y league_participants.
--
-- El ciclo era:
--   league_select (group_leagues) → consulta league_participants
--   lp_select (league_participants) → consulta group_leagues  ← ciclo
--
-- Fix: lp_select ya no referencia group_leagues.
-- Usa invited_by = auth.uid() para que el creador de la liga vea sus invitaciones.

DROP POLICY IF EXISTS "lp_select" ON league_participants;

CREATE POLICY "lp_select" ON league_participants
  FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    OR invited_by = auth.uid()
  );
