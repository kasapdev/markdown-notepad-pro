# Markdown Notepad Pro

Write Markdown with live preview, autosave, and multi-note management.

> A distraction-free, offline-first Markdown editor. Split-pane live preview, a custom dependency-free Markdown renderer, autosaving multi-note storage, and a full formatting toolbar — all in a single page that runs straight from disk.

## Overview

Markdown Notepad Pro is part of the **Web Utility Suite**. It pairs a Markdown editor with an instantly-rendered preview and a lightweight note manager. Everything is stored locally in your browser via `localStorage`, so your notes never leave your device and the app works with no network connection. The Markdown-to-HTML conversion is handled by a small, purpose-built parser that escapes all input before formatting, so untrusted note content can never inject markup or scripts.

## Features

- **Split editor** — Markdown source on the left, live-rendered HTML on the right. Toggle between Edit / Split / Preview; on narrow screens Split collapses to a single pane.
- **Self-contained Markdown parser** — no libraries. Supports ATX headings (`#`–`######`), **bold**, *italic*/_italic_, ~~strikethrough~~, `inline code`, fenced code blocks with language labels, nestable blockquotes, unordered and ordered lists with nesting, links (open in a new tab with `rel="noopener"`), images, horizontal rules, tables with alignment, and paragraphs with soft line breaks.
- **Injection-safe rendering** — all input is HTML-escaped first, then formatted; URLs are scheme-checked to block `javascript:` and unsafe data URIs.
- **Multi-note management** — sidebar list with create, select, rename, delete (with confirm), and live search/filter.
- **Autosave** — the active note saves automatically after you stop typing (~400 ms debounce) with a subtle Saving / Saved indicator. The last opened note is restored on launch.
- **Live counts** — word count, character count, and estimated reading time (~200 wpm).
- **Formatting toolbar** — Bold, Italic, Strikethrough, Heading, Link, Inline code, Code block, Quote, Bulleted list, Numbered list — all wrap or prefix the current selection.
- **Import / export** — export the current note as a `.md` file; import one or more `.md` files as new notes.
- **Polished UX** — premium glass UI, dark/light themes, responsive down to 360px, keyboard shortcuts, and a shortcuts help modal.

## Installation

No build step, no dependencies, no network calls.

```bash
git clone https://github.com/your-org/web-utility-suite.git
cd web-utility-suite/markdown-notepad
```

Then open `index.html` directly in your browser (double-click it, or `file://` it). That's it.

## Usage

1. Start typing in the editor — the preview updates live and the note autosaves.
2. Click **New** (or `Ctrl/⌘ + N`) to create a note; click any note in the sidebar to switch.
3. Rename a note by editing its title field, or let it derive automatically from the first heading.
4. Use the toolbar (or shortcuts) to format the current selection.
5. Search notes with the sidebar search box.
6. **Export** the current note as `.md`, or **Import** `.md` files as new notes.
7. Delete the active note with the trash button (you'll be asked to confirm).

## Keyboard Shortcuts

| Shortcut          | Action                       |
| ----------------- | ---------------------------- |
| `Ctrl/⌘ + S`      | Export current note as `.md` |
| `Ctrl/⌘ + B`      | Bold selection               |
| `Ctrl/⌘ + I`      | Italic selection             |
| `Ctrl/⌘ + K`      | Insert link                  |
| `Ctrl/⌘ + N`      | New note                     |
| `?`               | Show keyboard shortcuts      |

## Screenshots

> _Screenshots coming soon._

![screenshot](docs/screenshot-1.png)
![screenshot](docs/screenshot-2.png)

## Roadmap

- [ ] Export the rendered preview to HTML and PDF
- [ ] Tags and folders for organizing notes
- [ ] Synced scrolling between editor and preview
- [ ] Task-list checkboxes (`- [ ]` / `- [x]`)
- [ ] Optional GitHub-style syntax highlighting in code blocks

## License

MIT Licensed. Part of the Web Utility Suite.
