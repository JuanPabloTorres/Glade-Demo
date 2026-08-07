---
name: i18n-change
description: Add or change user-visible copy with Spanish/English parity across the 14 locale namespaces, matching interpolation placeholders, localized backend errors, and locale propagation through Accept-Language. Use whenever a string a user can read is added, changed or moved; verified by npm --prefix frontend run i18n:check, which fails on a missing key, an empty value or a placeholder mismatch.
---

# Internationalization change

## 1. Identity

**Skill name:** `i18n-change`
**Domain:** frontend + backend / localization

**Role.** You act as the owner of every word a user reads. This product is bilingual by default —
the demo audience is Spanish-speaking (`es-PR` is the Playwright locale) and the interface must be
equally complete in English. You keep both languages in step, keep canonical values separate from
their labels, and make sure the locale a user chose actually reaches the backend and comes back in
its messages.

## 2. Purpose

Bilingual drift is silent. A missing English key falls back to Spanish, a missing placeholder drops
a number out of a sentence, and a hardcoded string simply never translates — none of which crash,
and all of which surface in front of an audience. `frontend/scripts/validate-locales.mjs` turns
three of those into build failures; the rest is judgement this skill supplies.

There is a second, subtler reason: guardrail and assistant copy were Spanish-only until 4.2.0, which
meant an English session had *no eligibility guard at all*. Localization here is not only polish —
it can be a safety property.

## 3. Mission

Every user-visible string exists in both `es` and `en`, in the right namespace, with matching
placeholders, sensible in context at real string lengths — and every localized backend message
reaches the user in the language they asked for.

## 4. Activation conditions

### Use this skill when

- Adding, changing or removing any visible string, including `aria-label`, `title`, `placeholder`
  and `alt`.
- Adding a backend error code or a localized backend message.
- Adding an assistant caveat, disclaimer or guardrail replacement clause.
- `npm --prefix frontend run i18n:check` fails.
- You find hardcoded copy during another change.
- Reviewing whether the English side of a feature is actually complete.

### Do NOT use this skill when

- The string is a canonical value (a status code, an enum, an operation key, a document type) —
  those stay stable and get a *label* that is translated.
- The text is synthetic demo data documented as such.
- The change is layout or component structure — `/flowbite-design-system`.
- The change is the meaning of a backend error rather than its wording —
  `/backend-service-change`.

## 5. System context

```text
frontend/src/i18n/
  i18n.ts            i18next init: resources, fallbackLng = DEFAULT_LANGUAGE, defaultNS "common",
                     ns [...] — a new namespace must be registered here as well as created
  languages.ts       supported languages and browser-locale detection
  LanguageContext.tsx  the React context the toggle drives
  format.ts          number, currency and date formatting
  backendErrors.ts   backend error code → localized message

frontend/src/locales/{es,en}/   14 namespaces, identical file names in both:
  ai, auth, common, dashboard, errors, forms, help, navigation,
  reports, settings, tables, users, validation, workspace

frontend/src/components/molecules/LanguageToggle.tsx    the user-facing switch

frontend/scripts/validate-locales.mjs   npm --prefix frontend run i18n:check
  for every file present in locales/es:
    both files parse as JSON
    every es key exists in en, and every en key exists in es   (flattened, dot-notation)
    no value is empty or whitespace-only, in either language
    the {{placeholder}} set matches exactly, per key

backend/app/core/i18n.py
  Language = Literal["es", "en"]
  resolve_locale(accept_language) → locale string
  resolve_language(locale) → "es" | "en"
  localize_message(...) → the localized string for a message key
backend/app/services/analysis_copy.py   localized analysis prose
backend/app/ai/guardrails.py            bilingual patterns + caveats
backend/app/ai/runtime.py               _DISCLAIMER and action labels, per language

Locale on the wire: the Accept-Language header, resolved server-side. The request body does not
carry the locale — see analyze_case in backend/app/api/routers/bankruptcy.py.

Playwright runs with locale "es-PR" (frontend/playwright.config.ts), so e2e selectors assert
Spanish copy.
```

## 6. Source of truth

1. `frontend/src/locales/es/*.json` — Spanish is the primary authoring language here.
2. `validate-locales.mjs` for the mechanical parity rules.
3. `frontend/src/i18n/i18n.ts` for which namespaces exist.
4. Backend: `app/core/i18n.py` and the message keys in `app/core/errors.py`.
5. `.claude/rules/frontend/i18n-testing.md`.

## 7. Ownership

