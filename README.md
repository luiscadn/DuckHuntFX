# Duck Hunt — Remake 2.0

Reescritura completa del proyecto original de JavaFX como **juego web moderno**.
Mismo concepto (Duck Hunt con login, niveles y power-ups), pero ahora con game
loop real, animación de sprites, física de arcade, audio y efectos.

## Stack

| Pieza | Qué es |
|---|---|
| **[Phaser 3](https://phaser.io)** | Motor de juego 2D: escenas, sprites, animación, input, cámara, tweens. |
| **TypeScript** | Todo el código tipado. |
| **Vite** | Dev server con hot-reload y build de producción. |

**Sin archivos de assets.** Todo el arte (pato, perro, mira, escenario, HUD,
iconos) se dibuja por código a baja resolución y se registra como textura pixel-art
en el arranque (`src/art/`). Todo el audio se sintetiza con la Web Audio API
(`src/audio/AudioBus.ts`). Esto mantiene el estilo 100% cohesivo y el repo liviano.

## Cómo correrlo

```bash
cd duck-hunt
npm install
npm run dev      # http://localhost:5173
```

Build de producción (carpeta `dist/`, lista para GitHub Pages, itch.io o Vercel):

```bash
npm run build
npm run preview  # sirve el build local para revisarlo
```

## Cómo se juega

- **Mouse** para apuntar, **click** para disparar.
- Tienes un **cargador por pato**: si se te acaba y el pato escapa, pierdes una vida.
- **R** recarga · **P / ESC** pausa · **M** (en pausa) vuelve al menú.
- **1 / 2 / 3** activan power-ups, que se desbloquean por nivel:
  - Nivel 2 → **Doble** (puntos x2 unos segundos)
  - Nivel 3 → **Freeze** (los patos casi se detienen)
  - Nivel 4 → **Bomba** (embolsa todos los patos en pantalla)
- 5 niveles (amanecer → mediodía → atardecer → ocaso → noche). Al superarlos todos: victoria.

### Tipos de pato

| Tipo | Rasgos |
|---|---|
| Normal | El pato base. |
| Rápido (azul) | Pequeño y errático, más puntos. |
| Blindado (gris) | Aguanta 2 disparos. |
| Dorado | Raro. Vale x10 y activa cámara lenta al cazarlo. |
| Bomba (rojo) | Al dispararle revienta a los patos cercanos; si escapa, quita 2 vidas. |

### Combo y logros

- Aciertos seguidos suben el **multiplicador** hasta x4. El **medidor de combo se
  vacía con el tiempo**: hay que seguir cazando para no perderlo (y la ventana se
  acorta a multiplicadores altos).
- **15 logros** (`src/data/achievements.ts`) que se guardan en `localStorage` y se
  ven desde el menú → **LOGROS**. Se notifican con un aviso durante la partida.

## Cuentas y puntajes

`login` / `registro` y la tabla de puntajes se guardan en `localStorage`
(`src/data/`). Las contraseñas se guardan con hash + salt — suficiente para un
juego local, **no** es seguridad real. Hay opción de "entrar como invitado".

## Estructura

```
src/
├── main.ts              config de Phaser + lista de escenas
├── constants.ts         dimensiones, reglas de juego, claves
├── art/                 paleta única + generador de texturas procedurales
├── audio/AudioBus.ts    sintetizador de SFX y música chiptune
├── data/                niveles, tipos de pato, cuentas, puntajes y logros
├── objects/             Duck (IA de vuelo + tipos) y Dog
├── ui/                  Parallax (fondo por capas), PixelButton, estilos DOM
└── scenes/              Boot → Auth → Menu → Scores/Achievements → Game (+ Hud) → GameOver
```

## El proyecto JavaFX original

La versión anterior en JavaFX vive en el historial de git (antes del commit del
remake). Para verla: `git log --oneline` y `git checkout <commit-anterior>`.
