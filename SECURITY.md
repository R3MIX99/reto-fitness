# Reporte de Seguridad — Reto Fitness

Fecha de revisión: 2026-06-19

---

## 1. Row Level Security (RLS)

| Tabla | RLS activo | Políticas |
|-------|-----------|-----------|
| `profiles` | ✅ | SELECT: propio o compañero de grupo · UPDATE: propio · INSERT: propio |
| `groups` | ✅ | SELECT: miembro · INSERT: autenticado · UPDATE/DELETE: dueño |
| `group_members` | ✅ | SELECT: miembro del grupo · INSERT: autenticado · DELETE: propio |
| `group_settings` | ✅ | SELECT: miembro · ALL: dueño |
| `daily_checks` | ✅ | SELECT: propio o miembro en período de auditoría · INSERT/UPDATE/DELETE: propio |
| `daily_scores` | ✅ | SELECT: miembro del grupo · ALL: propio |
| `goals` | ✅ | SELECT: propio o miembro del grupo · ALL: propio |
| `weeks` | ✅ | SELECT: miembro del grupo |
| `streaks` | ✅ | SELECT: miembro del grupo |
| `audits` | ✅ | SELECT: miembro del grupo · INSERT: autenticado |
| `quotes` | ✅ | SELECT: autenticado |
| `push_subscriptions` | ✅ | ALL: propio (política duplicada — ver §4) |
| `notification_prefs` | ✅ | ALL: propio |

**Resultado:** todas las tablas públicas tienen RLS habilitado. ✅

---

## 2. Storage (buckets)

| Bucket | Visibilidad | Notas |
|--------|-------------|-------|
| `evidencias` | **Privado** ✅ | Acceso solo mediante URLs firmadas (signed URLs). Las evidencias de chequeos nunca son accesibles públicamente. |
| `avatares` | Público | Los avatares de perfil son intencionalmente públicos (similar a cualquier red social). Las fotos se comprimen a 400px antes de subirse. |

**Rate limiting en subidas:** las subidas de evidencia van a través de `useMarkCheck` (cliente) y `compressImage` (cliente). No existe un endpoint server-side con rate limiting explícito. Se recomienda implementar a nivel de Supabase Edge Function cuando el volumen justifique el costo.

---

## 3. Claves y secretos

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` — únicas claves presentes en el cliente. La `anon key` está diseñada para ser pública; la seguridad real la provee RLS.
- `SUPABASE_SERVICE_ROLE_KEY` — **nunca expuesta en el cliente ni en el repo**. Solo se usa en variables de entorno de servidor (Vercel). ✅
- `.env.local` está en `.gitignore`. ✅
- No existe ninguna clave secreta hardcodeada en el código fuente. ✅

---

## 4. Funciones SECURITY DEFINER

Las siguientes funciones se ejecutan con privilegios elevados para bypass de RLS controlado:

| Función | Propósito | Riesgo mitigado |
|---------|-----------|-----------------|
| `join_group_by_code` | Permitir unirse a un grupo leyendo `groups` sin ser miembro | Input sanitizado con `LOWER(TRIM(...))` · valida que el código exista antes de insertar |
| `recalc_day_score` | Recalcular puntos para todos los grupos del usuario | Solo modifica `daily_scores` del `p_target_id`; llamada solo desde funciones propias |
| `is_group_member` | Helper para políticas RLS | Solo lectura, sin parámetros de usuario |

---

## 5. Validación de entradas

- **Códigos de invitación:** `LOWER(TRIM(...))` en SQL; longitud mínima 4 chars en el cliente.
- **Nombres de grupo/usuario:** limitados a 40 chars en el input del cliente; el DB no tiene constraint explícito (recomendado agregar `CHECK (char_length(name) <= 60)`).
- **Archivos subidos:** se valida `accept="image/*"` en el input; compresión client-side. No se valida MIME type en el servidor — recomendado agregar validación en Storage policy.
- **SQL injection:** no aplica — se usa el cliente oficial de Supabase con queries parametrizadas en todos los casos. ✅

---

## 6. Problemas identificados y recomendaciones

| Severidad | Problema | Recomendación |
|-----------|----------|---------------|
| 🟡 Media | `push_subscriptions` tiene dos políticas `ALL` duplicadas (`mis push` y `owner access`) con la misma condición | Eliminar la duplicada para mantener la tabla limpia |
| 🟡 Media | No hay rate limiting server-side en subidas de evidencia | Implementar Edge Function middleware o Supabase Storage policy con tamaño máximo |
| 🟢 Baja | `avatares` bucket público — URLs son predecibles (`user_id/avatar.jpg`) | Aceptable para avatares; si se requiere privacidad futura, migrar a bucket privado + signed URLs |
| 🟢 Baja | Constraint de longitud de nombre solo en cliente | Agregar `CHECK (char_length(name) <= 60)` en tablas `groups` y `profiles` |
| 🟢 Baja | No se valida MIME type de imagen en servidor | Agregar política de Storage que rechace archivos > 5MB y tipos no-imagen |

---

## 7. Checklist de seguridad

- [x] Todas las tablas con RLS habilitado
- [x] Bucket de evidencias privado
- [x] No hay claves secretas en el cliente ni en el repo
- [x] `.env.local` en `.gitignore`
- [x] Queries con parámetros (no SQL injection posible)
- [x] Funciones SECURITY DEFINER con scope mínimo
- [ ] Rate limiting server-side en subidas
- [ ] Constraint de longitud en DB para nombres
- [ ] Validación de MIME type en servidor
