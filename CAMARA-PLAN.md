# Plan: módulo de cámara integrada

## Problema
Hoy la foto de evidencia se toma con `<input type="file" capture="environment">`.
Eso abre la app de cámara del sistema y manda la PWA a segundo plano. En
teléfonos con poca memoria Android mata la PWA mientras la cámara está abierta,
y al volver "se trabó" o no pasó nada (ya hay un parche: `consumeCaptureIntent`).

## Solución
Cámara dentro de la propia app con `navigator.mediaDevices.getUserMedia`.
El usuario nunca sale de la PWA, así que no hay reinicio ni foto perdida.

Nota: en una PWA no existe una cámara "nativa" de verdad; esta es la opción
equivalente. Cuando se haga la Fase 10 (Capacitor/iOS) el mismo contrato
`openCamera(): Promise<File | null>` se puede respaldar con el plugin nativo
sin tocar los puntos de uso.

## Diseño
- `lib/camera/CameraProvider.tsx` — provider + hook `useCamera()` con
  `openCamera(): Promise<File | null>` (null si el usuario cancela).
- `components/camera/CameraView.tsx` — pantalla completa: visor, disparador,
  cambiar cámara frontal/trasera, linterna (si el dispositivo la soporta),
  cerrar. Íconos Lucide, sin emojis.
- Captura: se dibuja el frame del video en un canvas a máx. 1080 px (lado
  largo) y se exporta JPEG 0.85. Se marca como ya comprimido para que
  `compressImage` no vuelva a decodificarlo.
- Ciclo de vida: se detienen los tracks al cerrar, al desmontar y cuando la
  app pasa a segundo plano.
- Fallback: si no hay `getUserMedia`, se niega el permiso o no hay cámara,
  se usa el input de archivo anterior (comportamiento actual), así nunca
  se bloquea la subida de evidencia.
- Montado una vez en `app/(app)/layout.tsx`. Se renderiza en un portal sobre
  los drawers (vaul) sin cerrarlos.

## Puntos de uso a migrar (todos reciben un `File`)
1. `components/checklist/PhotoSourceDrawer.tsx` (opción "Tomar foto")
2. `components/checklist/CheckItem.tsx`
3. `components/checklist/CheckSection.tsx`
4. `components/checklist/CompleteGoalDrawer.tsx` (foto / antes-después)
5. `components/ui/EvidenciaSheet.tsx`

Fuera de alcance: video (`capture` con `video/*`) y avatar (elige de galería).

## Verificación
- `npx tsc --noEmit` y `next build` sin errores.
- Probar en el navegador con cámara falsa de Chrome
  (`--use-fake-device-for-media-stream`): abrir, capturar, cancelar, cambiar
  cámara, permiso denegado → fallback.
- Probar en teléfono real tras el deploy: Android Chrome y PWA instalada.
