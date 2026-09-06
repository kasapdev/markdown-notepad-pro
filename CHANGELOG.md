# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.1] - 2026-09-06

### Fixed

- Fixed the "Insert link" toolbar button and `Ctrl/⌘ + K` shortcut, which produced broken Markdown: selecting text and inserting a link duplicated the selected text into the URL slot (e.g. selecting "example" produced `[example](example)` instead of a link ready for a URL), and in every case the intended `https://` placeholder was never inserted or selected due to a caret-position bug in the URL-locating logic. `insertLink()` in `js/app.js` now builds the link markup directly and reliably places `[label](https://)` with `https://` pre-selected for easy overwriting, for both the with-selection and no-selection cases.
- Fixed mojibake (double-encoded UTF-8) text in `index.html` that rendered as garbled characters in the browser instead of the intended punctuation: the em dash in the page `<title>` and meta description, the ellipsis in the search and editor placeholders, the middle dot in the word-count/footer separators, and the ⌘ symbol in the keyboard-shortcuts modal.
