# FUNCTIONALITY_MAP.md — Midnight Desire Redesign

Every function below was verified by reading `assets/js/game.js`. Line numbers refer to
that file. Nothing here is assumed.

---

## 1. Gameplay flow

```
page load
  └─ window load
       ├─ initInputListeners()          (game.js:656)
       └─ checkSavedGame()              (game.js:2982)
            ├─ ageConsented?  no → return (consent screen stays)
            └─ yes → validateSaveData → #resume-banner (Lanjutkan / Mulai Baru)

#age-consent-screen
  #consent-agree onchange → updateAgeConfirmBtn()   (310)
  #btn-age-confirm onclick → confirmAge()           (319)
       └─ sets ageConsented, hides consent, shows #name-screen

#name-screen
  #name0 / #name1 input  → initInputListeners() validates & enables start
  .pion-option click     → selects token (initPionPickers, 629)
  .mood-btn click        → selectMood(mood)         (345)
       └─ sets currentMood, toggles .active, updates #mood-badge-bar later
  .btn-start click       → startGame()              (571)
       ├─ resetGameState()      (526) clears pos/turn/stats/streaks/log
       ├─ reads PLAYERS names + chosen pions
       ├─ initCellTypes()       (616) randomises cell types per game
       ├─ buildBoard()          (680) paints 100 cells
       ├─ drawSnakesLadders()   (735) paints #board-overlay SVG
       ├─ initPions()           (1025) creates #pion-layer tokens
       ├─ startDurationTimer()  (359)
       ├─ hides #name-screen, adds body.no-scroll
       └─ updateUI()

#gameplay  (phase='roll')
  #btn-roll / #dice-wrap → rollDice()                (1280)
       ├─ guards: rolling / phase!=='roll' / pending TOD
       ├─ 420 ms (patch) roll animation → renderDice (1312)
       ├─ animateSteps(player, from, to, callback)   (1093)
       │     └─ land() → positionPions() (1060)
       ├─ SNAKES[n] ?  → animateSnakeLadder()        (1135)
       │               → pos = SNAKES[n]
       └─ CELL_TYPE[n] ? → showTOD/showJokerCell/showDuoChallenge/showWildChoice
                          else resolveAfterTOD()     (1845)

  #tod-overlay
    #btn-done   → todDone()      (1833) → todDoneInternal(true)  (1840)
    .btn-skip   → todDone(false) → penalty −3 (max 2 skips)
    #btn-joker  → useJoker()     (1816)
    #btn-partner-refuse (patch) → partnerRefuseDare()
    #btn-timer-start → manualStartTimer()  (1423)
    #btn-timer-skip  → manualSkipTimer()   (1436)
    timer expiry → todDoneInternal(true)
    └─ resolveAfterTOD(done, wasSkip)  (1845)
         ├─ stats update, streak, joker token award every 3 dare-streak
         ├─ skip penalty, freeSkip exception
         ├─ bonus turn on dice 6
         └─ nextTurn()                    (1961) → updateUI() → phase='roll'

  pos === 100 → endGame()  (1969)
       └─ clears save, shows #winner-overlay after 500 ms
            #winner-name, #winner-stats-body
            showRecap() · confirmReset() · goToMoodScreen()

#stats-overlay  ← .btn-stats → showStats() (2134)
                  stats body via buildStatsHTML() (2090)
#recap-overlay  ← showRecap() (2154) draws canvas#recap-canvas 360×640
                  downloadRecap() (2159)
#winner-overlay → confirmReset() (2027) → resetGameState + new game
                → goToMoodScreen()   (1985) → back to #name-screen
```

---

## 2. Function inventory (read-only engine, by responsibility)

### Bootstrap / chrome
| Function | Line | Notes |
|---|---|---|
| `getCtx` | 5 | AudioContext lazy init |
| `vib` | 11 | `navigator.vibrate` guard |
| `toggleMute` | 15 | 🔊 button |
| `sfx` | 23 | WebAudio blips |
| `updateAgeConfirmBtn` | 310 | enable/disable consent confirm |
| `confirmAge` | 319 | `ageConsented = true`; **client-side only** |
| `selectMood` | 345 | sets `currentMood`; no content change |
| `spawnHearts` | 663 | decorative |
| `showStreakToast` | 2673 | streak banner |

