// i18n.js
// Interface translations ("i18n" is short for "internationalization").
// Every text on screen is looked up by a key, e.g. t('game.revealAnswer'),
// in the dictionaries from the lang/ folder. Quiz content is NEVER translated.
//
// To add a language: copy lang/en.js to a new file (e.g. lang/de.js), translate the
// texts, and add a <script> tag for it in index.html. Nothing else needs to change.

const I18n = (() => {
  const DEFAULT_LANGUAGE = 'cs';
  let current = DEFAULT_LANGUAGE;
  const listeners = [];

  function dictionaries() {
    return window.TRANSLATIONS || {};
  }

  // Languages available in the app, e.g. [{ code: 'cs', name: 'Čeština' }, …]
  function languages() {
    return Object.keys(dictionaries()).map(code => ({ code, name: dictionaries()[code].name }));
  }

  function hasLanguage(code) {
    return Object.prototype.hasOwnProperty.call(dictionaries(), code);
  }

  function getLanguage() {
    return current;
  }

  // Translates a key. {placeholders} are filled from `params`:
  // t('game.onTurn', { team: 'Green' })  →  "On turn: Green"
  function t(key, params) {
    const dict = dictionaries()[current];
    let text = dict && dict.strings[key];
    if (text === undefined) {
      const fallback = dictionaries()[DEFAULT_LANGUAGE];
      text = fallback && fallback.strings[key];
      console.warn('Rescue: missing translation for "' + key + '" in "' + current + '"');
    }
    if (text === undefined) return key;
    if (params) {
      text = text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    }
    return text;
  }

  function setLanguage(code) {
    if (!hasLanguage(code)) code = DEFAULT_LANGUAGE;
    current = code;
    document.documentElement.lang = code;
    document.title = t('app.documentTitle');
    listeners.forEach(fn => fn(code));
  }

  // Lets other parts of the app react to a language change (e.g. redraw the screen).
  function onChange(fn) {
    listeners.push(fn);
  }

  // Formats numbers the local way (e.g. "1 200" in Czech). Negative numbers get a real minus sign.
  function formatNumber(value) {
    return new Intl.NumberFormat(current).format(value).replace('-', '−');
  }

  // "+300" or "−300"
  function formatChange(value) {
    return (value > 0 ? '+' : '') + formatNumber(value);
  }

  function formatDate(isoText) {
    const date = new Date(isoText);
    if (isNaN(date)) return '';
    return new Intl.DateTimeFormat(current, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  return { DEFAULT_LANGUAGE, languages, hasLanguage, getLanguage, setLanguage, onChange, t, formatNumber, formatChange, formatDate };
})();

// Short global name, because it is used everywhere.
const t = I18n.t;
