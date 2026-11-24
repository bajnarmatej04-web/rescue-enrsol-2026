// ui-common.js
// Small helpers shared by all screens: building HTML elements, dialogs,
// short notifications ("toasts") and file download/upload.

const UI = (() => {
  // Creates an element. Example:
  //   el('button', { class: 'btn', type: 'button', onclick: save }, t('editor.save'))
  // Children may be text, elements, arrays of them, or null (ignored).
  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else if (['value', 'checked', 'disabled', 'hidden', 'selected'].includes(key)) node[key] = value;
        else node.setAttribute(key, value === true ? '' : String(value));
      }
    }
    append(node, children);
    return node;
  }

  function append(parent, children) {
    for (const child of children) {
      if (child === null || child === undefined || child === false) continue;
      if (Array.isArray(child)) append(parent, child);
      else if (child instanceof Node) parent.appendChild(child);
      else parent.appendChild(document.createTextNode(String(child)));
    }
  }

  // A standard button. variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'correct' | 'incorrect'
  function button(label, onClick, variant, extraProps) {
    return el('button', Object.assign({ type: 'button', class: 'btn btn-' + (variant || 'secondary'), onclick: onClick }, extraProps), label);
  }

  // ---------- Screens ----------

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(section => {
      section.hidden = section.id !== 'screen-' + name;
    });
    document.body.dataset.screen = name;
    return document.getElementById('screen-' + name);
  }

  // Moves keyboard / screen-reader focus to the main heading of a newly opened screen.
  function focusHeading(container) {
    const heading = container.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  // ---------- Dialogs ----------
  // Uses the browser's built-in <dialog> element. Each dialog returns a Promise,
  // so code can simply wait for the answer: if (await UI.confirm(…)) { … }

  let resolveOpenDialog = null;

  // options: { title, message, content (element), buttons: [{ label, value, variant }], enterValue }
  function openDialog(options) {
    const dialog = document.getElementById('dialog');
    if (resolveOpenDialog) finishDialog(null);

    dialog.replaceChildren();
    const titleId = 'dialog-title';
    dialog.setAttribute('aria-labelledby', titleId);

    const actions = el('div', { class: 'dialog-actions' },
      options.buttons.map(b => button(b.label, () => finishDialog(b.value), b.variant)));

    append(dialog, [
      el('h2', { id: titleId, class: 'dialog-title' }, options.title),
      options.message ? el('p', { class: 'dialog-message' }, options.message) : null,
      options.content || null,
      actions
    ]);

    // Pressing Enter inside a text field confirms the dialog.
    if (options.enterValue !== undefined) {
      dialog.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            finishDialog(options.enterValue);
          }
        });
      });
    }

    return new Promise(resolve => {
      resolveOpenDialog = resolve;
      dialog.showModal();
      const firstInput = dialog.querySelector('input, textarea');
      const primary = dialog.querySelector('.btn-primary, .btn-danger');
      (firstInput || primary || actions.lastChild).focus();
    });
  }

  function finishDialog(value) {
    const dialog = document.getElementById('dialog');
    const resolve = resolveOpenDialog;
    resolveOpenDialog = null;
    if (dialog.open) dialog.close();
    if (resolve) resolve(value);
  }

  // Asks a yes/no question. Resolves to true or false.
  async function confirm(options) {
    const value = await openDialog({
      title: options.title,
      message: options.message,
      content: options.content,
      buttons: [
        { label: options.cancelLabel || t('common.cancel'), value: false, variant: 'secondary' },
        { label: options.confirmLabel || t('common.confirm'), value: true, variant: options.danger ? 'danger' : 'primary' }
      ]
    });
    return value === true;
  }

  function alert(options) {
    return openDialog({
      title: options.title,
      message: options.message,
      buttons: [{ label: t('common.ok'), value: true, variant: 'primary' }]
    });
  }

  function setupDialog() {
    const dialog = document.getElementById('dialog');
    // Escape key closes the dialog like "Cancel".
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      finishDialog(null);
    });
  }

  // ---------- Toasts (short notifications) ----------

  function toast(message, kind) {
    const region = document.getElementById('toast-region');
    const item = el('div', { class: 'toast toast-' + (kind || 'info') }, message);
    region.appendChild(item);
    // Keep at most 3 notifications on screen; drop the oldest.
    while (region.children.length > 3) region.firstChild.remove();
    setTimeout(() => item.classList.add('toast-hide'), 3200);
    setTimeout(() => item.remove(), 3700);
  }

  // ---------- Files ----------

  function downloadTextFile(fileName, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: fileName });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Opens the system file picker and resolves with the chosen File (or null).
  function pickFile(accept) {
    return new Promise(resolve => {
      const input = el('input', { type: 'file', accept, hidden: true });
      input.addEventListener('change', () => {
        resolve(input.files[0] || null);
        input.remove();
      });
      input.addEventListener('cancel', () => {
        resolve(null);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  return { el, button, showScreen, focusHeading, openDialog, confirm, alert, setupDialog, toast, downloadTextFile, pickFile };
})();

const el = UI.el;
