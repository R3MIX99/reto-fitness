# Ficha de Play Store — Olympo

Todo listo para copiar y pegar en **Play Console → Presencia en Play Store →
Ficha principal de la tienda**. Los límites de caracteres son los de Google.

---

## Nombre de la app  (máx. 30)

```
Olympo
```

## Descripción breve  (máx. 80)

```
Compite con tus amigos por cumplir tus metas de gym, dieta y hábitos diarios.
```

## Descripción completa  (máx. 4000)

```
Olympo convierte tus metas de gimnasio, dieta y hábitos en una competencia con
tus amigos. Cada día sumas puntos por cumplir; el que más suma se lleva el
título de "El más fuerte" de la semana.

POR QUÉ FUNCIONA
La motivación en grupo es lo que te hace volver. En Olympo no entrenas solo:
tus amigos ven tu progreso, tú ves el suyo, y nadie quiere ser el que rompe la
racha. La presión sana, pero divertida.

QUÉ PUEDES HACER
- Crea un grupo con tus amigos o únete con un código.
- Define tus metas diarias: gimnasio, comidas, hábitos.
- Sube evidencia de cada meta cumplida (foto, video, audio o nota).
- Gana puntos cada día y escala en la tabla de tu grupo.
- Compite en ligas y mira quién domina la temporada.

AUDITORÍA JUSTA
Al final de la semana, tu grupo revisa las evidencias. Nada de hacer trampa:
si subiste la prueba, cuentas; si no, no suma. Todo transparente y entre todos.

RACHAS Y RECOMPENSAS
Mantén días perfectos seguidos y gana bonus. Falla y pierdes puntos. Tu racha
es tu orgullo: consúltala cuando quieras y presume tu mejor marca.

TU RESUMEN
Al cerrar cada temporada recibes tu "Wrapped": tu mejor racha, tu mes más
fuerte, tus mejores momentos. Guarda tus recuerdos y tu tarjeta de jugador con
los títulos que has ganado.

PENSADA PARA EL DÍA A DÍA
Rápida, ligera y con notificaciones para que no se te pase ningún día. Modo
oscuro por defecto, diseñada para ser bonita y fácil.

Deja de entrenar en soledad. Reta a tus amigos y demuestra quién es el más
fuerte. Bienvenido a Olympo.
```

---

## Categorización

| Campo | Valor |
|-------|-------|
| **Categoría de la app** | Salud y bienestar |
| **Etiquetas** | Fitness, Hábitos, Competencia, Amigos |
| **Tipo** | Aplicación (no juego) |
| **Email de contacto** | hola@olympodynami.com |
| **Sitio web** | https://www.olympodynami.com |
| **Política de privacidad** | https://www.olympodynami.com/privacidad |

---

## Recursos gráficos (assets obligatorios)

Play Console exige estos tamaños EXACTOS. Súbelos en
**Ficha principal → Recursos gráficos**.

| Asset | Tamaño | Formato | Notas |
|-------|--------|---------|-------|
| **Icono** | 512 × 512 px | PNG 32-bit | Fondo sólido, sin transparencia. Puedes usar `public/icons/icon-512.png` si cumple. |
| **Gráfico destacado** | 1024 × 500 px | PNG/JPG | Banner superior de la ficha. Logo Olympo + tagline sobre fondo negro. |
| **Capturas de teléfono** | mín. 2, máx. 8 · 9:16 (p. ej. 1080 × 1920) | PNG/JPG | Ver lista abajo. |

### Capturas sugeridas (en orden, con texto superpuesto opcional)

1. **Dashboard** — "Tu progreso, todos los días" (pantalla de dashboard con puntos y racha).
2. **Checklist** — "Cumple tus metas y sube tu evidencia".
3. **Grupo / Leaderboard** — "Compite con tus amigos por el 1er lugar".
4. **Auditoría** — "Sin trampas: el grupo valida cada semana".
5. **Wrapped** — "Tu resumen de temporada".
6. **Tarjeta de jugador** — "Colecciona títulos y logros".

Cómo generarlas: abre la PWA en Chrome → DevTools → modo dispositivo (iPhone/
Pixel a 1080×1920) → captura cada pantalla. O toma screenshots reales desde el
teléfono con datos de ejemplo.

---

## Data safety (Seguridad de los datos)

Play Console te hará un cuestionario. Respuestas según lo que recopila Olympo:

| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopila datos? | **Sí** |
| ¿Los datos se cifran en tránsito? | **Sí** (HTTPS / Supabase) |
| ¿El usuario puede pedir que se borren? | **Sí** (`/api/user/delete` desde Perfil) |

**Tipos de datos recopilados:**
- **Información personal**: nombre, dirección de correo (para la cuenta).
- **Fotos y videos**: evidencias que el usuario sube (almacenadas en Supabase Storage).
- **Audio**: notas de voz de evidencia (opcional).
- **Actividad en la app**: metas cumplidas, puntos, interacciones con el grupo.
- **ID de dispositivo**: token de notificaciones push.

**Propósito** de todos: funcionalidad de la app. **NO** se comparten con
terceros para publicidad. **NO** se venden.

---

## Clasificación de contenido (Content rating)

Responde el cuestionario IARC. Olympo no tiene violencia, contenido sexual,
lenguaje fuerte, drogas ni apuestas → clasificación esperada: **Para todos (PEGI 3 / Everyone)**.

- ¿Contenido generado por usuarios (fotos/mensajes)? **Sí** → declara que hay
  moderación por grupo (auditoría) y opción de reportar/eliminar.

---

## Público objetivo y contenido

| Campo | Valor |
|-------|-------|
| **Grupo de edad objetivo** | 18+ (o 16+) — evita la sección "dirigida a niños" |
| **¿Dirigida a niños?** | No |
| **Anuncios** | No contiene anuncios |
| **Compras dentro de la app** | Sí, si activas suscripciones (Fase go-to-market). Si el pago va por web/Stripe y está oculto en nativo, marca **No** por ahora. |

---

## Checklist final antes de publicar

- [ ] `.aab` subido (ver `TWA-PLAYSTORE.md`).
- [ ] SHA-256 (keystore + Play App Signing) en `assetlinks.json` y desplegado.
- [ ] Icono 512, gráfico destacado 1024×500 y 2+ capturas subidos.
- [ ] Descripción breve y completa pegadas.
- [ ] Política de privacidad enlazada y accesible.
- [ ] Data safety y content rating completados.
- [ ] Release en **prueba interna** primero → instalar y verificar que abre a
      pantalla completa (sin barra de Chrome).
- [ ] Promover a **producción**.
```
