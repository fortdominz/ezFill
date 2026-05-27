# Project Reflection -- EzFill

**Project type:** Chrome Extension + Full-stack backend
**Stack:** Chrome Extension (Manifest V3), React, FastAPI, MongoDB Atlas, Google OAuth, Embeddings API
**Live at:** Chrome Web Store (planned)
**Repo:** https://github.com/fortdominz/ezfill (not created yet)
**Started:** May 2026
**Built by:** Dominion Eze

> This doc is written live during the build. Every session updates it.
> Nothing is reconstructed from memory after the fact.

---

## Overview

EzFill is a Chrome extension that auto-fills job applications using a saved
profile of the user's answers. It learns from every application it encounters --
capturing new questions automatically -- and uses semantic matching to handle
different phrasings of the same question. The review phase ensures nothing is
submitted without explicit user confirmation.

---

## The Journey

### Why it was built
Applying to jobs means answering the same questions hundreds of times across
different platforms with slightly different wording. EzFill solves this at the
root -- answer once, fill everywhere, and verify before submitting.

### What was built
> Update this section as features are completed.

- [x] Chrome extension scaffold (Manifest V3) -- popup renders, content script active, service worker running
- [ ] Backend setup (FastAPI + MongoDB Atlas)
- [ ] Google OAuth (Gmail auth)
- [ ] Profile setup flow -- standard question bank
- [x] Content script -- detects job application pages (URL patterns + keyword count)
- [ ] Text field filling
- [ ] Semantic question matching (embeddings)
- [ ] Dropdown + checkbox handling (native + custom)
- [ ] New question capture -- auto-adds unseen questions to profile
- [ ] Review phase UI -- checkmark / wrong marker per field
- [ ] Profile-update vs. one-time scope on corrections
- [ ] Final confirmation prompt
- [ ] Chrome Web Store deployment

### How long it took
**Session 1 (scaffold):** ~2-3 hours. Most of that time was burned on three broken Vite
plugin approaches before finding the real root cause (see Hiccups).

### Deployment
> Fill in when deployed.

---

## What I Learned About [Core Technical Concept]

> Fill in during/after build.

---

## Architectural Decisions

**Why embeddings for question matching instead of string comparison**
Job applications ask the same questions in hundreds of different phrasings.
String matching would create duplicate entries, miss obvious matches, and
fill wrong answers into wrong fields. Semantic embeddings match by meaning,
not text -- "Are you authorized to work in the US?" and "Do you have legal
right to work in the United States?" resolve to the same saved answer.

**Why Manifest V3**
> Fill in -- current Chrome extension standard, service workers vs. background pages, etc.

**Why FastAPI backend instead of serverless**
> Fill in -- profile storage, embedding computation, question bank need a persistent backend.

**Why MongoDB Atlas for the question bank**
> Fill in -- Atlas Vector Search for embedding similarity queries, flexible schema for
> growing question bank.

**Why Google OAuth / Gmail**
> Fill in -- user identity, potential future: track which jobs were applied to via Gmail.

---

## Field Type Handling -- Technical Notes

### The custom dropdown problem
Workday, Greenhouse, Lever use custom `<div>`/`<ul>` dropdowns, not native `<select>`.
Approach: detect pattern, click to open, read rendered options, click match.
> Document what was actually built here as we go.

### Semantic matching threshold
- Above 0.85 similarity: fill silently
- 0.70 - 0.85: flag in review as "We matched this to [X] -- correct?"
- Below 0.70: treat as new question, capture and prompt user
> Update these thresholds based on real testing.

---

## Dependencies & Third-Party Services

| Dependency | What it does | What breaks if it changes |
|------------|-------------|--------------------------|
| Chrome Extension API (MV3) | Content scripts, DOM access, extension UI | Entire product |
| Google OAuth | User auth via Gmail | Login / identity |
| FastAPI | Backend API | All profile reads/writes |
| MongoDB Atlas | Profile + question bank storage | All data |
| Atlas Vector Search | Semantic similarity queries | Question matching |
| Embeddings API (TBD) | Convert questions to vectors | Semantic matching |

**Rate limits / costs:**
> Fill in during build.

---

## Performance & Optimization

> Fill in during build.

