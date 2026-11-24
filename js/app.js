// app.js
// Starts the application and switches between screens.
// It is loaded last, after all other scripts.

const App = (() => {
  let currentScreen = null;

  // Each screen has one function that draws it into its <section> element.
  const screens = {
    menu: renderMenu,
    setup: container => GameUI.renderSetup(container),
    game: container => GameUI.renderGame(container),
    results: container => GameUI.renderResults(container),
    quizzes: container => EditorUI.renderList(container),
    editor: container => EditorUI.renderEditor(container),
    preview: container => EditorUI.renderPreview(container)
  };

  // Opens a screen.
  function go(name) {
    currentScreen = name;
    const container = UI.showScreen(name);
    screens[name](container);
    if (currentScreen === name) UI.focusHeading(container);
  }

  // Redraws the current screen (after a change or a language switch).
  function rerender() {
    if (!currentScreen) return;
    screens[currentScreen](document.getElementById('screen-' + currentScreen));
  }

  // =====================================================================
  // Main menu
  // =====================================================================

  function renderMenu(container) {
    const game = GameUI.getGame();
    const hasGame = game && game.status === 'playing';

    const menuCard = (title, text, onClick, primary) =>
      el('button', { type: 'button', class: 'menu-card' + (primary ? ' is-primary' : ''), onclick: onClick },
        el('span', { class: 'menu-card-title' }, title),
        el('span', { class: 'menu-card-text' }, text));

    container.replaceChildren(el('div', { class: 'menu' },
      el('div', { class: 'menu-hero' },
        el('p', { class: 'menu-eyebrow' }, t('menu.eyebrow')),
        el('h1', { class: 'menu-title' }, 'Rescue'),
        el('p', { class: 'menu-tagline' }, t('menu.tagline'))),

      hasGame ? el('section', { class: 'panel menu-resume', 'aria-labelledby': 'resume-heading' },
        el('div', null,
          el('h2', { id: 'resume-heading', class: 'panel-heading' }, t('menu.resumeTitle')),
          el('p', { class: 'panel-hint' }, gameSummary(game))),
        el('div', { class: 'menu-resume-actions' },
          UI.button(t('menu.discardGame'), confirmDiscardGame, 'ghost'),
          UI.button(t('menu.continueGame'), () => go('game'), 'primary'))) : null,

      el('div', { class: 'menu-actions' },
        menuCard(t('menu.newGame'), t('menu.newGameText'), () => { GameUI.prepareSetup(); go('setup'); }, !hasGame),
        menuCard(t('menu.quizzes'), t('menu.quizzesText'), () => go('quizzes'), false)),

      el('p', { class: 'menu-footnote' }, t('menu.footnote'))));
  }

  function gameSummary(game) {
    return t('menu.resumeInfo', {
      quiz: game.quiz.title,
      used: game.usedQuestions.length,
      total: Game.totalQuestions(),
      teams: game.teams.length
    });
  }

  async function confirmDiscardGame() {
    const ok = await UI.confirm({
      title: t('menu.discardTitle'),
      message: t('menu.discardMessage'),
      confirmLabel: t('menu.discardConfirm'),
      danger: true
    });
    if (!ok) return;
    GameUI.discardGame();
    rerender();
    UI.toast(t('menu.discarded'));
  }

  // =====================================================================
  // Header: language switch and storage warning
  // =====================================================================

  function renderHeader() {
    const switcher = document.getElementById('language-switch');
    switcher.setAttribute('aria-label', t('language.switchLabel'));
    switcher.replaceChildren(...I18n.languages().map(lang => el('button', {
      type: 'button',
      class: 'lang-button' + (lang.code === I18n.getLanguage() ? ' is-active' : ''),
      lang: lang.code,
      'aria-pressed': lang.code === I18n.getLanguage() ? 'true' : 'false',
      title: lang.name,
      onclick: () => changeLanguage(lang.code)
    }, lang.code.toUpperCase())));

    const warning = document.getElementById('storage-warning');
    warning.hidden = Store.isAvailable();
    warning.textContent = t('storage.unavailable');
  }

  // Switching the language only redraws texts; the game itself is not touched.
  function changeLanguage(code) {
    Store.saveLanguage(code);
    I18n.setLanguage(code);
  }

  // =====================================================================
  // Start-up
  // =====================================================================

  async function start() {
    UI.setupDialog();

    const savedLanguage = Store.loadLanguage();
    I18n.setLanguage(savedLanguage && I18n.hasLanguage(savedLanguage) ? savedLanguage : I18n.DEFAULT_LANGUAGE);
    I18n.onChange(() => {
      renderHeader();
      rerender();
    });
    renderHeader();

    document.addEventListener('fullscreenchange', () => {
      document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
      if (currentScreen === 'game') rerender();
    });

    // Warn before closing the page with unsaved changes in the editor.
    window.addEventListener('beforeunload', event => {
      if (EditorUI.hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

    const { game, damaged } = Store.loadGame();
    GameUI.setGame(game);

    // A finished game stays saved until the results screen is closed.
    go(game && game.status === 'finished' ? 'results' : 'menu');

    // The app started, so remove the "app did not start" message from index.html.
    const startupProblem = document.getElementById('startup-problem');
    if (startupProblem) startupProblem.remove();

    if (damaged) {
      await UI.alert({ title: t('storage.damagedGameTitle'), message: t('storage.damagedGameMessage') });
    }
    if (Store.takeQuizzesDamagedFlag()) {
      await UI.alert({ title: t('storage.damagedQuizzesTitle'), message: t('storage.damagedQuizzesMessage') });
    }
    if (game && game.status === 'playing') {
      await offerToResume(game);
    }
  }

  async function offerToResume(game) {
    const choice = await UI.openDialog({
      title: t('restore.title'),
      message: gameSummary(game),
      buttons: [
        { label: t('restore.discard'), value: 'discard', variant: 'secondary' },
        { label: t('restore.continue'), value: 'continue', variant: 'primary' }
      ]
    });
    if (choice === 'continue') go('game');
    else if (choice === 'discard') confirmDiscardGame();
    // Closing the dialog (Escape) keeps the game; the menu still offers "Continue".
  }

  return { start, go, rerender };
})();

document.addEventListener('DOMContentLoaded', App.start);
