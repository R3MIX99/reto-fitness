-- season_custom_titles: título personalizado para el #1 por temporada (Elite)
-- Una fila por temporada; inmutable una vez que la temporada finaliza (RLS lo garantiza).

CREATE TABLE IF NOT EXISTS season_custom_titles (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id   uuid        REFERENCES seasons(id) ON DELETE CASCADE NOT NULL UNIQUE,
  title_text  text        NOT NULL CHECK (char_length(title_text) BETWEEN 3 AND 40),
  title_style text        NOT NULL DEFAULT 'gold'
              CHECK (title_style IN ('gold', 'fire', 'crystal', 'shadow', 'neon')),
  created_by  uuid        REFERENCES auth.users(id) NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE season_custom_titles ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquiera puede ver el título personalizado
CREATE POLICY "custom_titles_read"
  ON season_custom_titles FOR SELECT
  USING (true);

-- INSERT: solo el dueño del grupo, solo mientras la temporada no ha cerrado
CREATE POLICY "custom_titles_insert"
  ON season_custom_titles FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM seasons s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = season_id
        AND g.owner_id = auth.uid()
        AND s.status IN ('scheduled', 'active')
    )
  );

-- UPDATE: mismas condiciones que INSERT
CREATE POLICY "custom_titles_update"
  ON season_custom_titles FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM seasons s
      JOIN groups g ON g.id = s.group_id
      WHERE s.id = season_id
        AND g.owner_id = auth.uid()
        AND s.status IN ('scheduled', 'active')
    )
  );

-- Índice para búsquedas por temporada
CREATE INDEX IF NOT EXISTS idx_season_custom_titles_season
  ON season_custom_titles (season_id);
