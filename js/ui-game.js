// ui-game.js
// The game screens: game setup, the game board with the question view, and the results.
// These functions only DRAW the screens and react to clicks.
// All rules (scoring, turn order, …) live in game.js.

const GameUI = (() => {
  let game = null;        // the active game state (also kept in storage)
  let setup = null;       // values on the setup screen: { quizId, teamNames }
  let setupError = '';
  let focusSelector = null; // what should get keyboard focus after the next redraw

  function getGame() {
    return game;
  }

  function setGame(state) {
    game = state;
  }

  // Every change to the game goes through here: save first, then redraw.
  function commit() {
    if (!Store.saveGame(game) && Store.isAvailable()) {
      UI.toast(t('storage.gameSaveFailed'), 'error');
    }
    App.rerender();
  }

  function discardGame() {
    game = null;
    Store.clearGame();
  }

  // =====================================================================
  // Setup screen
  // =====================================================================

  // prefill (optional): { quizId, teamNames } – used by "Play this quiz" and "New game" on the results screen.
  function prepareSetup(prefill) {
    const firstPlayable = Store.getAllQuizzes().find(Quiz.isComplete);
    setup = {
      quizId: (prefill && prefill.quizId) || (firstPlayable ? firstPlayable.id : null),
      teamNames: prefill && prefill.teamNames ? [...prefill.teamNames] : ['', '', '', '']
    };
    setupError = '';
  }

  function defaultTeamName(index) {
    return t('setup.defaultTeamName', { number: index + 1 });
  }

  function renderSetup(container) {
    if (!setup) prepareSetup();
    const quizzes = Store.getAllQuizzes();
    if (!quizzes.some(q => q.id === setup.quizId)) setup.quizId = null;

    const summary = el('p', { class: 'setup-summary', id: 'setup-summary' });
    const errorBox = el('p', { class: 'form-error', id: 'setup-error', role: 'alert' }, setupError);
    const teamsArea = el('div', { class: 'team-inputs' });

    const updateSummary = () => {
      const quiz = quizzes.find(q => q.id === setup.quizId);
      summary.textContent = quiz
        ? t('setup.summaryText', { quiz: quiz.title || t('quiz.untitled'), count: setup.teamNames.length })
        : t('setup.summaryNoQuiz');
    };

    const renderTeams = () => {
      teamsArea.replaceChildren(
        renderTeamCount(() => { renderTeams(); updateSummary(); }),
        el('div', { class: 'team-name-grid' }, setup.teamNames.map((name, i) => {
          const id = 'team-name-' + i;
          return el('div', { class: 'field' },
            el('label', { for: id, class: 'field-label' }, t('setup.teamLabel', { number: i + 1 })),
            el('input', {
              id, class: 'input', type: 'text', maxlength: 40, value: name,
              placeholder: defaultTeamName(i), autocomplete: 'off',
              oninput: event => { setup.teamNames[i] = event.target.value; }
            }));
        }))
      );
    };

    renderTeams();
    updateSummary();

    container.replaceChildren(el('div', { class: 'page page-narrow' },
      el('div', { class: 'page-header' },
        el('div', null,
          el('h1', null, t('setup.title')),
          el('p', { class: 'page-lead' }, t('setup.lead'))),
        el('div', { class: 'page-header-actions' },
          UI.button(t('common.backToMenu'), () => App.go('menu'), 'ghost'))),

      el('section', { class: 'panel', 'aria-labelledby': 'setup-quiz-heading' },
        el('h2', { id: 'setup-quiz-heading', class: 'panel-heading' }, t('setup.stepQuiz')),
        renderQuizChoices(quizzes, updateSummary)),

      el('section', { class: 'panel', 'aria-labelledby': 'setup-teams-heading' },
        el('h2', { id: 'setup-teams-heading', class: 'panel-heading' }, t('setup.stepTeams')),
        el('p', { class: 'panel-hint' }, t('setup.teamsHint')),
        teamsArea),

      el('section', { class: 'panel', 'aria-labelledby': 'setup-summary-heading' },
        el('h2', { id: 'setup-summary-heading', class: 'panel-heading' }, t('setup.stepSummary')),
        summary,
        el('p', { class: 'panel-hint' }, t('setup.orderHint'))),

      errorBox,
      el('div', { class: 'page-actions' },
        UI.button(t('setup.start'), startGame, 'primary', { class: 'btn btn-primary btn-large' }))
    ));
  }

  function renderQuizChoices(quizzes, onChange) {
    if (!quizzes.some(Quiz.isComplete)) {
      return el('div', { class: 'notice' },
        el('p', null, t('setup.noPlayableQuiz')),
        UI.button(t('menu.quizzes'), () => App.go('quizzes'), 'secondary'));
    }
    return el('div', { class: 'choice-list', role: 'radiogroup', 'aria-labelledby': 'setup-quiz-heading' },
      quizzes.map(quiz => {
        const missing = Quiz.findMissingFields(quiz).length;
        return el('label', { class: 'choice' + (missing ? ' is-disabled' : '') },
          el('input', {
            type: 'radio', name: 'setup-quiz', value: quiz.id,
            checked: quiz.id === setup.quizId, disabled: missing > 0,
            onchange: () => { setup.quizId = quiz.id; onChange(); }
          }),
          el('span', { class: 'choice-body' },
            el('span', { class: 'choice-title' }, quiz.title || t('quiz.untitled')),
            el('span', { class: 'choice-meta' },
              Store.isPreset(quiz.id) ? t('quizzes.builtIn') + ' · ' : '',
              missing ? t('setup.quizIncomplete', { count: missing }) : t('setup.quizReady'))));
      }));
  }

  function renderTeamCount(onChange) {
    const count = setup.teamNames.length;
    const change = delta => {
      const next = count + delta;
      if (next < Game.MIN_TEAMS || next > Game.MAX_TEAMS) return;
      if (delta > 0) setup.teamNames.push('');
      else setup.teamNames.pop();
      onChange();
      // keep keyboard focus on the button that was pressed
      const again = document.getElementById(delta > 0 ? 'team-count-plus' : 'team-count-minus');
      if (again && !again.disabled) again.focus();
    };
    return el('div', { class: 'stepper', role: 'group', 'aria-label': t('setup.teamCount') },
      el('span', { class: 'field-label' }, t('setup.teamCount')),
      UI.button('−', () => change(-1), 'secondary', {
        id: 'team-count-minus', 'aria-label': t('setup.fewerTeams'), disabled: count <= Game.MIN_TEAMS
      }),
      el('output', { class: 'stepper-value', 'aria-live': 'polite' }, String(count)),
      UI.button('+', () => change(1), 'secondary', {
        id: 'team-count-plus', 'aria-label': t('setup.moreTeams'), disabled: count >= Game.MAX_TEAMS
      }));
  }

  function showSetupError(message) {
    setupError = message;
    const box = document.getElementById('setup-error');
    if (box) box.textContent = message;
  }

  async function startGame() {
    const quiz = Store.getQuiz(setup.quizId);
    if (!quiz) return showSetupError(t('setup.errorNoQuiz'));
    if (!Quiz.isComplete(quiz)) return showSetupError(t('setup.errorQuizIncomplete'));

    const names = setup.teamNames.map((name, i) => name.trim() || defaultTeamName(i));
    const lowerCase = names.map(name => name.toLocaleLowerCase());
    if (new Set(lowerCase).size !== names.length) return showSetupError(t('setup.errorDuplicateNames'));

    if (game && game.status === 'playing') {
      const replace = await UI.confirm({
        title: t('setup.replaceTitle'),
        message: t('setup.replaceMessage'),
        confirmLabel: t('setup.replaceConfirm'),
        danger: true
      });
      if (!replace) return;
    }

    game = Game.createGame(quiz, names);
    setup = null;
    if (!Store.saveGame(game) && Store.isAvailable()) UI.toast(t('storage.gameSaveFailed'), 'error');
    App.go('game');
    showDrawnOrder();
  }

  // Shows the randomly drawn playing order once, right after the start.
  function showDrawnOrder() {
    const list = el('ol', { class: 'order-list' },
      game.turnOrder.map(index => el('li', null, game.teams[index].name)));
    UI.openDialog({
      title: t('game.orderDrawnTitle'),
      message: t('game.orderDrawnMessage'),
      content: list,
      buttons: [{ label: t('game.orderDrawnStart'), value: true, variant: 'primary' }]
    });
  }

  // =====================================================================
  // Game screen (board + question view + team panel)
  // =====================================================================

  function renderGame(container) {
    if (!game) return App.go('menu');
    if (game.status === 'finished') return App.go('results');

    const team = game.teams[Game.currentTeamIndex(game)];

    const topbar = el('div', { class: 'game-topbar' },
      el('div', { class: 'game-heading' },
        el('h1', { class: 'game-quiz-title' }, game.quiz.title),
        el('span', { class: 'game-progress' },
          t('game.progress', { used: game.usedQuestions.length, total: Game.totalQuestions() }))),
      el('div', { class: 'game-controls' },
        renderFullscreenButton(),
        UI.button(t('game.endGame'), confirmEndGame, 'ghost'),
        UI.button(t('game.mainMenu'), leaveToMenu, 'ghost')));

    const turnBanner = el('div', { class: 'turn-banner' },
      el('span', { class: 'turn-label' }, game.openQuestion ? t('game.answering') : t('game.onTurn')),
      el('span', { class: 'turn-team' }, team.name));

    container.replaceChildren(el('div', { class: 'game-layout' },
      topbar,
      el('div', { class: 'game-main' },
        el('div', { class: 'game-stage' },
          turnBanner,
          game.openQuestion ? renderQuestion() : renderBoard()),
        renderTeamPanel())));

    if (focusSelector) {
      const target = container.querySelector(focusSelector);
      if (target) target.focus({ preventScroll: true });
      focusSelector = null;
    }
  }

  function renderBoard() {
    const cells = [];
    game.quiz.categories.forEach((category, cat) => {
      cells.push(el('div', { class: 'board-category', style: `grid-column:${cat + 1};grid-row:1` }, category.name));

      category.questions.forEach((question, row) => {
        const points = Quiz.pointsForRow(row);
        const position = `grid-column:${cat + 1};grid-row:${row + 2}`;
        const used = Game.findUsed(game, cat, row);

        if (used) {
          const teamName = game.teams[used.team].name;
          const change = used.correct ? used.points : -used.points;
          // A played question is plain text, not a button, so it cannot be opened again.
          cells.push(el('div', {
            class: 'board-cell is-used ' + (used.correct ? 'was-correct' : 'was-incorrect'),
            style: position
          },
            el('span', { class: 'visually-hidden' }, t('game.cellUsedLabel', {
              category: category.name, points, team: teamName, change: I18n.formatChange(change)
            })),
            el('span', { class: 'cell-points', 'aria-hidden': 'true' }, I18n.formatNumber(points)),
            el('span', { class: 'cell-result', 'aria-hidden': 'true' }, teamName + ' ' + I18n.formatChange(change))));
        } else {
          cells.push(el('button', {
            type: 'button', class: 'board-cell', style: position,
            'aria-label': t('game.cellLabel', { category: category.name, points }),
            onclick: () => {
              if (Game.openQuestion(game, cat, row)) {
                focusSelector = '.question-actions .btn-primary';
                commit();
              }
            }
          }, el('span', { class: 'cell-points' }, I18n.formatNumber(points))));
        }
      });
    });
    return el('div', { class: 'board' }, cells);
  }

  function renderQuestion() {
    const open = game.openQuestion;
    const question = Game.getQuestion(game, open.cat, open.row);
    const points = Quiz.pointsForRow(open.row);
    const pointsText = I18n.formatNumber(points);

    const backButton = UI.button(t('game.backToBoard'), backToBoard, 'ghost');
    const actions = open.answerRevealed
      ? [backButton,
        UI.button(t('game.incorrect', { points: pointsText }), () => evaluate(false), 'incorrect'),
        UI.button(t('game.correct', { points: pointsText }), () => evaluate(true), 'correct')]
      : [backButton,
        UI.button(t('game.revealAnswer'), reveal, 'primary')];

    // Long texts get a smaller font so the whole question, answer and buttons fit on one screen.
    const classes = ['question-view'];
    if (open.answerRevealed) classes.push('is-revealed');
    if (question.question.length > 160) classes.push('has-long-question');
    if (question.answer.length + question.note.length > 90) classes.push('has-long-answer');

    return el('section', { class: classes.join(' '), 'aria-label': t('game.questionRegion') },
      el('div', { class: 'question-meta' },
        el('span', { class: 'question-category' }, game.quiz.categories[open.cat].name),
        el('span', { class: 'question-points' }, t('game.points', { points: pointsText }))),
      el('p', { class: 'question-text' }, question.question),
      open.answerRevealed
        ? el('div', { class: 'answer-box', role: 'status' },
          el('span', { class: 'answer-label' }, t('game.correctAnswer')),
          el('p', { class: 'answer-text' }, question.answer),
          question.note.trim() ? el('p', { class: 'answer-note' }, question.note) : null)
        : null,
      el('div', { class: 'question-actions' }, actions));
  }

  function reveal() {
    if (Game.revealAnswer(game)) {
      focusSelector = '.question-actions .btn-correct';
      commit();
    }
  }

  function backToBoard() {
    if (Game.closeQuestion(game)) {
      focusSelector = '.board-cell:not(.is-used)';
      commit();
    }
  }

  function evaluate(correct) {
    const team = game.teams[Game.currentTeamIndex(game)];
    const result = Game.evaluateAnswer(game, correct);
    if (!result) return; // e.g. a double click – the question is already evaluated
    UI.toast(t(correct ? 'game.toastCorrect' : 'game.toastIncorrect', {
      team: team.name, change: I18n.formatChange(result.change)
    }), correct ? 'success' : 'error');
    focusSelector = '.board-cell:not(.is-used)';
    commit();
  }

  function renderTeamPanel() {
    const current = Game.currentTeamIndex(game);
    const leaders = Game.leadingTeams(game);

    return el('aside', { class: 'team-panel', 'aria-label': t('game.teamsPanel') },
      el('h2', { class: 'team-panel-title' }, t('game.turnOrder')),
      el('ol', { class: 'team-list' }, game.turnOrder.map((teamIndex, position) => {
        const team = game.teams[teamIndex];
        const isCurrent = teamIndex === current;
        const isLeader = leaders.includes(teamIndex);
        return el('li', { class: 'team-row' + (isCurrent ? ' is-current' : ''), 'aria-current': isCurrent ? 'true' : null },
          el('span', { class: 'team-position', 'aria-hidden': 'true' }, String(position + 1)),
          el('span', { class: 'team-info' },
            el('span', { class: 'team-name' }, team.name),
            el('span', { class: 'team-tags' },
              isCurrent ? el('span', { class: 'tag tag-accent' }, t('game.tagOnTurn')) : null,
              isLeader ? el('span', { class: 'tag' }, leaders.length > 1 ? t('game.tagSharedLead') : t('game.tagLeading')) : null)),
          el('button', {
            type: 'button', class: 'team-score' + (team.score < 0 ? ' is-negative' : ''),
            title: t('game.adjustScore'),
            'aria-label': t('game.adjustScoreFor', { team: team.name, score: I18n.formatNumber(team.score) }),
            onclick: () => adjustScore(teamIndex)
          }, I18n.formatNumber(team.score)));
      })),
      el('p', { class: 'team-panel-hint' }, t('game.adjustHint')));
  }

  async function adjustScore(teamIndex) {
    const team = game.teams[teamIndex];
    const input = el('input', {
      id: 'score-input', class: 'input input-score', type: 'number', step: 100,
      inputmode: 'numeric', value: String(team.score)
    });
    const quickButton = delta => UI.button(I18n.formatChange(delta), () => {
      input.value = String((parseInt(input.value, 10) || 0) + delta);
      input.focus();
    }, 'secondary');

    const content = el('div', { class: 'score-editor' },
      el('label', { for: 'score-input', class: 'field-label' }, t('game.newScore')),
      el('div', { class: 'score-editor-row' }, quickButton(-100), input, quickButton(100)));

    const answer = await UI.openDialog({
      title: t('game.adjustScoreTitle', { team: team.name }),
      message: t('game.adjustScoreMessage'),
      content,
      enterValue: 'save',
      buttons: [
        { label: t('common.cancel'), value: null, variant: 'secondary' },
        { label: t('common.save'), value: 'save', variant: 'primary' }
      ]
    });
    if (answer !== 'save') return;

    const value = Number(input.value);
    if (input.value.trim() === '' || !Number.isInteger(value)) {
      UI.toast(t('game.invalidScore'), 'error');
      return;
    }
    if (value === team.score) return;
    Game.setScore(game, teamIndex, value);
    commit();
    UI.toast(t('game.scoreAdjusted', { team: team.name, score: I18n.formatNumber(value) }));
  }

  async function confirmEndGame() {
    const ok = await UI.confirm({
      title: t('game.endGameTitle'),
      message: t('game.endGameMessage'),
      confirmLabel: t('game.endGameConfirm'),
      danger: true
    });
    if (!ok) return;
    Game.finishGame(game);
    commit();
  }

  // The game is saved after every change, so leaving to the menu loses nothing.
  function leaveToMenu() {
    App.go('menu');
    UI.toast(t('game.savedToast'));
  }

  // ---------- Fullscreen ----------

  function renderFullscreenButton() {
    if (!document.fullscreenEnabled) return null;
    const active = !!document.fullscreenElement;
    return UI.button(active ? t('game.exitFullscreen') : t('game.enterFullscreen'), toggleFullscreen, 'ghost',
      { 'aria-pressed': active ? 'true' : 'false' });
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (e) {
      UI.toast(t('game.fullscreenFailed'), 'error');
    }
  }

  // =====================================================================
  // Results screen
  // =====================================================================

  function renderResults(container) {
    if (!game) return App.go('menu');
    if (game.status !== 'finished') return App.go('game');

    const ranking = Game.getRanking(game);
    const winnerNames = ranking.winners.map(i => game.teams[i].name);
    const allPlayed = game.usedQuestions.length >= Game.totalQuestions();

    const table = el('table', { class: 'results-table' },
      el('caption', { class: 'visually-hidden' }, t('results.tableCaption')),
      el('thead', null, el('tr', null,
        el('th', { scope: 'col' }, t('results.rank')),
        el('th', { scope: 'col' }, t('results.team')),
        el('th', { scope: 'col', class: 'num' }, t('results.score')),
        el('th', { scope: 'col', class: 'num' }, t('results.difference')))),
      el('tbody', null, ranking.rows.map(row => el('tr', { class: row.rank === 1 ? 'is-winner' : '' },
        el('td', { class: 'rank' }, row.rank + '.'),
        el('th', { scope: 'row' }, row.name),
        el('td', { class: 'num score' }, I18n.formatNumber(row.score)),
        el('td', { class: 'num' }, row.behind === 0 ? '–' : I18n.formatChange(-row.behind))))));

    container.replaceChildren(el('div', { class: 'page page-narrow results' },
      el('p', { class: 'results-eyebrow' }, game.quiz.title),
      el('h1', { class: 'results-title' }, ranking.isTie ? t('results.tieTitle') : t('results.winnerTitle')),
      el('p', { class: 'results-winner' }, winnerNames.join(' · ')),
      ranking.isTie ? el('p', { class: 'results-note' }, t('results.tieNote', { count: winnerNames.length })) : null,
      el('p', { class: 'results-note' }, allPlayed
        ? t('results.allPlayed', { total: Game.totalQuestions() })
        : t('results.endedEarly', { used: game.usedQuestions.length, total: Game.totalQuestions() })),
      el('div', { class: 'panel' }, table),
      el('div', { class: 'page-actions' },
        UI.button(t('results.mainMenu'), () => { discardGame(); App.go('menu'); }, 'secondary'),
        UI.button(t('results.newGame'), playAgain, 'primary'))));
  }

  // Goes to the setup screen with the same quiz and team names, ready for a rematch.
  function playAgain() {
    const prefill = { quizId: game.quiz.id, teamNames: game.teams.map(team => team.name) };
    discardGame();
    prepareSetup(prefill);
    App.go('setup');
  }

  return { getGame, setGame, discardGame, prepareSetup, renderSetup, renderGame, renderResults };
})();
