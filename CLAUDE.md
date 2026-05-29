# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **See also:** the parent [`../CLAUDE.md`](../CLAUDE.md) documents both Iselia projects together (`iselia-web` and the `iselia-crm` it feeds leads into). Read it for the cross-project picture — especially the CRM's `PublicLeadCreateView` / `POST /api/public/leads/` endpoint that this site's contact form posts to.

## What this is

The Iselia corporate website: a single-page static marketing site for a tech consultancy. Vanilla HTML/CSS/JS, no framework, no bundler, no build step. Four source files plus a thin nginx Docker wrapper.

## Development

```bash
docker compose up          # serves on http://localhost:8080
```

Or just open `index.html` directly in a browser — there is no compile step. There are no tests, no linter, and no package manager.

## Files

- `index.html` — all markup, one page, anchor-linked sections (`#nosotros`, `#servicios`, `#metodologia`, `#contacto`).
- `styles.css` — all styles.
- `i18n.js` — translation strings + language switching. Loaded **before** main.js.
- `main.js` — all interactivity. Depends on globals from i18n.js.

## Things that will bite you

**Script load order is load-bearing.** `index.html` loads `i18n.js` then `main.js`. `main.js` reads the global `currentLang` (declared in i18n.js) to localise the contact-form button text and error messages. Reordering or deferring these scripts breaks the form. Both run as plain globals — no modules.

**The Dockerfile copies each asset by name.** `Dockerfile` has one `COPY` line per file. Adding a new CSS/JS/asset file means adding a matching `COPY` line, or it won't ship in the image even though it works locally.

**The contact form is coupled to iselia-crm.** `main.js` POSTs the lead to `LEADS_API` (`POST .../api/public/leads/`), which is the `PublicLeadCreateView` endpoint in the sibling `iselia-crm` project. Two consequences:
- `LEADS_API` is currently hardcoded to `http://localhost:9090/api/public/leads/` (the CRM's local nginx). **This must be updated before going live** — there's a `// update URL before going live` comment marking it.
- The JSON payload shape must match what the CRM serializer expects: the single `nombre` input is split into `first_name` / `last_name` on the first space; `employees`, `sector`, `notes` are omitted when empty; a hidden `campaign` field (`value="iselia"`) is always sent. Success is signalled by HTTP `201`.

## Internationalisation

`i18n.js` holds a `translations` object with `es` and `en` keys; `es` is the default and is persisted in `localStorage` under `iselia-lang`. `applyLang()` swaps content on language-button click and on `DOMContentLoaded`.

To add or change any user-facing text:
1. Add the key to **both** `es` and `en` in the `translations` object (a missing key is silently skipped, leaving stale text).
2. Wire it up in the HTML with one of:
   - `data-i18n="key"` → sets `innerHTML` (so values may contain markup like `<br>`, `<span class="grad">`).
   - `data-i18n-ph="key"` → sets the element's `placeholder`.
3. `page-title`, `meta-desc`, and the mobile menu `aria-label` are special-cased inside `applyLang()` rather than driven by attributes — update those branches if you rename those keys.

## Other interactivity in main.js

Navbar shadow on scroll, mobile menu toggle, smooth-scroll-to-contact (with focus), scroll-spy active nav link, and a reveal-on-scroll animation: elements with class `.reveal` get `.visible` added via `IntersectionObserver`. These rely on specific element IDs (`navbar`, `mobileToggle`, `navLinks`, `ctaLink`, `heroCta`, `contactForm`, etc.) — keep IDs in sync between `index.html` and `main.js`.