### Duration clock
| Function | Line | Notes |
|---|---|---|
| `startDurationTimer` / `stopDurationTimer` / `resetDurationTimer` | 359 / 371 / 378 | 1 s interval |
| `updateDurationDisplay` / `formatDuration` | 387 / 395 | `mm:ss` |

### Screen transitions
| Function | Line | Notes |
|---|---|---|
| `flipCard` / `flipContent` | 405 / 417 | TOD card flip |
| `transitionTo` | 478 | `screen-exit` → `screen-enter` |
| `resetGameState` | 526 | wrapped by patch |
| `startGame` | 571 | main entry |
| `goToMoodScreen` / `confirmReset` | 1985 / 2027 | restart paths |

### Board
| Function | Line | Notes |
|---|---|---|
| `initCellTypes` | 616 | randomises `CELL_TYPE` |
| `initPionPickers` | 629 | setup screen tokens |
| `buildBoard` | 680 | boustrophedon 10×10 |
| `cellCenter` | 718 | → `{x,y}` in 0–100 board units |
| `bezierPt` | 727 | snake curve sampling |
| `drawSnakesLadders` | 735 | writes `#board-overlay.innerHTML` |
| `makeLadder` / `makeSnake` | 758 / 903 | **literal colour strings** |
| `squareToPercent` | 1015 | exact inverse of `buildBoard` |
| `initPions` / `movePionTo` / `positionPions` | 1025 / 1042 / 1060 | token placement |
| `pulseCell` | 1084 | cell flash |
| `animateSteps` | 1093 | per-step transform; patch overrides |
| `animateSnakeLadder` | 1135 | slide along snake/ladder |

### Turns, dice, TOD
| Function | Line | Notes |
|---|---|---|
| `updateUI` | 1225 | wrapped by patch |
| `rollDice` | 1280 | RNG untouched |
| `renderDice` | 1312 | SVG face, literal `#1C1636` |
| `startTimer` / `showTimerIdle` / `manualStartTimer` / `manualSkipTimer` / `stopTimer` | 1355 / 1404 / 1423 / 1436 / 1441 | TOD timer |
| `parseDurationFromText` | 1333 | reads raw text, returns −1/null/seconds |
| `getLevel` / `getAdaptiveLevel` / `getPool` | 1463 / 1473 / 1506 | mode pools |
| `setLevelUI` | 1512 | wrapped by patch |
| `showTOD` | 1537 | sets `#tod-card` inline border + shadow |
| `showJokerCell` / `showDuoChallenge` / `showWildChoice` / `resolveWild` | 1599 / 1621 / 1653 / 1686 | special cells |
| `renderChallenge` | 1696 | rewrites `#tod-body.innerHTML` |
| `renderTodChallenge` | 452 | **text nodes only** — do not re-escape |
| `useJoker` / `useJokerFromPanel` | 1816 / 1826 | |
| `todDone` / `todDoneInternal` / `resolveAfterTOD` | 1833 / 1840 / 1845 | scoring |
| `nextTurn` | 1961 | turn switch |
| `endGame` | 1969 | winner overlay |
| `showBeraniChallenge` | 2498 | uses Spicy `berani` pool |

### Stats / recap / logs
| Function | Line |
|---|---|
| `updateStatsMini` | 2049 |
| `getAchievements` | 2056 |
| `buildStatsHTML` / `showStats` | 2090 / 2134 |
| `addLog` | 2139 |
| `showRecap` / `downloadRecap` / `buildRecapCanvas` | 2154 / 2159 / 2168 |
| `getPlayerSVG` | 2395 |

### Persistence
| Function | Line | Notes |
|---|---|---|
| `saveGame` / `loadGame` | 2928 / 2950 | `tod_game_save_v2` |
| `validateSaveData` | 2820 | pos 1–100, turn 0–1, items ≤15 |
| `checkSavedGame` / `resumeGame` / `dismissSave` | 2982 / 3027 / 3074 | resume banner |

### Static text fixups
| Function | Line |
|---|---|
| `showRules` / `hideRules` | 2919 / 2923 |
| `fixStaticText` (patch) | patch js |

---

## 3. Event listeners (declarative in `index.html`)

All handlers are `onclick` / `onchange` / `onkeydown` attributes — no
`addEventListener` in the markup. This means **the redesign must not remove or rename
these attributes**.

