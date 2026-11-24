// storage.js
// The ONLY place in the app that reads or writes the browser's localStorage.
// localStorage is a small storage area inside the browser. Data stays there after the
// browser is closed, but only in this browser on this computer.
//
// What is stored:
//   rescue.language   the interface language ("cs" / "en")
//   rescue.quizzes    the user's own quizzes (built-in quizzes live in data/preset-quizzes.js)
//   rescue.game       the current or last game state
//
// Every access is wrapped in try/catch, because storage can be disabled
// (e.g. by browser privacy settings) or the saved data can be damaged.

const Store = (() => {
  const KEYS = {
    language: 'rescue.language',
    quizzes: 'rescue.quizzes',
    game: 'rescue.game'
  };

  const available = checkAvailable();

  function checkAvailable() {
    try {
      const testKey = 'rescue.test';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isAvailable() {
    return available;
  }

  function readText(key) {
    if (!available) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  // Returns true when saving worked.
  function writeText(key, text) {
    if (!available) return false;
    try {
      localStorage.setItem(key, text);
      return true;
    } catch (e) {
      // Usually means the storage is full.
      console.warn('Rescue: could not save', key, e);
      return false;
    }
  }

  function remove(key) {
    if (!available) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* nothing more we can do */
    }
  }

  // ---------- Language ----------

  function loadLanguage() {
    return readText(KEYS.language);
  }

  function saveLanguage(code) {
    return writeText(KEYS.language, code);
  }

  // ---------- The user's own quizzes ----------

  // Returns { quizzes, damaged } – damaged is true when some saved data could not be read.
  // Damaged data is copied to "rescue.quizzes.backup" first, so it is never silently lost.
  function loadUserQuizzes() {
    const text = readText(KEYS.quizzes);
    if (!text) return { quizzes: [], damaged: false };
    let list = null;
    try {
      list = JSON.parse(text);
    } catch (e) {
      list = null;
    }
    const quizzes = Array.isArray(list) ? list.map(Quiz.normalize).filter(Boolean) : [];
    const damaged = !Array.isArray(list) || quizzes.length !== list.length;
    if (damaged) writeText(KEYS.quizzes + '.backup', text);
    return { quizzes, damaged };
  }

  function saveUserQuizzes(quizzes) {
    return writeText(KEYS.quizzes, JSON.stringify(quizzes));
  }

  // ---------- Game state ----------

  // Returns { game, damaged }. A damaged game is removed so it does not cause trouble again.
  function loadGame() {
    const text = readText(KEYS.game);
    if (!text) return { game: null, damaged: false };
    let game = null;
    try {
      game = Game.validateState(JSON.parse(text));
    } catch (e) {
      game = null;
    }
    if (!game) {
      remove(KEYS.game);
      return { game: null, damaged: true };
    }
    return { game, damaged: false };
  }

  function saveGame(game) {
    return writeText(KEYS.game, JSON.stringify(game));
  }

  function clearGame() {
    remove(KEYS.game);
  }

  // ---------- Quiz library: built-in quizzes + the user's own quizzes ----------
  // Built-in quizzes (from data/preset-quizzes.js) are read-only.
  // The user's quizzes are kept in memory here and written to storage on every change.

  let userQuizzes = null;
  let quizzesDamaged = false;

  function ensureLoaded() {
    if (userQuizzes === null) {
      const result = loadUserQuizzes();
      userQuizzes = result.quizzes;
      quizzesDamaged = result.damaged;
    }
  }

  function presetQuizzes() {
    return (window.PRESET_QUIZZES || []).map(Quiz.normalize).filter(Boolean);
  }

  function isPreset(id) {
    return (window.PRESET_QUIZZES || []).some(q => q.id === id);
  }

  // All quizzes: built-in first, then the user's quizzes (newest first).
  function getAllQuizzes() {
    ensureLoaded();
    const own = [...userQuizzes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return [...presetQuizzes(), ...own];
  }

  function getQuiz(id) {
    return getAllQuizzes().find(q => q.id === id) || null;
  }

  // Adds or replaces one of the user's quizzes. Returns true when it was saved to storage.
  function saveQuiz(quiz) {
    ensureLoaded();
    if (isPreset(quiz.id)) return false;
    const copy = Quiz.clone(quiz);
    copy.updatedAt = new Date().toISOString();
    const index = userQuizzes.findIndex(q => q.id === copy.id);
    if (index >= 0) userQuizzes[index] = copy;
    else userQuizzes.push(copy);
    return saveUserQuizzes(userQuizzes);
  }

  function deleteQuiz(id) {
    ensureLoaded();
    userQuizzes = userQuizzes.filter(q => q.id !== id);
    return saveUserQuizzes(userQuizzes);
  }

  // True once if some saved quizzes could not be read (so the app can tell the user).
  function takeQuizzesDamagedFlag() {
    ensureLoaded();
    const flag = quizzesDamaged;
    quizzesDamaged = false;
    return flag;
  }

  return {
    isAvailable,
    getAllQuizzes,
    getQuiz,
    isPreset,
    saveQuiz,
    deleteQuiz,
    takeQuizzesDamagedFlag,
    loadLanguage,
    saveLanguage,
    loadGame,
    saveGame,
    clearGame
  };
})();
