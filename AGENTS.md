# Bufo Healing Sanctuary website: rules for any AI helper

You are helping Marla B. Lindner keep her website up to date. Marla is not a
programmer. She will ask for changes in plain words ("change the training date",
"add a new photo of the fire circle"). Your job: make the change cleanly, keep
the site beautiful, and never break anything.

## How this site is built

- Plain HTML and CSS. No framework, no build step, nothing to install.
- Pages (each is one file):
  - `index.html` = Home (/)
  - `pathways.html` = Sacred medicines and retreats (/pathways)
  - `journey.html` = The 4 steps, preparation, integration (/journey)
  - `about.html` = Church foundation, beliefs, prophecy, facilitators, stories (/about)
  - `training.html` = Facilitator training (/training)
  - `learn.html` = Workshops, videos, articles, research, journal (/learn)
  - `give.html` = Donate, scholarship, invest, shop (/give)
  - `connect.html` = Contact, FAQ, community, feedback (/connect)
- `styles.css` = the shared look for every page. `site.js` = scroll fades and the phone menu.
- `_template.html` = starting point for a brand-new page (copy it; never link to it).
- Photos live in `img/`. Use paths like `/img/name.jpg`.
- `og.jpg` = the picture that shows when the link is texted or shared.
- The site is hosted on Vercel. When a change is merged into `main`, it goes live in about 1 minute.

## When Marla asks for a change

1. Find every place the fact appears. Dates, prices, names, and links often
   appear on more than one page (for example the training date is on Home AND
   Training). Change all of them.
2. Change only what she asked for. Do not "improve" other parts.
3. Keep the same structure and classes the page already uses. Reuse existing
   components from `styles.css` (page-hero, subnav, split, prose, tiles,
   numbered, note, cta-band, btn-ember, btn-ghost). Do not add new frameworks.
4. In your summary, tell her in plain words what changed and on which pages.

## The look (do not change unless she asks)

- Colors: bone `#F5EFE4`, sand `#EADFCB`, pine green `#1E3A2D` / `#122319`,
  ember copper `#B4532A`, clay `#D49A6A`. Always use the CSS variables in
  `styles.css` (`var(--pine)` etc.), never new colors.
- Fonts: Fraunces (headings) and Figtree (body). No other fonts.
- Rounded pill buttons. Arch-shaped photo crops on some photos.
- Text must stay large and easy to read: body 19px, card text at least 17px,
  small labels at least 14px. Never shrink text or make it pale.

## Writing voice

- Warm, invitational, simple. Short sentences. Easy enough for a 6th grader.
- Speak to the reader as "you". Marla is the guide; the guest is the hero.
- No em dashes (the long dash). Use a period or a comma instead.
- Do not write "it's not X, it's Y" style sentences.
- Never invent testimonials, numbers, credentials, dates, or prices. If
  something is missing, ask Marla for it.

## Safety and legal language (very important)

- Never promise healing or cures. Keep words like "may", "often described as",
  and "many guests share".
- Keep every safety caveat already on the site (health screening, ECG for
  ibogaine, medication review, "not everyone is a fit", not medical advice).
- Keep the religious freedom / 501(c)(3) statement in every page footer.
- Never publish dosages or ceremony protocols.
- The Give page must never promise a financial return on an investment.

## Phones come first

- Most visitors are on phones. Nothing may run off the right edge.
- Never set a fixed width wider than a phone (use `min(300px, 100%)`).
- Never put `white-space: nowrap` on sentences.
- Keep the last two words of headings and paragraphs together with `&nbsp;`
  so no line ends with one lonely word.

## Photos

- Put new photos in `img/` with a short lowercase name (`fire-circle.jpg`).
- Make them about 1600px wide or smaller, JPG, under 400 KB.
- Always write a helpful `alt` description.

## Links that must keep working

- Discovery Call: https://calendly.com/bufohealingsanctuary/discovery-call-
- Zoom call: https://calendly.com/bufohealingsanctuary/discovery-zoom
- Intake waiver: https://form.jotform.com/251969428049066
- Facilitator training call: https://calendly.com/bufohealingsanctuary/bufo-facilitator-training-discovery-call
- Email: bufohealingsanctuary@gmail.com
