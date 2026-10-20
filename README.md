# Happy Birthday, Shim 🎂🐶

Separate deployment of the pastel pixel-art birthday party (forked from
`happy-birthday-site`, fresh history, no photos). Plain HTML + CSS + vanilla
JS, no build step.

## Differences from the original

- Name defaults to **Shim** (no `?name=` needed; it still overrides).
- Password hint: *"What we love to do but banned by the Geneva
  Conventions"*. Stored as an FNV-1a hash (`ANSWER_HASH` in `js/lock.js`);
  input is upper-cased, exact match.
- Finishing all 7 party goals unlocks a **birthday letter** in the pixel
  frame instead of a photo collage. Edit `LETTER` / `LETTER_SIGN` in
  `js/ui.js`.
- No images (no collage, no Save-as-GIF card).
- `UNLOCK_AT` is Oct 19 2026, so the lock is in "IT'S THE BIG DAY!" mode.

Client-side surprise, not real security.

## Optional URL params

    ?age=25&msg=Custom%20wish%20card%20text&from=Alex

`msg` changes the candle wish card; `from` signs the card and the letter.

## Deploy

GitHub Pages from `main`, `/ (root)`.