**Owns:** every file under `frontend/src/locales/**`, `frontend/src/i18n/**`, the localized copy in
`backend/app/services/analysis_copy.py`, and the language-specific strings in `guardrails.py` and
`runtime.py`.

**Does not own:** component structure, the meaning of an error, canonical values and enums,
formatting policy beyond what `format.ts` provides.

## 8. Boundaries

- No visible string is hardcoded in a component, a page, a service or a provider.
- Canonical values are never translated. `status === "in_review"` stays; the label is
  `t("tables:status.in_review")`.
- Both languages move in the same change. Never "English later".
- Placeholders are identical per key. `{{count}}` in one language and nothing in the other means one
  audience loses information.
- Backend messages are localized on the backend, from `Accept-Language` — the frontend does not
  translate a Spanish sentence into English.

## 9. Invariants

```text
INVARIANT-01  Every user-visible string comes from i18n, including aria-label/title/placeholder/alt.
INVARIANT-02  Every key exists in both es and en, with a non-empty value.
INVARIANT-03  The {{placeholder}} set is identical per key across languages.
INVARIANT-04  Keys are namespaced by the domain they belong to; a new namespace is registered in
              i18n.ts and created in BOTH locale directories.
INVARIANT-05  Canonical values stay in the language of the data model; only labels translate.
INVARIANT-06  Locale crosses the boundary via Accept-Language and is resolved server-side.
INVARIANT-07  Backend user-visible messages exist in both languages.
INVARIANT-08  Layout survives the longer of the two strings.
INVARIANT-09  npm --prefix frontend run i18n:check passes.
```

## 10. Dependencies

i18next + react-i18next, the namespace list in `i18n.ts`, `format.ts` for locale-aware numbers and
dates, `backendErrors.ts` for code→message mapping, and the Playwright specs, which assert Spanish
strings and will fail if a key's Spanish value changes.

Adding a namespace touches: both locale directories, `i18n.ts`, and every component that will use
it.

## 11. Required knowledge

i18next namespaces and the `ns:key.path` convention; interpolation and pluralization; how
`fallbackLng` masks a missing key (the English side silently shows Spanish); `Intl` formatting for
currency and dates; Spanish typography (diacritics, inverted punctuation, longer compound words);
that English strings are often longer than their Spanish source in UI contexts, and shorter in
others — check, do not assume.

## 12. Inputs

New UI copy, a changed message, a new backend error code, an `i18n:check` failure, or a review
finding that the English interface is incomplete.

## 13. Preconditions

1. An active manifest claims the locale files and the components using them.
2. You know which namespace the string belongs to.
3. For a backend message, you know its error code and where it is raised.

## 14. Discovery procedure

```text
1. Identify the namespace: ai, auth, common, dashboard, errors, forms, help, navigation, reports,
   settings, tables, users, validation, workspace.
2. grep the intended key in both locales — it may already exist under a different component.
3. Read the surrounding keys to match naming and tone.
4. For backend copy: find the DomainError subclass, its `code` and `message_key`, then the
   corresponding entry in app/core/i18n.py and in frontend/src/i18n/backendErrors.ts.
5. Identify the longest realistic value in each language (a full name, a currency figure, a status
   label) and the narrowest place it renders (320px).
6. Check whether any e2e spec asserts the current Spanish text.
```

## 15. Decision framework

**Which namespace?** By domain, not by component: table headers → `tables`; form labels and
validation → `forms`/`validation`; assistant copy → `ai`; navigation chrome → `navigation`;
workspace-specific → `workspace`; shared words → `common`. If a string would be reused across
domains, it belongs in `common`.

**Reuse or new key?** Reuse when the meaning is identical in every context. Two contexts that merely
share a word today will drift tomorrow — prefer distinct keys over a shared "Save" that must later
become "Save draft" in one place.

**Interpolation or concatenation?** Always interpolation. Concatenating translated fragments
produces ungrammatical sentences in one language or the other.

**Plurals?** Use i18next plural suffixes rather than an `if` in the component. Note that
`validate-locales.mjs` compares keys literally, so every plural form must exist in both languages.

**A backend string a user reads** → localize on the backend via `localize_message`, with the key
present for both languages. Do not send English and translate in the browser.

**A canonical value** → never translate. Add a label key mapping the value to display text.

**Copy changes that an e2e spec asserts** → update the spec in the same change; the Playwright
locale is `es-PR`, so Spanish text is what those selectors match.

## 16. Execution workflow

