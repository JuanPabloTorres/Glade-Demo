---
taskId: workspace-hygiene
type: refactor
scope: BankruptcyWorkspaceContext
---
# Summary

The case timeline was Spanish-only, and not by omission — by construction.

`BankruptcyWorkspaceContext` generated every timeline entry's title and
description as Spanish prose at the moment the event happened, then persisted
that prose into `localStorage`. `CaseTimeline` added three more hardcoded
Spanish strings for the status badge and formatted dates with a hardcoded
`"es-PR"`. So an English session read the entire case history in Spanish, and
switching language afterwards changed nothing at all, because the text was
already frozen in storage.

This is the same defect class `changes/live-run-defects.md` fixed on the backend
— Spanish-only copy reaching English sessions — on the surface nobody had
checked.

# What changed

**Timeline entries carry locale keys instead of prose.** `TimelineEvent` gains
optional `titleKey`, `descriptionKey` and `descriptionParams`; `CaseTimeline`
translates them at render. Persisting the key rather than the sentence is what
makes a language switch re-label the *whole history*, not just events created
afterwards.

`title`/`description` remain and are still populated, for two reasons that are
not the same reason: events persisted by an earlier build carry only the
literals and must keep rendering, and text a person actually typed is not
translatable — an attorney's status note is their words, stored verbatim with no
key. Translating it would be a mistranslation.

**The status-change entry interpolates the localized status label.** It used to
read `El expediente cambió a attorney review` — the raw enum with its
underscores stripped. It now stores the enum in `descriptionParams.statusKey`
and resolves it through the existing `workspace:status` catalogue at render, so
the same event reads correctly in either language.

**The seeded demo cases use the same keys.** They are synthetic demo data and
were free to stay Spanish, but their timeline is chrome the user reads, and a
bilingual demo whose case history is monolingual undercuts the demo.

**The provider's `useMemo` no longer lies about its dependencies.** It listed
only `[state.cases]` while closing over six functions that were recreated every
render, so the memo returned a stale value whose identity nevertheless changed
on every render — the worst of both. Each mutator is now a `useCallback` with
real dependencies and the memo lists all of them.

# User-visible behavior

An English session reads the case history in English: entry titles, descriptions,
the complete/current/upcoming badge, and the date format. Switching language
re-labels entries that already existed. A Spanish session is unchanged.

The demo's seeded chat transcripts stay Spanish. Deliberate: a transcript is a
record of what was said at a moment, and re-labelling it on a language switch
would rewrite history rather than translate an interface. The same reasoning
keeps the new-case welcome message translated once, at creation.

# Migration / compatibility

`TimelineEvent`'s new fields are optional, so events already in a user's
`localStorage` keep rendering through the literal fallback with no migration and
no storage-key bump. They will read in whatever language they were created in
until the case is reset — correct, since nothing recorded their intent.

# Tests and evidence

- Frontend **88 → 94 tests**, all passing; `lint`, `build` and `i18n:check`
  clean. Locale parity holds across 14 module files.
- Six new tests in `CaseTimeline.test.tsx` covering exactly the claims above:
  keyed entries render in the session language, an already-created entry
  re-labels on a language switch, a pre-keys entry falls back to its stored
  text, an attorney's note survives a language switch verbatim, the status label
  is resolved at render rather than at write, and the date follows the session
  locale.
- ESLint `react-hooks/exhaustive-deps` warnings drop from 2 to 1; total warnings
  10 → 9.

# Risks / limitations

**The date test has to switch two things.** `formatDate` resolves its locale
from `LANGUAGE_STORAGE_KEY` while `t` resolves from i18next, and they are only
ever in sync because `LanguageProvider` writes the key and calls
`changeLanguage` in the same effect. Anything that changes one without the other
gets a Spanish date under English copy. Worth collapsing to one source of truth,
but that is a change to the language layer, not to the timeline.

**The remaining nine ESLint warnings are untouched.** One is a real
`exhaustive-deps` in `AuthContext` (`initialSession`); it is outside this task's
ownership and auth is not somewhere to make a drive-by change. The other eight
are `react-refresh/only-export-components`, a fast-refresh DX rule that fires on
every file exporting both a provider and its hook. Silencing them means
splitting eight context files in two, which is a mechanical change with real
churn and no runtime effect.

**The workspace still lives in `localStorage`.** Nothing here changes that; see
`changes/` for the separate question of moving it behind the API, which needs
case CRUD endpoints that do not exist yet.