| Element | Event | Handler |
|---|---|---|
| `#consent-agree` | change | `updateAgeConfirmBtn()` |
| `#btn-age-confirm` | click | `confirmAge()` |
| rules button | click | `showRules()` |
| `.mood-btn` ×3 | click | `selectMood('romantis'\|'playful'\|'liar')` |
| `.btn-start` | click | `startGame()` |
| custom button | click | `showCustomOverlay()` |
| `#dice-wrap` | click | `rollDice()` |
| `#dice-wrap` | keydown Enter/Space | `rollDice()` |
| `#btn-roll` | click | `rollDice()` |
| `#btn-stats` | click | `showStats()` |
| `#btn-music` | click | `toggleMusic()` |
| `#btn-mute` | click | `toggleMute()` |
| `#btn-theme` | click | `toggleTheme()` (patch) |
| `.btn-reset` | click | `goToMoodScreen()` |
| `.joker-token` | click | `useJokerFromPanel(N)` |
| `#skip-tod-btn-N` | click | `useSkipTod(N)` |
| `#btn-timer-start` / `#btn-timer-skip` | click | `manualStartTimer()` / `manualSkipTimer()` |
| `#btn-joker` | click | `useJoker()` |
| modal close / winner / recap buttons | click | various |

JS-added listeners: `#name0/#name1` input (initInputListeners), pion options
(initPionPickers), `#tod-overlay` buttons added by `renderChallenge`.

---

## 4. DOM contract (IDs consumed by JS — must survive)

`#age-consent-screen`, `#age-confirm`, `#consent-agree`, `#btn-age-confirm`,
`#name-screen`, `#name0`, `#name1`, `#pions0`, `#pions1`, `#mood-romantis`,
`#mood-playful`, `#mood-liar`, `#custom-count-label`, `#mood-badge-bar`,
`#pcard-0/-1`, `#pname-0/-1`, `#picon-0/-1`, `#pname-text-0/-1`, `#heat-badge-0/-1`,
`#ppos-0/-1`, `#pturn-0/-1`, `#pstat-mini-0/-1`, `#streak-0/-1`, `#joker-0/-1`,
`#skip-tod-btn-0/-1`, `#board`, `#board-overlay`, `#pion-layer`, `#dice-wrap`,
`#btn-roll`, `#game-log`, `#game-duration`, `#duration-display`, `#btn-music`,
`#btn-mute`, `#btn-theme`, `#stats-overlay`, `#stats-body`, `#tod-overlay`,
`#tod-card`, `#tod-badge`, `#tod-sq`, `#level-label`, `#lpip-0..2`, `#tod-timer`,
`#timer-ring`, `#timer-text`, `#timer-level-hint`, `#btn-timer-start`,
`#btn-timer-skip`, `#tod-body`, `#btn-joker`, `#skip-warning`, `#winner-overlay`,
`#winner-name`, `#winner-stats-body`, `#recap-overlay`, `#recap-canvas`,
`#rules-overlay`, `#custom-overlay`, `#custom-input`, `#custom-input-error`,
`#custom-list`, `#ctab-truth`, `#ctab-dare`, `#confetti-canvas`, `#heat-overlay`,
`#streak-toast`.

Classes consumed by JS: `.cell`, `.cell-num`, `.cell-pulse`, `.pion`,
`.tod-card`, `.tod-type-pill`, `.tod-challenge`, `.tod-action-btns`, `.btn-done`,
`.btn-skip`, `.pill-truth`, `.pill-dare`, `.pill-berani`, `.level-pip`,
`.screen-enter`, `.screen-exit`, `.no-scroll`, `.flipping`, `.content-flip`,
`.rolling`, `.visible`, `.timer-urgent`, `.active-mild/medium/hot`,
`.mood-btn.romantis/playful/liar.active`, `.pion-option.selected-0/1`.

---

## 5. Verified invariants

- `SNAKES` / `LADDERS` objects: byte-identical mapping, never mutated.
- `buildBoard` / `squareToPercent`: exact inverses, never rewritten.
- Challenge pools: read-only files; no fourth mode.
- `renderTodChallenge`: appends text nodes; escaping happens once at the
  `renderChallenge` boundary.
- `parseDurationFromText`: reads raw challenge text before display rewrites, so any
  cosmetic text change in the patch must not alter the parsed number.
- RNG (`Math.random()` in `rollDice`) and turn order untouched.
- Save validation ranges enforced.