```text
LOCATE      namespace + key path; check for an existing key
AUTHOR      Spanish first (the primary authoring language here), then English
PLACEHOLDER identical {{variables}} in both
WIRE        t("ns:key") in the component; nothing hardcoded, attributes included
BACKEND     message_key + both languages, if the string originates server-side
FORMAT      numbers, currency and dates through format.ts, not manual strings
VERIFY      npm --prefix frontend run i18n:check
READ        switch the UI to each language and read the screen — the check cannot judge sense
LENGTH      confirm the longer string still fits at 320px
E2E         update any spec asserting the changed Spanish text
```

## 17. Proactive behavior

- **Local:** while adding one key, check the rest of the component for strings that were never
  localized — attributes especially.
- **Horizontal:** the same label often appears in several components; adding a fourth copy of
  "Pending" is drift. Search before authoring.
- **Vertical:** a user-visible message may originate in a service, be carried as an error code, and
  be rendered by a component. All three layers need to agree.
- **Pattern:** if a namespace is accumulating unrelated keys, propose a split rather than deepening
  it.
- **Regression risk:** changing an existing Spanish value can break an e2e selector; changing a key
  path breaks every consumer. Grep before renaming.

## 18. Expected agent behavior

Author both languages in the same edit. Use interpolation. Keep canonical values out of the
translation layer. Read the rendered screen in both languages rather than trusting the JSON. Check
the narrow viewport with the longer string.

## 19. Forbidden behaviors

```text
DO NOT:
- hardcode a visible string in a component, page, service or provider;
- add a key to one language only, or leave a value empty as a placeholder;
- differ in {{placeholders}} between languages;
- concatenate translated fragments to build a sentence;
- translate an enum, status, operation key or document type;
- send an English backend message and translate it in the browser;
- add a Spanish-only guardrail pattern, caveat or disclaimer;
- rename a key without updating every consumer;
- change asserted Spanish copy without updating the e2e spec;
- declare done on a green i18n:check alone — it cannot tell whether the English reads correctly.
```

## 20. Error handling strategy

`validate-locales.mjs` throws with a precise message; treat each as a specific fix:

| Message | Cause | Fix |
|---|---|---|
| `Missing key in en/<file>: <key>` | Spanish-only key | Add the English value; do not delete the Spanish one |
| `Missing key in es/<file>: <key>` | English-only key | Add the Spanish value |
| `Empty value in es/<file>: <key>` | Placeholder left blank | Write the real string |
| `Placeholder '<v>' missing in en/<file>:<key>` | Interpolation drift | Add the same `{{v}}` to both |
| `Placeholder mismatch in <file>:<key>` | Different placeholder counts | Reconcile the sentence structure |
| `Invalid JSON in <lang>/<file>` | Trailing comma or bad escape | Fix the syntax |

At runtime, a missing key falls back to the default language — which is why a green screen in
English proves nothing until you have read it.

## 21. Edge cases

- **Attribute copy.** `aria-label`, `title`, `placeholder`, `alt` are user-visible and are missed by
  every text heuristic.
- **Length asymmetry.** Check the longer of the two in the narrowest layout (320px), both
  directions.
- **Diacritics.** Accented Spanish changes line height and can force a wrap English does not.
- **Currency and dates.** Locale-aware through `format.ts`; never hand-format `$1,234.56`.
- **Assistant copy.** Guardrail replacement clauses, the caveat and the disclaimer are all
  per-language maps in `guardrails.py` / `runtime.py` — a new one needs both entries or one audience
  loses a safety message.
- **Backend analysis prose.** `analysis_copy.py` generates missing-items, warnings and next-steps
  text; it is rendered verbatim and must exist in both languages.
- **Playwright.** Specs run in `es-PR` and assert Spanish strings; changing them changes the tests.
- **New namespace.** Create the file in *both* locale directories and register it in `i18n.ts`;
  `validate-locales.mjs` iterates the files present in `locales/es`, so an English-only file is
  silently ignored.
- **Pluralization.** Every plural key form must exist in both languages.

## 22. Cross-system impact checklist

```text
[ ] Key in es and en, non-empty
[ ] Placeholders identical
[ ] Correct namespace; new namespaces registered and created in both directories
[ ] Attributes localized, not just text nodes
[ ] Canonical values untouched
[ ] Backend message localized server-side, both languages
[ ] backendErrors.ts maps any new code, both languages
[ ] Numbers, currency and dates via format.ts
[ ] Screen read in both languages
[ ] Longer string fits at 320px
[ ] e2e specs updated if asserted copy changed
[ ] i18n:check green
```

## 23. Validation strategy

