// quiz.js
// The quiz data format: creating, copying, checking, exporting and importing quizzes.
// This file knows nothing about the screen or about localStorage.
//
// A quiz looks like this:
// {
//   id: "quiz-…",            unique id, created automatically
//   title: "My quiz",
//   language: "cs",          language of the quiz CONTENT (not of the app interface)
//   updatedAt: "2026-…",     ISO date of the last save
//   categories: [            always 5 categories …
//     { name: "Climate",
//       questions: [         … with always 5 questions each
//         { question: "…", answer: "…", note: "optional explanation" }
//       ] }
//   ]
// }
// Point values are NOT stored. They come from the question's row: row 0 = 100 … row 4 = 500.

const Quiz = (() => {
  const CATEGORY_COUNT = 5;
  const QUESTIONS_PER_CATEGORY = 5;
  const POINT_STEP = 100;
  const MAX_TEXT_LENGTH = 2000;

  // Used in exported files so we can recognise them when importing.
  const FILE_FORMAT = 'rescue-quiz';
  const FILE_FORMAT_VERSION = 1;

  function pointsForRow(row) {
    return (row + 1) * POINT_STEP;
  }

  function createId() {
    return 'quiz-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function createEmptyQuestion() {
    return { question: '', answer: '', note: '' };
  }

  function createEmpty(language) {
    const categories = [];
    for (let c = 0; c < CATEGORY_COUNT; c++) {
      const questions = [];
      for (let r = 0; r < QUESTIONS_PER_CATEGORY; r++) questions.push(createEmptyQuestion());
      categories.push({ name: '', questions });
    }
    return { id: createId(), title: '', language: language || 'cs', updatedAt: new Date().toISOString(), categories };
  }

  // A deep copy: a completely independent duplicate, so changing one never changes the other.
  function clone(quiz) {
    return JSON.parse(JSON.stringify(quiz));
  }

  function isBlank(text) {
    return typeof text !== 'string' || text.trim() === '';
  }

  // Lists every required field that is still empty.
  // Each problem is { field: 'title' } or { field: 'category', cat } or { field: 'question' | 'answer', cat, row }.
  function findMissingFields(quiz) {
    const missing = [];
    if (isBlank(quiz.title)) missing.push({ field: 'title' });
    quiz.categories.forEach((category, cat) => {
      if (isBlank(category.name)) missing.push({ field: 'category', cat });
      category.questions.forEach((q, row) => {
        if (isBlank(q.question)) missing.push({ field: 'question', cat, row });
        if (isBlank(q.answer)) missing.push({ field: 'answer', cat, row });
      });
    });
    return missing;
  }

  function isComplete(quiz) {
    return findMissingFields(quiz).length === 0;
  }

  function cleanText(value) {
    return typeof value === 'string' ? value.slice(0, MAX_TEXT_LENGTH) : '';
  }

  // Checks the SHAPE of quiz data that comes from outside (storage or an imported file)
  // and returns a clean copy, or null when the data cannot be used.
  // It does not require the quiz to be complete: unfinished quizzes are allowed.
  function normalize(data) {
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.categories) || data.categories.length !== CATEGORY_COUNT) return null;

    const categories = [];
    for (const category of data.categories) {
      if (!category || typeof category !== 'object') return null;
      if (!Array.isArray(category.questions) || category.questions.length !== QUESTIONS_PER_CATEGORY) return null;
      const questions = [];
      for (const q of category.questions) {
        if (!q || typeof q !== 'object') return null;
        questions.push({ question: cleanText(q.question), answer: cleanText(q.answer), note: cleanText(q.note) });
      }
      categories.push({ name: cleanText(category.name), questions });
    }

    return {
      id: typeof data.id === 'string' && data.id ? data.id : createId(),
      title: cleanText(data.title),
      language: typeof data.language === 'string' ? data.language.slice(0, 10) : '',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
      categories
    };
  }

  // Swaps two categories (used by the "move left / right" buttons in the editor).
  function swapCategories(quiz, a, b) {
    if (b < 0 || b >= CATEGORY_COUNT) return false;
    const list = quiz.categories;
    [list[a], list[b]] = [list[b], list[a]];
    return true;
  }

  // Swaps two questions inside one category. Their point values change with their position.
  function swapQuestions(quiz, cat, a, b) {
    if (b < 0 || b >= QUESTIONS_PER_CATEGORY) return false;
    const list = quiz.categories[cat].questions;
    [list[a], list[b]] = [list[b], list[a]];
    return true;
  }

  // ---------- Export / import (JSON files) ----------

  function toExportText(quiz) {
    const file = {
      format: FILE_FORMAT,
      formatVersion: FILE_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      quiz: { title: quiz.title, language: quiz.language, categories: quiz.categories }
    };
    return JSON.stringify(file, null, 2);
  }

  // A safe file name such as "rescue-my-quiz.json".
  function exportFileName(quiz) {
    const base = (quiz.title || 'quiz')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove accents (č → c)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 50);
    return 'rescue-' + (base || 'quiz') + '.json';
  }

  // Reads the text of an imported file.
  // Returns { quiz } on success or { error } with a translation key on failure.
  function parseImport(fileText) {
    let data;
    try {
      data = JSON.parse(fileText);
    } catch (e) {
      return { error: 'import.errorNotJson' };
    }
    if (!data || typeof data !== 'object' || data.format !== FILE_FORMAT) {
      return { error: 'import.errorWrongFormat' };
    }
    if (typeof data.formatVersion !== 'number' || data.formatVersion > FILE_FORMAT_VERSION) {
      return { error: 'import.errorNewerVersion' };
    }
    const quiz = normalize(data.quiz);
    if (!quiz) return { error: 'import.errorStructure' };

    // An imported quiz is always a new quiz in this browser.
    quiz.id = createId();
    quiz.updatedAt = new Date().toISOString();
    return { quiz };
  }

  return {
    CATEGORY_COUNT,
    QUESTIONS_PER_CATEGORY,
    pointsForRow,
    createId,
    createEmpty,
    clone,
    findMissingFields,
    isComplete,
    normalize,
    swapCategories,
    swapQuestions,
    toExportText,
    exportFileName,
    parseImport
  };
})();
