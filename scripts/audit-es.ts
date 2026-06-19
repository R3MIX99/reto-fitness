#!/usr/bin/env tsx
// Auditor de acentos y eñes — Reto Fitness (PROMPT 11)
// Uso: npm run audit:es
// Falla con código 1 si encuentra problemas.

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "..");
const MESSAGES_FILE = join(ROOT, "messages", "es.json");

// Palabras sin acento que deben llevar acento
const MISSING_ACCENT: [RegExp, string][] = [
  [/\binformacion\b/gi, "información"],
  [/\bmusica\b/gi, "música"],
  [/\bpodras\b/gi, "podrás"],
  [/\baccion\b/gi, "acción"],
  [/\bsesion\b/gi, "sesión"],
  [/\barticulo\b/gi, "artículo"],
  [/\bdialogo\b/gi, "diálogo"],
  [/\bnumero\b/gi, "número"],
  [/\bultimo\b/gi, "último"],
  [/\bpagina\b/gi, "página"],
  [/\bcategoria\b/gi, "categoría"],
  [/\bpractica\b/gi, "práctica"],
  [/\benergia\b/gi, "energía"],
];

// "n" donde debe ir "ñ"
const MISSING_ENIE: [RegExp, string][] = [
  [/\bano\b/gi, "año"],
  [/\banos\b/gi, "años"],
  [/\bnino\b/gi, "niño"],
  [/\bninos\b/gi, "niños"],
  [/\bmanana\b/gi, "mañana"],
  [/\bdiseno\b/gi, "diseño"],
  [/\bpequeno\b/gi, "pequeño"],
  [/\bsueno\b/gi, "sueño"],
  [/\bcompanero\b/gi, "compañero"],
];

let errors = 0;

function check(file: string, content: string) {
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    for (const [re, suggestion] of MISSING_ACCENT) {
      if (re.test(line)) {
        console.error(`[acento] ${relative(ROOT, file)}:${lineNum} — usa "${suggestion}" → ${line.trim()}`);
        errors++;
      }
    }
    for (const [re, suggestion] of MISSING_ENIE) {
      if (re.test(line)) {
        console.error(`[eñe]   ${relative(ROOT, file)}:${lineNum} — usa "${suggestion}" → ${line.trim()}`);
        errors++;
      }
    }
  });
}

// 1. Auditar messages/es.json
try {
  const content = readFileSync(MESSAGES_FILE, "utf-8");
  check(MESSAGES_FILE, content);
} catch {
  console.error("No se encontró messages/es.json");
  errors++;
}

// 2. Detectar texto literal hardcodeado en componentes .tsx
function walkTsx(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
      walkTsx(full);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      const content = readFileSync(full, "utf-8");
      // Buscar strings literales en español fuera de es.json (heurística simple)
      const spanishLiterals = />\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñü\s,!¡¿?]{8,}</g;
      let m;
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (spanishLiterals.test(line) && !line.includes("//") && !line.includes("useTranslations")) {
          console.warn(`[hardcode] ${relative(ROOT, full)}:${i + 1} — posible texto literal: ${line.trim()}`);
        }
        spanishLiterals.lastIndex = 0;
      });
    }
  }
}

walkTsx(join(ROOT, "app"));
walkTsx(join(ROOT, "components"));

if (errors > 0) {
  console.error(`\nAuditor encontró ${errors} problema(s). Corrígelos antes de continuar.`);
  process.exit(1);
} else {
  console.log("Auditor de español: todo correcto.");
}
