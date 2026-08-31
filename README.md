# Duck Hunt — Remake

Reescritura completa del proyecto original de JavaFX como **juego web moderno**.
Mismo concepto (Duck Hunt con login, niveles y power-ups), pero ahora con game
loop real, animación de sprites, física de arcade, audio y efectos: tipos de pato,
combo con medidor, logros, clima, dificultad, tienda entre niveles, armas
desbloqueables, jefe final y tarjeta para compartir.

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

### Dificultad, clima y música

- **Dificultad** (Menú → AJUSTES): `Relax` / `Normal` / `Dura` cambia vidas,
  velocidad de los patos, ritmo de aparición, ventana de combo y puntuación.
  También se puede apagar la vibración de pantalla y el audio.
- **Clima** por nivel: viento (arrastra a los patos), lluvia (con relámpagos),
  niebla. Los niveles nocturnos tienden a tormenta.
- **Música adaptativa**: la pista de chiptune añade capas según el nivel y el
  combo, y cambia a un tema más agresivo durante el jefe (`src/audio/AudioBus.ts`).

### Tienda, armas y jefe final

- Al superar un nivel se abre la **TIENDA**: gastas monedas (ganadas mientras
  puntúas) en vida extra, cargador, recarga rápida, mira ancha o **armas**.
- **Armas** (`src/data/weapons.ts`): pistola, escopeta (5 perdigones en abanico),
  rifle (pegada fuerte, atraviesa blindados) y metralleta (cargador 12, muy
  rápida). Se desbloquean por patos cazados en total, o comprándolas en la tienda.
- **Nivel 5 = jefe**: "El Rey Pato", con barra de vida, picados y oleadas de
  minions (`src/objects/BossDuck.ts`). Derrotarlo es la victoria.

### Compartir

En la pantalla de Game Over, **COMPARTIR** genera una tarjeta PNG con tu
puntuación, nivel, puntería y mejor combo. Usa `navigator.share` en móvil o
descarga la imagen y copia el texto en escritorio.

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
├── audio/AudioBus.ts    SFX sintetizados + música chiptune adaptativa
├── data/                niveles, tipos de pato, armas, ajustes, cuentas,
│                        puntajes y logros
├── objects/             Duck (IA de vuelo + tipos), BossDuck y Dog
├── ui/                  Parallax, Weather, PixelButton, estilos DOM
└── scenes/              Boot → Auth → Menu → Scores/Achievements/Settings
                         → Game (+ Hud, + Shop) → GameOver
```

## El proyecto JavaFX original

La versión anterior en JavaFX vive en el historial de git (antes del commit del
remake). Para verla: `git log --oneline` y `git checkout <commit-anterior>`.
