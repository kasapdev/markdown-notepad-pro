/* =====================================================================
   Markdown Notepad Pro — app logic
   Multi-note management, autosave, live preview, toolbar, shortcuts.
   Classic script (no modules). Relies on window.WUS and window.MDParser.
   ===================================================================== */
(function () {
  'use strict';

  var W = window.WUS;
  var MD = window.MDParser;

  /* ----------------------------- Storage keys ----------------------------- */
  var K_NOTES = 'mdnote.notes';     // array of {id,title,body,updated}
  var K_ACTIVE = 'mdnote.active';   // id of last-open note
  var K_VIEW = 'mdnote.view';       // 'edit' | 'split' | 'preview'

  var WELCOME = [
    '# Welcome to Markdown Notepad Pro',
    '',
    'A distraction-free Markdown editor with **live preview**, _autosave_,',
    'and multi-note management — all running locally in your browser.',
    '',
    '## Quick start',
    '',
    '- Type in the editor; the preview updates instantly',
    '- Your work autosaves after a short pause',
    '- Create notes with the **New** button or `Ctrl/⌘ + N`',
    '',
    '> Tip: press `?` to see every keyboard shortcut.',
    '',
    '### Things you can write',
    '',
    '1. Headings, **bold**, _italic_, ~~strikethrough~~',
    '2. `inline code` and fenced blocks',
    '3. [Links](https://example.com) and ![images](url)',
    '',
    '```js',
    'function hello(name) {',
    '  return `Hello, ${name}!`;',
    '}',
    '```',
    '',
    '| Feature   | Supported |',
    '| --------- | :-------: |',
    '| Tables    | yes       |',
    '| Lists     | yes       |',
    '| Blockquote| yes       |',
    '',
    '---',
    '',
    'Happy writing!'
  ].join('\n');

  /* ----------------------------- App state ----------------------------- */
  var state = {
    notes: [],
    activeId: null,
    view: 'split'
  };

  /* ----------------------------- DOM refs ----------------------------- */
  var $ = function (id) { return document.getElementById(id); };
  var editor = $('editor');
  var preview = $('preview');
  var titleInput = $('titleInput');
  var noteList = $('noteList');
  var noteCount = $('noteCount');
  var searchInput = $('searchInput');
  var panes = $('panes');
  var saveIndicator = $('saveIndicator');
  var saveLabel = saveIndicator.querySelector('.save-label');
  var statWords = $('statWords');
  var statChars = $('statChars');
  var statRead = $('statRead');
  var statUpdated = $('statUpdated');
  var sidebar = $('sidebar');

  /* ============================ Note model ============================ */
  function load() {
    state.notes = W.store.get(K_NOTES, null);
    if (!Array.isArray(state.notes)) state.notes = [];
    state.activeId = W.store.get(K_ACTIVE, null);
    var v = W.store.get(K_VIEW, 'split');
    state.view = (v === 'edit' || v === 'preview' || v === 'split') ? v : 'split';

    /* Seed a welcome note on first run */
    if (state.notes.length === 0) {
      var seed = makeNote('Welcome to Markdown Notepad Pro', WELCOME);
      state.notes.push(seed);
      state.activeId = seed.id;
      persistNotes();
    }
    /* Ensure active id is valid */
    if (!getNote(state.activeId)) {
      state.activeId = state.notes[0] ? state.notes[0].id : null;
    }
  }

  function makeNote(title, body) {
    return { id: W.uid(), title: title || 'Untitled note', body: body || '', updated: Date.now() };
  }
  function getNote(id) {
    for (var i = 0; i < state.notes.length; i++) if (state.notes[i].id === id) return state.notes[i];
    return null;
  }
  function persistNotes() { W.store.set(K_NOTES, state.notes); }

  /* ============================ Rendering ============================ */
  function renderPreview(body) {
    try {
      preview.innerHTML = MD.render(body) || '<p class="md-empty">Nothing to preview yet.</p>';
    } catch (err) {
      preview.innerHTML = '<p class="md-empty">Preview error.</p>';
      W.toast('Could not render preview', 'error');
    }
  }

  /* Derive a display title from the note body (first heading or line) */
  function deriveTitle(body) {
    var lines = String(body).split('\n');
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (!t) continue;
      t = t.replace(/^#{1,6}\s+/, '').replace(/[*_`~>#-]/g, '').trim();
      if (t) return t.slice(0, 60);
    }
    return 'Untitled note';
  }

  function updateCounts(body) {
    var trimmed = body.trim();
    var words = trimmed ? trimmed.split(/\s+/).length : 0;
    var chars = body.length;
    var mins = Math.max(words ? 1 : 0, Math.round(words / 200));
    statWords.textContent = words.toLocaleString() + (words === 1 ? ' word' : ' words');
    statChars.textContent = chars.toLocaleString() + (chars === 1 ? ' character' : ' characters');
    statRead.textContent = mins + ' min read';
  }

  /* Render the sidebar note list, honoring the search filter */
  function renderList() {
    var q = (searchInput.value || '').trim().toLowerCase();
    noteList.innerHTML = '';

    var items = state.notes.slice().sort(function (a, b) { return b.updated - a.updated; });
    var shown = items.filter(function (n) {
      if (!q) return true;
      return (n.title + ' ' + n.body).toLowerCase().indexOf(q) > -1;
    });

    noteCount.textContent = String(state.notes.length);

    if (shown.length === 0) {
      var li = document.createElement('li');
      li.className = 'note-empty';
      li.textContent = q ? 'No notes match your search.' : 'No notes yet.';
      noteList.appendChild(li);
      return;
    }

    shown.forEach(function (n) {
      var li = document.createElement('li');
      li.className = 'note-item fade-in' + (n.id === state.activeId ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-selected', n.id === state.activeId ? 'true' : 'false');
      li.dataset.id = n.id;

      var snippet = n.body.replace(/[#>*_`~\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Empty note';

      var titleEl = W.el('div', { class: 'note-item-title truncate', text: n.title || 'Untitled note' });
      var metaEl = W.el('div', { class: 'note-item-meta truncate', text: snippet });
      var dateEl = W.el('div', { class: 'note-item-date', text: W.formatDate(n.updated) });
      li.appendChild(titleEl);
      li.appendChild(metaEl);
      li.appendChild(dateEl);

      li.addEventListener('click', function () { selectNote(n.id); });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNote(n.id); }
      });
      noteList.appendChild(li);
    });
  }

  /* ============================ Active note ============================ */
  function selectNote(id) {
    var n = getNote(id);
    if (!n) return;
    state.activeId = id;
    W.store.set(K_ACTIVE, id);
    titleInput.value = n.title || '';
    editor.value = n.body || '';
    renderPreview(editor.value);
    updateCounts(editor.value);
    statUpdated.textContent = 'Edited ' + W.formatDate(n.updated);
    renderList();
    setSaved(true);
  }

  function newNote() {
    var n = makeNote('Untitled note', '');
    state.notes.unshift(n);
    persistNotes();
    selectNote(n.id);
    editor.focus();
    W.toast('New note created');
  }

  function deleteActive() {
    var n = getNote(state.activeId);
    if (!n) return;
    var name = n.title || 'this note';
    if (!window.confirm('Delete "' + name + '"? This cannot be undone.')) return;
    state.notes = state.notes.filter(function (x) { return x.id !== n.id; });
    persistNotes();
    if (state.notes.length === 0) {
      newNote();
    } else {
      selectNote(state.notes[0].id);
    }
    W.toast('Note deleted');
  }

  /* ----------------------------- Autosave ----------------------------- */
  function setSaved(saved) {
    if (saved) {
      saveIndicator.classList.remove('is-saving');
      saveLabel.textContent = 'Saved';
    } else {
      saveIndicator.classList.add('is-saving');
      saveLabel.textContent = 'Saving…';
    }
  }

  var commit = W.debounce(function () {
    var n = getNote(state.activeId);
    if (!n) return;
    n.body = editor.value;
    /* If the user hasn't typed a custom title, derive it from the body */
    var typedTitle = titleInput.value.trim();
    n.title = typedTitle || deriveTitle(n.body);
    n.updated = Date.now();
    persistNotes();
    statUpdated.textContent = 'Edited ' + W.formatDate(n.updated);
    renderList();
    setSaved(true);
  }, 400);

  function onEdit() {
    setSaved(false);
    renderPreview(editor.value);
    updateCounts(editor.value);
    commit();
  }

  function onTitleEdit() {
    setSaved(false);
    commit();
  }

  /* ============================ View modes ============================ */
  function setView(view) {
    state.view = view;
    panes.dataset.view = view;
    W.store.set(K_VIEW, view);
    var btns = document.querySelectorAll('.view-switch button');
    for (var i = 0; i < btns.length; i++) {
      var sel = btns[i].dataset.view === view;
      btns[i].setAttribute('aria-selected', sel ? 'true' : 'false');
      btns[i].classList.toggle('is-active', sel);
    }
  }

  /* ====================== Toolbar / selection wrapping ====================== */
  /* Wrap (or unwrap) the current textarea selection with before/after markers */
  function wrapSelection(before, after, placeholder) {
    after = after == null ? before : after;
    var s = editor.selectionStart, e = editor.selectionEnd;
    var val = editor.value;
    var selected = val.slice(s, e) || (placeholder || '');
    var inserted = before + selected + after;
    editor.value = val.slice(0, s) + inserted + val.slice(e);
    /* Place selection around the inner text for easy overwriting */
    var innerStart = s + before.length;
    editor.focus();
    editor.setSelectionRange(innerStart, innerStart + selected.length);
    onEdit();
  }

  /* Apply a prefix to each line of the selection (lists, quotes, headings) */
  function prefixLines(prefixFn) {
    var s = editor.selectionStart, e = editor.selectionEnd;
    var val = editor.value;
    /* Expand to full lines */
    var lineStart = val.lastIndexOf('\n', s - 1) + 1;
    var lineEnd = val.indexOf('\n', e);
    if (lineEnd === -1) lineEnd = val.length;
    var block = val.slice(lineStart, lineEnd);
    var lines = block.split('\n');
    var out = lines.map(function (ln, idx) { return prefixFn(ln, idx); }).join('\n');
    editor.value = val.slice(0, lineStart) + out + val.slice(lineEnd);
    editor.focus();
    editor.setSelectionRange(lineStart, lineStart + out.length);
    onEdit();
  }

  function insertLink() {
    var s = editor.selectionStart, e = editor.selectionEnd;
    var label = editor.value.slice(s, e) || 'link text';
    wrapSelection('[' + label + '](', ')', '');
    /* move caret to the url placeholder */
    var pos = editor.selectionStart;
    editor.setSelectionRange(pos, pos);
    var v = editor.value;
    var urlPos = v.indexOf('](', pos) + 2;
    if (urlPos > 1) {
      editor.value = v.slice(0, urlPos) + 'https://' + v.slice(urlPos);
      editor.setSelectionRange(urlPos, urlPos + 8);
      onEdit();
    }
  }

  function insertCodeBlock() {
    var s = editor.selectionStart, e = editor.selectionEnd;
    var sel = editor.value.slice(s, e) || 'code';
    wrapSelection('```\n', '\n```', sel === 'code' ? 'code' : sel);
  }

  var TOOLBAR = [
    { id: 'bold', label: 'Bold', svg: '<path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/>', act: function () { wrapSelection('**', '**', 'bold text'); } },
    { id: 'italic', label: 'Italic', svg: '<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>', act: function () { wrapSelection('*', '*', 'italic text'); } },
    { id: 'strike', label: 'Strikethrough', svg: '<path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16"/>', act: function () { wrapSelection('~~', '~~', 'strikethrough'); } },
    { id: 'heading', label: 'Heading', svg: '<path d="M6 4v16M18 4v16M6 12h12"/>', act: function () { prefixLines(function (ln) { return /^#{1,6}\s/.test(ln) ? ln.replace(/^#+\s/, '') : '## ' + ln; }); } },
    { id: 'sep1', sep: true },
    { id: 'link', label: 'Link', svg: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', act: insertLink },
    { id: 'code', label: 'Inline code', svg: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>', act: function () { wrapSelection('`', '`', 'code'); } },
    { id: 'codeblock', label: 'Code block', svg: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 9l-2 3 2 3M15 9l2 3-2 3"/>', act: insertCodeBlock },
    { id: 'quote', label: 'Quote', svg: '<path d="M3 21c3-1 5-3 5-7V5H3v7h3M14 21c3-1 5-3 5-7V5h-5v7h3"/>', act: function () { prefixLines(function (ln) { return ln.indexOf('> ') === 0 ? ln.slice(2) : '> ' + ln; }); } },
    { id: 'sep2', sep: true },
    { id: 'ul', label: 'Bulleted list', svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>', act: function () { prefixLines(function (ln) { return /^[-*+]\s/.test(ln) ? ln.replace(/^[-*+]\s/, '') : '- ' + ln; }); } },
    { id: 'ol', label: 'Numbered list', svg: '<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 16.5A1.5 1.5 0 1 0 4.6 18.6L6 17"/>', act: function () { var i = 0; prefixLines(function (ln) { i++; return /^\d+[.)]\s/.test(ln) ? ln.replace(/^\d+[.)]\s/, '') : i + '. ' + ln; }); } }
  ];

  function buildToolbar() {
    var bar = $('toolbar');
    TOOLBAR.forEach(function (t) {
      if (t.sep) { bar.appendChild(W.el('span', { class: 'tb-sep' })); return; }
      var btn = W.el('button', {
        class: 'btn btn--icon btn--sm tb-btn',
        title: t.label,
        'aria-label': t.label,
        type: 'button'
      });
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">' + t.svg + '</svg>';
      btn.addEventListener('click', function () { t.act(); });
      bar.appendChild(btn);
    });
  }

  /* ============================ Import / export ============================ */
  function exportNote() {
    var n = getNote(state.activeId);
    if (!n) return;
    var name = (n.title || 'note').replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-') || 'note';
    W.download(name + '.md', n.body, 'text/markdown;charset=utf-8');
    W.toast('Exported ' + name + '.md');
  }

  function importFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var lastId = null;
    var pending = files.length;
    files.forEach(function (file) {
      W.readFile(file).then(function (text) {
        var base = file.name.replace(/\.(md|markdown|txt)$/i, '');
        var note = makeNote(deriveTitle(text) || base || 'Imported note', text);
        state.notes.unshift(note);
        lastId = note.id;
        persistNotes();
        pending--;
        if (pending === 0) {
          selectNote(lastId);
          W.toast(files.length === 1 ? 'Imported ' + file.name : 'Imported ' + files.length + ' files');
        }
      }).catch(function () {
        pending--;
        W.toast('Could not read ' + file.name, 'error');
      });
    });
  }

  /* ============================ Help modal ============================ */
  var helpModal = $('helpModal');
  function openHelp() { helpModal.hidden = false; $('helpClose').focus(); }
  function closeHelp() { helpModal.hidden = true; }

  /* ============================ Tab key in editor ============================ */
  function handleTab(e) {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    var s = editor.selectionStart, v = editor.value;
    editor.value = v.slice(0, s) + '  ' + v.slice(editor.selectionEnd);
    editor.setSelectionRange(s + 2, s + 2);
    onEdit();
  }

  /* ============================ Wiring ============================ */
  function wire() {
    editor.addEventListener('input', onEdit);
    editor.addEventListener('keydown', handleTab);
    titleInput.addEventListener('input', onTitleEdit);

    $('newNoteBtn').addEventListener('click', newNote);
    $('deleteBtn').addEventListener('click', deleteActive);
    $('exportBtn').addEventListener('click', exportNote);

    $('importBtn').addEventListener('click', function () { $('importInput').click(); });
    $('importInput').addEventListener('change', function (e) {
      importFiles(e.target.files);
      e.target.value = '';
    });

    searchInput.addEventListener('input', W.debounce(renderList, 150));

    /* View switch */
    document.querySelector('.view-switch').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-view]');
      if (btn) setView(btn.dataset.view);
    });

    /* Sidebar toggle (desktop collapse) */
    $('sidebarToggle').addEventListener('click', function () {
      document.querySelector('.app').classList.toggle('sidebar-collapsed');
    });

    /* Help modal */
    document.querySelector('[data-shortcut-help]').addEventListener('click', openHelp);
    $('helpClose').addEventListener('click', closeHelp);
    helpModal.addEventListener('click', function (e) {
      if (e.target === helpModal) closeHelp();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !helpModal.hidden) closeHelp();
    });

    /* Keyboard shortcuts */
    W.registerShortcut('mod+s', exportNote, 'Export current note as .md');
    W.registerShortcut('mod+b', function () { wrapSelection('**', '**', 'bold text'); }, 'Bold');
    W.registerShortcut('mod+i', function () { wrapSelection('*', '*', 'italic text'); }, 'Italic');
    W.registerShortcut('mod+k', insertLink, 'Insert link');
    W.registerShortcut('mod+n', newNote, 'New note');
    W.registerShortcut('?', openHelp, 'Show keyboard shortcuts');
  }

  /* ============================ Boot ============================ */
  function init() {
    load();
    buildToolbar();
    wire();
    setView(state.view);
    if (state.activeId) selectNote(state.activeId);
    renderList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
