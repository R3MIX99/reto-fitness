-- Extiende season_custom_titles para soportar títulos diferenciados por género
-- gender_mode = 'default' → un solo título para todos
-- gender_mode = 'gendered' → título distinto para hombre y mujer

ALTER TABLE season_custom_titles
  ALTER COLUMN title_text DROP NOT NULL,
  ADD COLUMN gender_mode     text NOT NULL DEFAULT 'default',
  ADD COLUMN title_text_male   text,
  ADD COLUMN title_text_female text;

ALTER TABLE season_custom_titles
  ADD CONSTRAINT sct_gender_mode_check
    CHECK (gender_mode IN ('default', 'gendered')),
  ADD CONSTRAINT sct_title_text_male_check
    CHECK (title_text_male   IS NULL OR char_length(title_text_male)   BETWEEN 3 AND 40),
  ADD CONSTRAINT sct_title_text_female_check
    CHECK (title_text_female IS NULL OR char_length(title_text_female) BETWEEN 3 AND 40);
