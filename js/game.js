// game.js
// The rules of the game. Pure logic: no screen drawing and no saving here,
// which makes these functions easy to test (see tests.html).
//
// The whole running game is ONE object, the "game state":
// {
//   version: 1,
//   status: "playing" | "finished",
//   startedAt, finishedAt,
//   quiz: { … },                 a frozen copy of the quiz; editing the quiz later never changes it
//   teams: [ { name, score } ],   in the order the facilitator entered them
//   turnOrder: [2, 0, 3, 1],      team indexes in playing order, drawn randomly ONCE at the start
//   turnIndex: 5,                 how many turns have been completed so far
//   usedQuestions: [ { cat, row, team, correct, points } ],
//   openQuestion: null | { cat, row, answerRevealed }
// }
//
// The team on turn is never stored separately. It is always calculated from
// turnOrder and turnIndex, so the two can never disagree.

const Game = (() => {
  const STATE_VERSION = 1;
  const MIN_TEAMS = 2;
  const MAX_TEAMS = 8;

  // Returns [0, 1, …, count-1] in random order (Fisher–Yates shuffle).
  // `random` can be replaced in tests to get a predictable order.
  function randomOrder(count, random) {
    const rand = random || Math.random;
    const order = [];
    for (let i = 0; i < count; i++) order.push(i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  // Creates a brand new game. Scores start at 0, all questions are unused,
  // and the playing order is drawn here – and nowhere else.
  function createGame(quiz, teamNames, random) {
    if (teamNames.length < MIN_TEAMS || teamNames.length > MAX_TEAMS) {
      throw new Error('Invalid number of teams');
    }
    return {
      version: STATE_VERSION,
      status: 'playing',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      quiz: Quiz.clone(quiz),
      teams: teamNames.map(name => ({ name, score: 0 })),
      turnOrder: randomOrder(teamNames.length, random),
      turnIndex: 0,
      usedQuestions: [],
      openQuestion: null
    };
  }

  function totalQuestions() {
    return Quiz.CATEGORY_COUNT * Quiz.QUESTIONS_PER_CATEGORY;
  }

  function currentTeamIndex(state) {
    return state.turnOrder[state.turnIndex % state.turnOrder.length];
  }

  function findUsed(state, cat, row) {
    return state.usedQuestions.find(u => u.cat === cat && u.row === row) || null;
  }

  function isQuestionUsed(state, cat, row) {
    return findUsed(state, cat, row) !== null;
  }

  function getQuestion(state, cat, row) {
    return state.quiz.categories[cat].questions[row];
  }

  // Opens a question. Not allowed if another question is open or this one was already played.
  function openQuestion(state, cat, row) {
    if (state.status !== 'playing' || state.openQuestion) return false;
    if (isQuestionUsed(state, cat, row)) return false;
    state.openQuestion = { cat, row, answerRevealed: false };
    return true;
  }

  function revealAnswer(state) {
    if (!state.openQuestion) return false;
    state.openQuestion.answerRevealed = true;
    return true;
  }

  // "Back to board" before evaluation: nothing is scored and the question stays available.
  function closeQuestion(state) {
    if (!state.openQuestion) return false;
    state.openQuestion = null;
    return true;
  }

  // Correct → add points, incorrect → subtract points.
  // Then the question is marked as used and the next team in the order is on turn.
  // Returns a summary of what happened, or null if evaluation was not allowed.
  function evaluateAnswer(state, correct) {
    const open = state.openQuestion;
    if (state.status !== 'playing' || !open || !open.answerRevealed) return null;
    if (isQuestionUsed(state, open.cat, open.row)) return null;

    const team = currentTeamIndex(state);
    const points = Quiz.pointsForRow(open.row);
    const change = correct ? points : -points;

    state.teams[team].score += change;
    state.usedQuestions.push({ cat: open.cat, row: open.row, team, correct: !!correct, points });
    state.openQuestion = null;
    state.turnIndex += 1;

    if (state.usedQuestions.length >= totalQuestions()) finishGame(state);
    return { team, change };
  }

  // Manual score correction. Does not change whose turn it is.
  function setScore(state, teamIndex, newScore) {
    if (!Number.isInteger(newScore) || !state.teams[teamIndex]) return false;
    state.teams[teamIndex].score = newScore;
    return true;
  }

  function finishGame(state) {
    state.status = 'finished';
    state.openQuestion = null;
    state.finishedAt = new Date().toISOString();
  }

  // Teams that currently have the highest score. Empty while all teams are equal
  // (at the start nobody is "leading").
  function leadingTeams(state) {
    const scores = state.teams.map(t => t.score);
    const best = Math.max(...scores);
    if (scores.every(s => s === best)) return [];
    return state.teams.map((t, i) => i).filter(i => state.teams[i].score === best);
  }

  // Final ranking, highest score first. Equal scores share a rank (1, 1, 3 …).
  // Returns { rows: [{ team, name, score, rank, behind }], winners: [team indexes], isTie }.
  function getRanking(state) {
    const rows = state.teams
      .map((t, i) => ({ team: i, name: t.name, score: t.score }))
      .sort((a, b) => b.score - a.score);
    const topScore = rows[0].score;
    rows.forEach((row, position) => {
      const previous = rows[position - 1];
      row.rank = previous && previous.score === row.score ? previous.rank : position + 1;
      row.behind = topScore - row.score;
    });
    const winners = rows.filter(r => r.rank === 1).map(r => r.team);
    return { rows, winners, isTie: winners.length > 1 };
  }

  // Checks a game state loaded from storage. Returns a clean state or null when it is damaged.
  function validateState(data) {
    if (!data || typeof data !== 'object' || data.version !== STATE_VERSION) return null;
    if (data.status !== 'playing' && data.status !== 'finished') return null;

    const quiz = Quiz.normalize(data.quiz);
    if (!quiz) return null;

    const teams = data.teams;
    if (!Array.isArray(teams) || teams.length < MIN_TEAMS || teams.length > MAX_TEAMS) return null;
    if (!teams.every(t => t && typeof t.name === 'string' && Number.isInteger(t.score))) return null;

    // turnOrder must contain every team index exactly once.
    const order = data.turnOrder;
    if (!Array.isArray(order) || order.length !== teams.length) return null;
    const sorted = [...order].sort((a, b) => a - b);
    if (!sorted.every((value, i) => value === i)) return null;

    if (!Number.isInteger(data.turnIndex) || data.turnIndex < 0) return null;

    const validPosition = (cat, row) =>
      Number.isInteger(cat) && Number.isInteger(row) &&
      cat >= 0 && cat < Quiz.CATEGORY_COUNT && row >= 0 && row < Quiz.QUESTIONS_PER_CATEGORY;

    if (!Array.isArray(data.usedQuestions)) return null;
    for (const u of data.usedQuestions) {
      if (!u || !validPosition(u.cat, u.row) || !Number.isInteger(u.team) || !teams[u.team]) return null;
    }

    let open = null;
    if (data.openQuestion) {
      const o = data.openQuestion;
      if (!validPosition(o.cat, o.row)) return null;
      open = { cat: o.cat, row: o.row, answerRevealed: !!o.answerRevealed };
    }

    return {
      version: STATE_VERSION,
      status: data.status,
      startedAt: data.startedAt || null,
      finishedAt: data.finishedAt || null,
      quiz,
      teams: teams.map(t => ({ name: t.name, score: t.score })),
      turnOrder: [...order],
      turnIndex: data.turnIndex,
      usedQuestions: data.usedQuestions.map(u => ({
        cat: u.cat, row: u.row, team: u.team, correct: !!u.correct, points: Quiz.pointsForRow(u.row)
      })),
      openQuestion: data.status === 'playing' ? open : null
    };
  }

  return {
    MIN_TEAMS,
    MAX_TEAMS,
    randomOrder,
    createGame,
    totalQuestions,
    currentTeamIndex,
    findUsed,
    isQuestionUsed,
    getQuestion,
    openQuestion,
    revealAnswer,
    closeQuestion,
    evaluateAnswer,
    setScore,
    finishGame,
    leadingTeams,
    getRanking,
    validateState
  };
})();
