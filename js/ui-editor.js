// ui-editor.js
// The quiz management screens: the list of quizzes, the quiz editor and the quiz preview.
// The editor works on a COPY of the quiz ("draft"). Nothing is stored until "Save" is pressed,
// and a running game always uses its own copy, so editing never affects a game in progress.

const EditorUI = (() => {
  let draft = null;           // the quiz being edited
  let savedSnapshot = '';     // the draft as text at the last save, to detect unsaved changes
  let isNewQuiz = false;
  let activeCategory = 0;
  let showMissing = false;    // highlight empty required fields (after a save or "Show missing")
  let previewQuizId = null;

  const MAX_IMPORT_SIZE = 1024 * 1024; // 1 MB is far more than any quiz needs

  function hasUnsavedChanges() {
    return draft !== null && JSON.stringify(draft) !== savedSnapshot;
  }

  function quizTitle(quiz) {
    return quiz.title.trim() || t('quiz.untitled');
  }

  function languageName(code) {
    if (!code) return '';
    return I18n.hasLanguage(code) ? t('language.' + code) : t('language.other');
  }

  function categoryLabel(category, index) {
    return category.name.trim() || t('editor.categoryNumber', { number: index + 1 });
  }

  // =====================================================================
  // Quiz list
  // =====================================================================

  function renderList(container) {
    const quizzes = Store.getAllQuizzes();
    container.replaceChildren(el('div', { class: 'page' },
      el('div', { class: 'page-header' },
        el('div', null,
          el('h1', null, t('quizzes.title')),
          el('p', { class: 'page-lead' }, t('quizzes.lead'))),
        el('div', { class: 'page-header-actions' },
          UI.button(t('common.backToMenu'), () => App.go('menu'), 'ghost'),
          UI.button(t('quizzes.import'), importQuiz, 'secondary'),
          UI.button(t('quizzes.new'), createQuiz, 'primary'))),
      quizzes.length
        ? el('ul', { class: 'quiz-list' }, quizzes.map(renderQuizCard))
        : el('p', { class: 'notice' }, t('quizzes.empty'))));
  }

  function renderQuizCard(quiz) {
    const preset = Store.isPreset(quiz.id);
    const missing = Quiz.findMissingFields(quiz).length;

    const tags = [
      preset ? el('span', { class: 'tag' }, t('quizzes.builtIn')) : null,
      missing === 0
        ? el('span', { class: 'tag tag-ok' }, t('quizzes.ready'))
        : el('span', { class: 'tag tag-warning' }, t('quizzes.incomplete', { count: missing })),
      quiz.language ? el('span', { class: 'quiz-card-detail' }, t('quizzes.contentLanguage', { language: languageName(quiz.language) })) : null,
      !preset ? el('span', { class: 'quiz-card-detail' }, t('quizzes.updated', { date: I18n.formatDate(quiz.updatedAt) })) : null
    ];

    const actions = preset
      ? [UI.button(t('quizzes.preview'), () => openPreview(quiz.id), 'secondary'),
        UI.button(t('quizzes.duplicate'), () => duplicateQuiz(quiz), 'secondary'),
        UI.button(t('quizzes.export'), () => exportQuiz(quiz), 'ghost')]
      : [UI.button(t('quizzes.edit'), () => openEditor(quiz.id), 'primary'),
        UI.button(t('quizzes.preview'), () => openPreview(quiz.id), 'secondary'),
        UI.button(t('quizzes.duplicate'), () => duplicateQuiz(quiz), 'secondary'),
        UI.button(t('quizzes.export'), () => exportQuiz(quiz), 'ghost'),
        UI.button(t('quizzes.delete'), () => deleteQuiz(quiz), 'ghost', { class: 'btn btn-ghost btn-danger-text' })];

    return el('li', { class: 'quiz-card' },
      el('div', { class: 'quiz-card-main' },
        el('h2', { class: 'quiz-card-title' }, quizTitle(quiz)),
        el('div', { class: 'quiz-card-meta' }, tags),
        preset ? el('p', { class: 'quiz-card-note' }, t('quizzes.builtInNote')) : null),
      el('div', { class: 'quiz-card-actions' }, actions));
  }

  function createQuiz() {
    draft = Quiz.createEmpty(I18n.getLanguage());
    savedSnapshot = JSON.stringify(draft); // an untouched empty quiz does not count as "unsaved"
    isNewQuiz = true;
    activeCategory = 0;
    showMissing = false;
    App.go('editor');
  }

  function openEditor(id) {
    const quiz = Store.getQuiz(id);
    if (!quiz || Store.isPreset(id)) return;
    draft = Quiz.clone(quiz);
    savedSnapshot = JSON.stringify(draft);
    isNewQuiz = false;
    activeCategory = 0;
    showMissing = false;
    App.go('editor');
  }

  function duplicateQuiz(quiz) {
    const copy = Quiz.clone(quiz);
    copy.id = Quiz.createId();
    copy.title = t('quizzes.copyTitle', { title: quizTitle(quiz) });
    if (!Store.saveQuiz(copy)) return showStorageError();
    UI.toast(t('quizzes.duplicated', { title: copy.title }), 'success');
    App.rerender();
  }

  async function deleteQuiz(quiz) {
    const ok = await UI.confirm({
      title: t('quizzes.deleteTitle'),
      message: t('quizzes.deleteMessage', { title: quizTitle(quiz) }),
      confirmLabel: t('quizzes.deleteConfirm'),
      danger: true
    });
    if (!ok) return;
    if (!Store.deleteQuiz(quiz.id)) return showStorageError();
    UI.toast(t('quizzes.deleted', { title: quizTitle(quiz) }));
    App.rerender();
  }

  function exportQuiz(quiz) {
    UI.downloadTextFile(Quiz.exportFileName(quiz), Quiz.toExportText(quiz));
    UI.toast(t('quizzes.exported', { title: quizTitle(quiz) }), 'success');
  }

  async function importQuiz() {
    const file = await UI.pickFile('.json,application/json');
    if (!file) return;

    if (file.size > MAX_IMPORT_SIZE) {
      return UI.alert({ title: t('import.failedTitle'), message: t('import.errorTooLarge') });
    }
    let text;
    try {
      text = await file.text();
    } catch (e) {
      return UI.alert({ title: t('import.failedTitle'), message: t('import.errorRead') });
    }

    const result = Quiz.parseImport(text);
    if (result.error) {
      return UI.alert({ title: t('import.failedTitle'), message: t(result.error) });
    }
    if (!Store.saveQuiz(result.quiz)) return showStorageError();

    const missing = Quiz.findMissingFields(result.quiz).length;
    UI.toast(missing
      ? t('import.successIncomplete', { title: quizTitle(result.quiz), count: missing })
      : t('import.success', { title: quizTitle(result.quiz) }), missing ? 'warning' : 'success');
    App.rerender();
  }

  function showStorageError() {
    UI.alert({ title: t('storage.errorTitle'), message: t('storage.quizSaveFailed') });
  }

  // =====================================================================
  // Quiz editor
  // =====================================================================

  function renderEditor(container) {
    if (!draft) return App.go('quizzes');

    const titleField = inputField('quiz-title', t('editor.quizTitle'), draft.title, value => { draft.title = value; }, {
      required: true, placeholder: t('editor.quizTitlePlaceholder'), maxlength: 120
    });

    const languageSelect = el('select', {
      id: 'quiz-language', class: 'input',
      onchange: event => { draft.language = event.target.value; updateStatus(); }
    },
      ['cs', 'en', 'other'].map(code => el('option', { value: code, selected: draft.language === code }, t('language.' + code))));
    if (!['cs', 'en', 'other'].includes(draft.language)) languageSelect.value = 'other';

    container.replaceChildren(el('div', { class: 'page editor' },
      el('div', { class: 'page-header' },
        el('div', null,
          el('h1', null, isNewQuiz ? t('editor.newTitle') : t('editor.editTitle')),
          el('p', { class: 'page-lead' }, t('editor.lead'))),
        el('div', { class: 'page-header-actions' },
          el('span', { id: 'editor-status', class: 'editor-status', 'aria-live': 'polite' }),
          UI.button(t('editor.back'), leaveEditor, 'ghost'),
          UI.button(t('editor.save'), save, 'primary'))),

      el('section', { class: 'panel editor-basics' },
        titleField,
        el('div', { class: 'field' },
          el('label', { for: 'quiz-language', class: 'field-label' }, t('editor.contentLanguage')),
          languageSelect,
          el('p', { class: 'field-hint' }, t('editor.contentLanguageHint')))),

      el('div', { id: 'editor-validation', class: 'editor-validation' }),

      el('div', { class: 'category-tabs', role: 'tablist', 'aria-label': t('editor.categories') },
        draft.categories.map((category, index) => el('button', {
          type: 'button', role: 'tab', id: 'category-tab-' + index,
          class: 'category-tab' + (index === activeCategory ? ' is-active' : ''),
          'aria-selected': index === activeCategory ? 'true' : 'false',
          'aria-controls': 'category-panel',
          'data-tab-index': index,
          onclick: () => { activeCategory = index; App.rerender(); focusLater('#category-tab-' + index); }
        }, el('span', { class: 'category-tab-name' }), el('span', { class: 'category-tab-count' })))),

      renderCategoryPanel(activeCategory)));

    updateStatus();
  }

  function renderCategoryPanel(cat) {
    const category = draft.categories[cat];
    return el('section', { class: 'panel category-panel', id: 'category-panel', role: 'tabpanel', 'aria-labelledby': 'category-tab-' + cat },
      el('div', { class: 'category-panel-header' },
        inputField('category-name', t('editor.categoryName'), category.name, value => { category.name = value; }, {
          required: true, placeholder: t('editor.categoryNamePlaceholder'), maxlength: 60
        }),
        el('div', { class: 'move-buttons' },
          UI.button('← ' + t('editor.moveLeft'), () => moveCategory(cat, -1), 'ghost', { disabled: cat === 0 }),
          UI.button(t('editor.moveRight') + ' →', () => moveCategory(cat, 1), 'ghost', { disabled: cat === Quiz.CATEGORY_COUNT - 1 }))),
      category.questions.map((question, row) => renderQuestionEditor(cat, row)));
  }

  function renderQuestionEditor(cat, row) {
    const question = draft.categories[cat].questions[row];
    const id = 'q-' + cat + '-' + row;
    const last = Quiz.QUESTIONS_PER_CATEGORY - 1;

    return el('div', { class: 'question-editor', id: id },
      el('div', { class: 'question-editor-header' },
        el('span', { class: 'points-badge' }, t('game.points', { points: I18n.formatNumber(Quiz.pointsForRow(row)) })),
        el('div', { class: 'move-buttons' },
          UI.button('↑', () => moveQuestion(cat, row, -1), 'ghost', {
            disabled: row === 0, 'aria-label': t('editor.moveUp'), title: t('editor.moveUp'), id: id + '-up'
          }),
          UI.button('↓', () => moveQuestion(cat, row, 1), 'ghost', {
            disabled: row === last, 'aria-label': t('editor.moveDown'), title: t('editor.moveDown'), id: id + '-down'
          }))),
      textareaField(id + '-question', t('editor.question'), question.question, value => { question.question = value; }, { required: true, rows: 3 }),
      el('div', { class: 'two-columns' },
        textareaField(id + '-answer', t('editor.answer'), question.answer, value => { question.answer = value; }, { required: true, rows: 2 }),
        textareaField(id + '-note', t('editor.note'), question.note, value => { question.note = value; }, { rows: 2 })));
  }

  // ---------- Form fields ----------

  function inputField(id, label, value, onChange, options) {
    const input = el('input', {
      id, class: 'input', type: 'text', value, maxlength: options.maxlength,
      placeholder: options.placeholder, autocomplete: 'off', 'aria-required': options.required ? 'true' : null
    });
    return wireField(input, label, onChange, options);
  }

  function textareaField(id, label, value, onChange, options) {
    const area = el('textarea', {
      id, class: 'input', rows: options.rows, maxlength: 2000, 'aria-required': options.required ? 'true' : null
    });
    area.value = value;
    return wireField(area, label, onChange, options);
  }

  function wireField(control, label, onChange, options) {
    control.addEventListener('input', () => {
      onChange(control.value);
      markField(control, options.required);
      updateStatus();
    });
    markField(control, options.required);
    return el('div', { class: 'field' },
      el('label', { for: control.id, class: 'field-label' },
        label,
        options.required ? null : el('span', { class: 'field-optional' }, ' (' + t('editor.optional') + ')')),
      control);
  }

  // Marks an empty required field, but only after the user has tried to save.
  function markField(control, required) {
    const missing = Boolean(showMissing && required && control.value.trim() === '');
    control.classList.toggle('is-missing', missing);
    if (missing) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }

  // Updates the small status texts without redrawing the form (so typing is not interrupted).
  function updateStatus() {
    const status = document.getElementById('editor-status');
    if (status) status.textContent = hasUnsavedChanges() ? t('editor.unsaved') : (isNewQuiz ? '' : t('editor.allSaved'));

    const missing = Quiz.findMissingFields(draft);

    document.querySelectorAll('.category-tab').forEach(tab => {
      const index = Number(tab.dataset.tabIndex);
      const category = draft.categories[index];
      const missingHere = missing.filter(m => m.cat === index).length;
      tab.querySelector('.category-tab-name').textContent = categoryLabel(category, index);
      tab.querySelector('.category-tab-count').textContent = missingHere ? t('editor.tabMissing', { count: missingHere }) : '✓';
      tab.classList.toggle('has-missing', missingHere > 0);
    });

    const box = document.getElementById('editor-validation');
    if (box) {
      box.replaceChildren(missing.length === 0
        ? el('p', { class: 'notice notice-ok' }, t('editor.validComplete'))
        : el('div', { class: 'notice notice-warning' },
          el('p', null, t('editor.validMissing', { count: missing.length })),
          UI.button(t('editor.showMissing'), showMissingFields, 'secondary')));
    }
  }

  function showMissingFields() {
    const missing = Quiz.findMissingFields(draft);
    showMissing = true;
    const firstInCategory = missing.find(m => m.cat !== undefined);
    if (firstInCategory) activeCategory = firstInCategory.cat;
    App.rerender();
    const first = document.querySelector('.is-missing');
    if (first) first.focus();
  }

  function moveCategory(cat, direction) {
    if (Quiz.swapCategories(draft, cat, cat + direction)) {
      activeCategory = cat + direction;
      App.rerender();
      focusLater('#category-tab-' + activeCategory);
    }
  }

  function moveQuestion(cat, row, direction) {
    if (Quiz.swapQuestions(draft, cat, row, row + direction)) {
      App.rerender();
      const target = row + direction;
      const button = document.getElementById('q-' + cat + '-' + target + (direction < 0 ? '-up' : '-down'));
      if (button && !button.disabled) button.focus();
      else focusLater('#q-' + cat + '-' + target + '-question');
      UI.toast(t('editor.questionMoved', { points: I18n.formatNumber(Quiz.pointsForRow(target)) }));
    }
  }

  function focusLater(selector) {
    const target = document.querySelector(selector);
    if (target) target.focus();
  }

  function save() {
    if (!Store.saveQuiz(draft)) return showStorageError();
    savedSnapshot = JSON.stringify(draft);
    isNewQuiz = false;
    const missing = Quiz.findMissingFields(draft).length;
    showMissing = missing > 0;
    UI.toast(missing ? t('editor.savedIncomplete', { count: missing }) : t('editor.saved'), missing ? 'warning' : 'success');
    App.rerender();
  }

  async function leaveEditor() {
    if (hasUnsavedChanges()) {
      const leave = await UI.confirm({
        title: t('editor.unsavedTitle'),
        message: t('editor.unsavedMessage'),
        confirmLabel: t('editor.discardChanges'),
        cancelLabel: t('editor.keepEditing'),
        danger: true
      });
      if (!leave) return;
    }
    draft = null;
    App.go('quizzes');
  }

  // =====================================================================
  // Preview
  // =====================================================================

  function openPreview(id) {
    previewQuizId = id;
    App.go('preview');
  }

  function renderPreview(container) {
    const quiz = Store.getQuiz(previewQuizId);
    if (!quiz) return App.go('quizzes');
    const complete = Quiz.isComplete(quiz);

    container.replaceChildren(el('div', { class: 'page' },
      el('div', { class: 'page-header' },
        el('div', null,
          el('p', { class: 'page-eyebrow' }, t('preview.eyebrow')),
          el('h1', null, quizTitle(quiz)),
          el('p', { class: 'page-lead' }, t('preview.lead'))),
        el('div', { class: 'page-header-actions' },
          UI.button(t('preview.back'), () => App.go('quizzes'), 'ghost'),
          !Store.isPreset(quiz.id) ? UI.button(t('quizzes.edit'), () => openEditor(quiz.id), 'secondary') : null,
          complete ? UI.button(t('preview.play'), () => { GameUI.prepareSetup({ quizId: quiz.id }); App.go('setup'); }, 'primary') : null)),
      complete ? null : el('p', { class: 'notice notice-warning' }, t('preview.incomplete')),
      el('div', { class: 'preview-grid' }, quiz.categories.map((category, cat) =>
        el('section', { class: 'panel preview-category' },
          el('h2', { class: 'preview-category-name' }, categoryLabel(category, cat)),
          el('ol', { class: 'preview-questions' }, category.questions.map((q, row) =>
            el('li', null,
              el('span', { class: 'points-badge' }, I18n.formatNumber(Quiz.pointsForRow(row))),
              el('p', { class: 'preview-question' }, q.question || '—'),
              el('p', { class: 'preview-answer' }, el('strong', null, t('preview.answer') + ': '), q.answer || '—'),
              q.note.trim() ? el('p', { class: 'preview-note' }, q.note) : null))))))));
  }

  return { hasUnsavedChanges, renderList, renderEditor, renderPreview, openEditor, openPreview };
})();
