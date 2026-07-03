# Publicar Olympo en Google Play (TWA)

Olympo se publica en Play Store como una **TWA** (Trusted Web Activity): un
contenedor Android nativo que abre la PWA a pantalla completa, sin barra de
navegador. No se reescribe la app; se empaqueta la web ya desplegada.

## Requisitos previos

- La PWA desplegada en HTTPS: `https://www.olympodynami.com`
- `manifest.json` válido con iconos 192 y 512 (ya está).
- Node.js instalado.
- **JDK 17** y **Android SDK** (Bubblewrap los puede instalar solo la 1ra vez).
- Cuenta de **Google Play Console** (pago único de 25 USD).

## 1. Instalar Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

## 2. Inicializar el proyecto TWA

Desde una carpeta NUEVA y vacía (fuera del repo, p. ej. `~/olympo-twa`):

```bash
bubblewrap init --manifest https://www.olympodynami.com/manifest.json
```

Responde a las preguntas (valores recomendados):

- **Package name**: `com.olympodynami.app`  ← debe coincidir con `assetlinks.json`
- **App name**: `Olympo`
- **Display mode**: `standalone`
- **Orientation**: `portrait`
- **Status bar color**: `#000000`
- **Splash screen color**: `#000000`
- Signing key: deja que **cree un keystore nuevo** (`android.keystore`).
  Guarda MUY bien la contraseña y el archivo — sin él no puedes actualizar la app.

## 3. Obtener el SHA-256 y actualizar assetlinks.json

```bash
bubblewrap fingerprint
# o directamente con keytool:
keytool -list -v -keystore android.keystore -alias android
```

Copia el **SHA256** y pégalo en
[`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json)
reemplazando `REEMPLAZAR_CON_EL_SHA256_DE_TU_KEYSTORE`. Luego commit + deploy
para que quede publicado en:

```
https://www.olympodynami.com/.well-known/assetlinks.json
```

> IMPORTANTE — Play App Signing: cuando subes el `.aab`, Google **re-firma** la
> app con su propia clave. Debes añadir TAMBIÉN ese segundo SHA-256
> (Play Console → **Configuración → Integridad de la app → Firma de apps**).
> El `assetlinks.json` debe listar **ambos** fingerprints (el de tu keystore y
> el de Google) o el TWA mostrará la barra del navegador.

## 4. Compilar el .aab

```bash
bubblewrap build
```

Genera:
- `app-release-bundle.aab`  ← esto se sube a Play Store
- `app-release-signed.apk`  ← para probar en un dispositivo real

Instalar el APK para probar:

```bash
bubblewrap install
```

## 5. Subir a Play Console

1. Crea la app en Play Console (categoría: Salud y bienestar).
2. Sube `app-release-bundle.aab` en un release (interno → producción).
3. Copia el SHA-256 de **Play App Signing** y añádelo a `assetlinks.json`
   (paso 3), redeploy.
4. Completa la ficha: descripción, capturas (mín. 2), icono 512, banner,
   política de privacidad → `https://www.olympodynami.com/privacidad`.
5. Cuestionario de contenido, público objetivo y anuncios.

## 6. Verificar que NO aparece la barra del navegador

Tras instalar, abre la app: debe verse a pantalla completa. Si aparece la barra
de URL de Chrome, el `assetlinks.json` no coincide con el fingerprint → revisa
el paso 3 (y que la app detecta modo nativo vía `isNativeApp()`).

## Actualizaciones futuras

La web se actualiza sola (es la misma PWA). Solo necesitas subir un nuevo `.aab`
si cambias el manifest, iconos, package o versión nativa:

```bash
bubblewrap update   # sincroniza con el manifest
bubblewrap build    # sube el nuevo versionCode
```