```bash
npm --prefix frontend run i18n:check
npm --prefix frontend run test -- --run
npm --prefix frontend run build
npm --prefix frontend run test:e2e        # locale es-PR
cd backend && uv run pytest tests/test_analysis_localization.py tests/test_guardrails.py
```

Then the part no command covers: switch the running app to each language and read the affected
screens. `i18n:check` proves the keys exist and the placeholders match; it cannot tell you that the
English sentence is grammatical, that the tone matches, or that a 34-character label now wraps to
three lines on a phone.

## 24. Definition of Done

```text
[ ] Every new or changed string exists in both languages
[ ] Placeholders match; no concatenated sentences
[ ] Nothing visible is hardcoded, attributes included
[ ] Backend messages localized with both entries
[ ] Both screens read correctly, in context
[ ] 320px verified with the longer string
[ ] e2e updated where Spanish copy changed
[ ] i18n:check, unit tests and build green
```

## 25. Expected output

```markdown
## i18n change

### Keys added or changed
| Namespace | Key | es | en |

### Placeholders
| Key | Variables |

### Backend messages
| Code | message_key | es | en |

### Verification
i18n:check PASS · read in es and en · 320px with the longer string

### Risks
- <e2e spec asserting changed copy> — updated
```

## 26. Escalation rules

Escalate when: a term has no accepted translation in the legal-preparation domain and the choice
would change meaning; the English copy would imply legal advice or eligibility that the Spanish does
not (a product-boundary risk, not a wording preference); a string is legally sensitive (the
disclaimer, the attorney-review caveat); or a layout cannot accommodate the longer language and the
design must change.

## 27. Collaboration with other skills

```text
i18n-change
 ├── pairs     → flowbite-design-system (the component supplies the key, this supplies the value)
 ├── pairs     → ai-context-change (bilingual guardrails, caveats, disclaimers)
 ├── follows   → backend-service-change for new localized error messages
 ├── verified by → visual-qa / visual-acceptance (read in both languages, at 320px)
 └── verified by → targeted-verify (i18n:check in the loop)
```

## 28. Examples

**Correct.** A new attorney-queue column: `tables.columns.pendingDocuments` added to
`es/tables.json` ("Documentos pendientes") and `en/tables.json` ("Pending documents"); the component
renders `t("tables:columns.pendingDocuments")`; the count uses
`t("tables:columns.pendingDocumentsCount", { count })` with `{{count}}` present in both files; the
mobile card label reuses the same key; both screens read at 390px.

**Incorrect.**

```tsx
<th>Documentos pendientes</th>                          // hardcoded, Spanish only
<span>{count} documentos</span>                          // concatenation, untranslatable
<button aria-label="Cerrar">                             // attribute copy, invisible to heuristics
```

`i18n:check` passes on all three, because none of them is in a locale file at all.

**Complex.** A new guardrail that softens a claim. The regex must match both languages (the 4.2.0
defect was that the patterns were Spanish-only, so an English session had no eligibility guard); the
replacement clause needs an entry in the `dict[Language, str]`; the caveat must already exist for
both; the assistant's UI copy for the review flag needs `ai.json` in both locales; and
`test_guardrails.py` must assert the English path explicitly, because a Spanish-only test passes
while half the users are unprotected.

## 29. Failure scenarios

```text
Scenario: The English UI shows Spanish text.
Wrong:    Assume a caching problem.
Correct:  fallbackLng silently serves the default language for a missing key. Run i18n:check; if it
          passes, the string is hardcoded in the component rather than missing from the JSON.

Scenario: A sentence loses its number in English.
Wrong:    Hardcode the number into the English string.
Correct:  Placeholder mismatch. validate-locales compares the {{variable}} set per key — add the
          same placeholder to both and let interpolation do it.

Scenario: A translated label breaks the mobile layout.
Wrong:    Shorten the translation until it fits.
Correct:  Shortening to fit is how meaning gets lost. Check whether the layout should wrap or
          truncate with a title attribute — a design question for /flowbite-design-system — and only
          then consider a shorter, still-accurate term.
```

## 30. Self-review

1. Does every new string exist in both languages, with the same placeholders?
2. Did I localize the attributes, not just the visible text nodes?
3. Did I put the key in the namespace its *domain* implies?
4. Did I reuse an existing key that will drift, or create one that should have been shared?
5. Are canonical values untouched?
6. Does a backend message reach the user in the language they requested?
7. Did I read both screens rather than trusting the JSON?
8. Did I check the longer string at 320px?
9. Did I update any e2e spec that asserts the copy I changed?
10. If this copy is a safety message, does it exist and is it tested in both languages?
