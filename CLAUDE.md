# Reto Fitness — Documentación para Claude Code

## Resumen del producto
PWA mobile-first de competencia entre amigos para cumplir metas de gimnasio, dieta y metas diarias. El que más puntúa gana "El más fuerte" de la semana.

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** con tokens de diseño personalizados
- **shadcn/ui** para componentes accesibles
- **Supabase** — Postgres + Auth Google + Storage + Realtime
- **TanStack Query** para caché y sincronización con Supabase
- **next-intl** — i18n (español ahora, inglés después)
- **Lucide** — iconografía (nunca emojis)

## Estructura de carpetas

```
reto-fitness/
├── app/
│   ├── fonts/            # .woff2 (Clash Grotesk + Satoshi)
│   ├── (auth)/           # Rutas públicas (login)
│   │   └── login/
│   ├── (app)/            # Rutas privadas (requieren sesión)
│   │   ├── layout.tsx    # Header + BottomNav + top-glow
│   │   ├── dashboard/
│   │   ├── checklist/
│   │   ├── grupo/
│   │   └── perfil/
│   ├── api/
│   │   └── auth/callback/ # Callback OAuth de Supabase
│   ├── layout.tsx        # Root layout con fuentes
│   └── globals.css       # Tokens CSS + utilidades
├── components/
│   ├── ui/               # Componentes base (Card, Chip, PillButton…)
│   └── layout/           # Header, BottomNav
├── i18n/
│   └── request.ts        # Configuración de next-intl
├── lib/
│   ├── utils.ts          # cn() helper
│   └── supabase/         # Clientes browser/server (PROMPT 1)
├── messages/
│   └── es.json           # TODA la copia de la app (nunca hardcodear texto)
├── scripts/
│   └── audit-es.ts       # Auditor de acentos/eñes (PROMPT 11)
├── types/
│   └── database.ts       # Tipos generados de Supabase
└── middleware.ts          # Protección de rutas
```

## Convenciones

### Texto e i18n
- **Cero texto hardcodeado** en componentes `.tsx`. Todo va en `messages/es.json`.
- Español de Latinoamérica con acentos y eñes correctos.
- Usar `useTranslations()` de `next-intl` en componentes de cliente; `getTranslations()` en servidor.

### Diseño visual
- **Dark-first**: fondo `#000000`, cards `#101010`–`#141414`.
- **Cero emojis**: solo íconos de Lucide (strokeWidth ~1.5).
- Tokens de color: `--color-bg`, `--color-bg-card`, `--color-fg`, `--color-muted`, `--color-accent` (`#CF5C36`), `--color-warm` (`#EFC88B`), `--color-bone` (`#EEE5E9`).
- Fuentes: `font-display` = Clash Grotesk (headers, números), `font-body` = Satoshi (texto, etiquetas).
- Cards: `rounded-[18px]` o `rounded-[24px]`, padding generoso, sin bordes duros.
- Bottom nav: pill flotante, íconos grises, activo en arena + elevación + punto dorado debajo.

### Paleta exacta
| Token | Hex | Uso |
|-------|-----|-----|
| bg | `#000000` | Fondo principal (oscuro) |
| bg-card | `#101010` | Cards, inputs |
| fg | `#EEE5E9` | Texto principal |
| muted | `#7C7C7C` | Texto secundario |
| accent | `#CF5C36` | Terracota — botón principal, racha, alertas |
| warm | `#EFC88B` | Arena/dorado — bonus, posición 1ero, activo |
| bone | `#EEE5E9` | Hueso — igual que fg |

### Componentes reutilizables (en `components/ui/`)
Crear con estas convenciones:
- `Card` — contenedor redondeado con bg-card
- `Chip` — etiqueta tipo píldora (rounded-full)
- `PillButton` — botón redondeado (principal en accent, secundario oscuro)
- `ProgressRing` — anillo circular de progreso SVG
- `StreakFlame` — ícono de llama + número de días
- `PlayerRow` — fila de ranking sin fondo (border-bottom 0.5px)
- `AvatarStack` — avatares apilados con overlap

### Supabase
- Cliente del **navegador**: `lib/supabase/client.ts` (usa `@supabase/ssr`)
- Cliente del **servidor**: `lib/supabase/server.ts` (usa cookies)
- **Nunca** usar `service_role key` en el cliente.
- Tipos: `types/database.ts` (regenerar con `supabase gen types typescript`).
- RLS habilitado en todas las tablas — respetar siempre.

### Sistema de puntos
- **Hasta 13 pts base/día**, según el motor `recalc_day_score`
  (`supabase/migrations/20260619_recalc_day_score.sql`):
  - **Gimnasio:** 3 pts (todo o nada — `LEAST(count,1)*3`)
  - **Dieta:** hasta 5 pts, **proporcional** al avance → `FLOOR(done/total*5)`
  - **Metas diarias:** hasta 5 pts, **proporcional** → `FLOOR(done/total*5)`
- Como dieta y metas son proporcionales, los puntos NO mapean 1:1 con cada check
  (ej. 2 de 4 comidas = `FLOOR(2/4*5)` = 2 pts). La UI debe explicar esto.
- Cada check **requiere foto de evidencia** (sin foto no cuenta)
- Puntos **provisionales** durante la semana → **validados** tras auditoría del domingo
- Rachas: 3 días perfectos = +3 pts bonus; 3 días fallando = -3 pts penalización
- El total y bonus/penalización viven en `daily_scores` (por usuario, grupo y fecha)

### Mockups de referencia (fuente de verdad del diseño)
- `project-assets/mockups/dashboard.html`
- `project-assets/mockups/checklist.html`
- `project-assets/mockups/grupo.html`
- `project-assets/mockups/perfil.html`
- `project-assets/mockups/boton-mas.html`
- `project-assets/mockups/auditoria.html`

Antes de construir cada pantalla: abrir su mockup y reproducirlo fielmente.

## Roadmap de prompts
1. ✅ PROMPT 0 — Esqueleto del proyecto (este archivo)
2. ⏳ PROMPT 0.5 — Setup Supabase + GitHub con MCPs
3. ⏳ PROMPT 1 — Conexión con Supabase y tipos
4. ⏳ PROMPT 2 — Auth con Google
5. ⏳ PROMPT 3 — Sistema de diseño, PWA, tema claro/oscuro
6. ⏳ PROMPT 4 — Grupos: crear y unirse
7. ⏳ PROMPT 5 — Pestaña Checklist
8. ⏳ PROMPT 6 — Botón "+" (subida rápida)
9. ⏳ PROMPT 7 — Puntos, rachas y Dashboard
10. ⏳ PROMPT 8 — Cierre semanal y auditoría
11. ⏳ PROMPT 9 — Notificaciones push
12. ⏳ PROMPT 10 — Perfil y seguridad
13. ⏳ PROMPT 11 — Auditor de acentos/eñes
14. ⏳ PROMPT 12 — Deploy en Vercel
