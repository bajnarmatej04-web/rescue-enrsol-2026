# Rescue – architecture notes

This document explains how Rescue is built, for anyone who continues developing it.

## Guiding ideas

- **Simple over clever.** Plain HTML, CSS and JavaScript, no dependencies, no build step.
- **Opens by double-click.** Ordinary `<script>` tags (not ES modules) and data stored in `.js` files (not `.json`), because browsers block modules and `fetch()` on pages opened from a folder (`file://`).
- **One source of truth.** The running game is one object (the game state). Everything on screen is drawn from it.
- **Logic separate from screens.** `quiz.js` and `game.js` never touch the page, so they can be tested in `tests.html`.

## How the files depend on each other

Scripts are loaded in this order (see the bottom of `index.html`). Each file creates one global object and uses only the ones loaded before it, plus `App`, which screens call to switch screens.

| Order | File | Global object | Uses |
| --- | --- | --- | --- |
| 1 | `lang/cs.js`, `lang/en.js` | `TRANSLATIONS` | – |
| 2 | `data/preset-quizzes.js` | `PRESET_QUIZZES` | – |
| 3 | `js/quiz.js` | `Quiz` | – |
| 4 | `js/game.js` | `Game` | `Quiz` |
| 5 | `js/storage.js` | `Store` | `Quiz`, `Game`, `PRESET_QUIZZES` |
| 6 | `js/i18n.js` | `I18n`, `t` | `TRANSLATIONS` |
| 7 | `js/ui-common.js` | `UI`, `el` | `t` |
| 8 | `js/ui-game.js` | `GameUI` | all of the above, `App` |
| 9 | `js/ui-editor.js` | `EditorUI` | all of the above, `App` |
| 10 | `js/app.js` | `App` | everything; starts the app |

## Screens

`index.html` contains one empty `<section>` per screen: `menu`, `setup`, `game`, `results`, `quizzes`, `editor`, `preview`. `App.go(name)` shows one section and calls its render function, which builds the content with `el(...)`. `App.rerender()` redraws the current screen; it is called after every change and when the language is switched.

Screens are redrawn completely, which keeps the code simple. The exception is the quiz editor while typing: it only updates small status texts (`updateStatus()`), so the text field you are typing in is not replaced.

## The game state

```js
{
  version: 1,                    // format version, so old saves can be recognised
  status: 'playing',             // or 'finished'
  startedAt, finishedAt,
  quiz: { … },                   // a complete copy of the quiz, taken at the start
  teams: [{ name, score }],      // in the order they were entered
  turnOrder: [2, 0, 3, 1],       // team indexes in playing order, drawn once
  turnIndex: 5,                  // number of completed turns
  usedQuestions: [{ cat, row, team, correct, points }],
  openQuestion: { cat, row, answerRevealed } | null
}
```

- The team on turn is **calculated**, never stored: `turnOrder[turnIndex % teams.length]`. It cannot get out of sync.
- Point values are **calculated** from the row: `(row + 1) * 100`.
- The game keeps its own copy of the quiz, so editing or deleting the quiz never changes a running game.
- Only `Game.evaluateAnswer()` moves the turn on. "Back to board" and score corrections never do.
- Evaluation requires an open question whose answer is shown, so double clicks cannot score twice.

### Change → save → redraw

Every action in `ui-game.js` calls a function from `game.js`, then `commit()`, which saves the state with `Store.saveGame()` and redraws the screen. Because the open question and "answer shown" are part of the state, a page refresh restores the exact moment.

On start-up, `Store.loadGame()` reads the saved state and checks it with `Game.validateState()`. Damaged data is removed (with a message) instead of crashing the app.

## Quizzes

- Built-in quizzes come from `data/preset-quizzes.js` and are read-only.
- User quizzes are stored as one list in `localStorage` (`rescue.quizzes`). If that data is ever damaged, the original text is copied to `rescue.quizzes.backup` before anything is overwritten.
- `Quiz.normalize()` checks the shape of any quiz that comes from outside (storage or an imported file). `Quiz.findMissingFields()` checks completeness; only complete quizzes can be played.

### Export file format

```json
{
  "format": "rescue-quiz",
  "formatVersion": 1,
  "exportedAt": "2026-11-20T18:00:00.000Z",
  "quiz": {
    "title": "…",
    "language": "cs",
    "categories": [
      { "name": "…", "questions": [ { "question": "…", "answer": "…", "note": "" } ] }
    ]
  }
}
```

There are always 5 categories with 5 questions each. If the format ever changes, increase `formatVersion` and teach `Quiz.parseImport()` to read the old versions.

## Translations

- All interface texts live in `lang/*.js` under keys such as `game.revealAnswer`. Code uses `t('game.revealAnswer')` and never writes interface text directly.
- `{placeholders}` are filled in by `t(key, { … })`.
- Czech plural forms are avoided by phrasing texts as "Chybějící pole: 3".
- A missing key falls back to Czech and prints a warning in the browser console.
- Quiz content is never translated.

## localStorage keys

| Key | Content |
| --- | --- |
| `rescue.language` | `cs` or `en` |
| `rescue.quizzes` | list of user quizzes |
| `rescue.quizzes.backup` | only if damaged quiz data was found |
| `rescue.game` | the current or last finished game |

## Ideas for later (not built)

- Undo for the last evaluated question.
- Several saved games at once.
- Images in questions.
- A separate "presenter view" on a second screen.
