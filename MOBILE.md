# Salpicón en móvil y tiendas de apps

El juego ya funciona en el navegador del celular y como **PWA instalable**:

- Escala 16:9 con `Scale.FIT` (se adapta a cualquier pantalla).
- Controles táctiles en pantalla (recargar, power-ups, cocodrilo, pausa) que
  aparecen solos en dispositivos táctiles. Se apunta y dispara tocando.
- `public/manifest.webmanifest` + `public/sw.js` → instalable y jugable sin conexión.
- Aviso "gira el dispositivo" en vertical (el juego es horizontal).

## Probar en el iPhone (sin tienda)

1. `npm run build` y sube `dist/` a cualquier hosting con HTTPS
   (Vercel, Netlify, GitHub Pages…). El service worker **exige HTTPS**.
2. Abre la URL en Safari → Compartir → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa, sin barra del navegador, y funciona offline.

## Publicar en Google Play (Android)

Usa **Bubblewrap** (TWA) o **PWABuilder**:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://TU-DOMINIO/manifest.webmanifest
bubblewrap build          # genera el .aab firmado para Play Console
```

PWABuilder (https://www.pwabuilder.com) hace lo mismo desde el navegador y
además **genera el juego de iconos PNG** (192/512/maskable) a partir de
`icon.svg`; súbelos a `public/` y referéncialos en el manifest si Play los pide.

## Publicar en la App Store (iOS)

Apple no acepta PWAs puras. Envuelve el sitio con **Capacitor**:

```bash
npm i @capacitor/core @capacitor/ios
npx cap init "Salpicón" com.salpicon.app --web-dir=dist
npx cap add ios
npm run build && npx cap sync
npx cap open ios        # se abre Xcode: firmar, icono, y subir a App Store Connect
```

En Xcode: pon el icono (1024×1024 desde `icon.svg`), fija orientación solo
horizontal, y `WKWebView` a pantalla completa. El mismo proyecto Capacitor
sirve también para Play Store si prefieres no usar Bubblewrap.

## Notas

- Todo el arte y el audio son procedurales: no hay que empaquetar assets.
- Los pagos "premium" son una **demostración**: no hay cobro real ni SDK de
  pagos. Si algún día se cobra de verdad hay que integrar la facturación de
  cada tienda (Google Play Billing / StoreKit) y quitar el aviso de
  `src/data/premium.ts`.
