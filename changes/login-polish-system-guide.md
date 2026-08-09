---
taskId: login-polish-system-guide
type: minor
scope: login surface, demo entry, branding assets, system documentation
---
# Summary

Final polish on the first screen a reviewer sees, plus the study guide for
explaining the system. Two of the findings were defects rather than taste.

**The login background had never rendered in production.** It was a hotlinked
iStock URL, and this deployment's own CSP is `img-src 'self' data:`
(`vercel.json`) — so the request was blocked and the page fell back to flat
`#09111f` every time. The URL was also a 612px preview, which is not a licensed
asset. Replaced with a self-hosted vector built from the product's own colour
tokens.

**There was no favicon at all.** No `public/` directory, no `<link rel="icon">`,
so every tab showed the browser's default globe and `/favicon.ico` 404'd.

# User-visible behavior

**Login composition.** Hierarchy is now brand → purpose → sign-in form →
primary action → demo access → disclaimer. The demo buttons used to sit *above*
the fields, which put the shortcut ahead of the thing it shortcuts and made the
password form look optional; they are below the primary action now, in their own
labelled panel.

**The password field arrives empty.** It used to be pre-filled with the real
demo credential, one eye-toggle from being on screen during a screen-share. The
demo buttons make that convenience unnecessary.

**Demo access.** "Entrar como cliente" / "Entrar como abogado" each perform a
real sign-in — `auth.login` → `POST /api/v1/auth/login` → JWT → normal session —
and role routing resolves from the authenticated user, so the attorney lands on
the case inbox and the client on their workspace. **No credential was changed**:
the seeded pair from `backend/app/repositories/seed.py` is used as-is. There is
no demo branch anywhere in the auth path.

**Backdrop.** Same-origin SVG, `preserveAspectRatio="xMidYMid slice"`, so there
is no focal point to crop badly at any governed width. The scrim is graded for
two columns at `lg` and flat-and-heavier below, where the card owns the middle.

**Favicon and title.** A brand mark derived from the product's own identity —
the exact `HiSparkles` path `iconRegistry.brand` maps to, on the `.brand-mark`
gradient. The tab reads `Fresh Start`; it used to read
`Fresh Start | Preparación de bancarrota`, which put a tagline in a space
fifteen characters wide.

# Migration / compatibility

- No authentication contract, credential, hash or environment variable changed.
- `DemoAccess` is a new component; `LoginPage` composes it. The credentials moved
  there because it is the only thing that uses them.
- Two new `auth` locale keys (`demoAccessTitle`, `demoAccessHint`) in ES and EN.
- `frontend/public/` is new. Vite serves it at the root.

# Tests and evidence

New `frontend/e2e/login-demo-access.spec.ts`, 17 cases:

- each demo button issues exactly one `POST /auth/login`, writes a session, and
  lands the **correct role's** destination;
- a wrong password still fails and writes no session — the demo path is not a
  bypass;
- neither field is pre-filled;
- the backdrop is same-origin, and **decodes** (see below);
- the favicon resolves and decodes; the title is `Fresh Start`;
- at 320/390/768/1024/1440: no horizontal overflow, both demo controls inside
  the viewport at ≥40px tall, and — separately — each one is *scrolled to and
  clicked*, because `main` is `overflow-hidden` and "has a layout box" is not
  the same as "a person can press it";
- the English login carries both controls.

Screenshots: `frontend/test-results/login-evidence/`.

`docs/GLADE-DEMO-SYSTEM-GUIDE.md` — 21 sections written against the code, not
from memory: architecture, stack rationale, patterns, the AI layer, the tool
authorization boundary, deterministic calculations, evidence and RAG, i18n,
frontend layering, testing, observability, security, fallback, honest
limitations, an interview Q&A, a 60-second explanation, a five-minute
walkthrough, a glossary and a code map.

# Risks / limitations

- **My first backdrop was invalid XML and I shipped a test that passed over
  it.** The comment contained `--color-primary`; `--` is illegal inside an XML
  comment, so browsers discarded the whole document and it painted nothing. The
  asset still returned 200 with `content-type: image/svg+xml`, and my
  status-only assertion was green. Caught by screenshotting the page with the
  scrim hidden. The test now decodes both SVGs and asserts a non-zero intrinsic
  size — a status code says a file was served, not that it works.
- **I edited before registering the task manifest.** The governance hook should
  have refused those first edits; it did not, and I noticed only when a later
  write was denied. The manifest was registered retroactively with the full path
  list. Worth flagging as a hook gap, not excusing.
- The demo credentials remain in frontend source. They are public by design and
  printed in the login disclaimer, but they are still a literal in a bundle; a
  build-time variable would be tidier and was out of scope for a task told not
  to touch credential configuration.
- The favicon is SVG-only. Every browser this demo targets supports it, and
  declaring it stops the `/favicon.ico` 404 — but a very old client gets no
  icon. A `.ico` would mean a binary and a generation step.
- The backdrop motif is deliberately quiet. At `lg` it reads in the gap between
  the headline and the card; below `lg` the card covers it, which is correct
  since the form owns a phone screen.