- Biggest concern going in: embedding computation latency -- should this happen
  client-side or backend? Likely backend to avoid bloating the extension.
- Custom dropdown detection on slow-rendering pages (Workday is infamous for this)

---

## Testing Approach

**Platforms to test against:**
- Workday (most common ATS)
- Greenhouse
- Lever
- LinkedIn Easy Apply
- Handshake (student-focused, relevant for Dominion's current phase)

> Document what was actually tested and what broke as we go.

---

## AI Collaboration -- One Instance Where It Worked Well

> Fill in during build.

---

## AI Collaboration -- One Instance Where It Fell Short or Surprised Me

> Fill in during build.

---

## What Surprised Me About Building and Testing This

> Fill in during build.

---

## The Moment It Clicked

> Fill in during build.

---

## Could This System Be Misused? How Would You Prevent It?

- Extension has access to page DOM on job application sites -- could theoretically
  read sensitive data on other pages. Manifest V3 permissions should be scoped tightly.
- Profile contains personal info (name, address, work history) -- backend must be secured.
- OAuth scope should be minimal -- only what's needed, not full Gmail read access.
> Expand as security decisions are made during build.

---

## What Would I Do Differently If I Rebuilt This From Scratch?

> Fill in after build.

---

## What I'd Tell My Past Self Before Starting

> Fill in after build.

---

## What's the One Thing This Project Taught Me That a Tutorial Never Would?

> Fill in after build.

---

## What Does v2 Look Like?

> Ideas to add as they come up during v1 build.

---

## As a System Architect

> Fill in during/after build.

- Content script (runs on page) ↔ Extension popup (UI) ↔ Background service worker ↔ FastAPI backend
- Data flow: page DOM → content script → backend match → fill → review → save

## As an AI Engineer

> Fill in during/after build.

- Semantic matching is the load-bearing AI feature
- Embedding model choice matters -- accuracy vs. latency vs. cost
- The threshold values are AI-tuned parameters, not hardcoded logic

---

## Portfolio Signal -- What This Project Demonstrates

- **Skills demonstrated:** Chrome Extension development, semantic search, embeddings,
  full-stack architecture, OAuth, MongoDB Atlas Vector Search
- **Problem-solving shown:** Using AI embeddings to solve a real UX problem
  (same question, different phrasing) that string matching can't handle
- **What you'd say in an interview:**
  > Fill in after build.
- **The one thing that makes this stand out:** Most autofill tools are dumb --
  they match by field name and break constantly. EzFill matches by meaning.

---

## Wins

- **Extension scaffold is live and rendering.** Popup shows correctly in Chrome with dark theme,
  logo, status dot, sign-in card. Content script active on every HTTPS page. Service worker running.
- **Vite multi-entry build works without any third-party extension plugin.** Pure rollupOptions
  with `@vitejs/plugin-react` is enough -- no CRXJS, no vite-plugin-web-extension.
- **Content script page detection is solid.** Two-layer detection: URL pattern matching (10 known
  ATS domains) + keyword frequency count (≥2 hits from 8 job-app keywords). Handles unknown ATS
  platforms automatically.

## Hiccups

- **Tried CRXJS vite-plugin v2.0.0 → blank popup.** Plugin is effectively deprecated, React render
  was silently dropped from the bundle.
- **Tried vite-plugin-web-extension → blank popup.** JSX transform not running. popup.js was 1.68KB
  instead of ~193KB. Same symptom, different plugin.
- **The actual root cause was embarrassingly simple:** `src/popup/popup.jsx` (the entry file with
  `createRoot().render()`) was never created. Only `Popup.jsx` (the component) existed.
  On Windows, the case-insensitive filesystem silently resolved `popup.jsx` → `Popup.jsx`.
  Vite bundled the component export with zero side effects. React never mounted.
  **Fix: created `src/popup/main.jsx` as the explicit mount entry and updated `popup.html`
  to reference it.**
- **`manifest.json` and `icons/` not included in dist.** Vite only copies the `public/` folder
  automatically. Fixed by moving manifest and icons into `public/`.
- **Disk space at 100%** (2.2MB free on C:). Blocked `npm install esbuild`. Built the fix
  entirely with already-installed Vite instead.

## Honest Score

> Fill in after build.
