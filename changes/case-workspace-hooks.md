---
taskId: case-workspace-hooks
type: refactor
scope: CaseWorkspacePage decomposition
---
# Summary

`CaseWorkspacePage` was 640 lines: roughly 120 of logic and 380 of JSX, with the
stage vocabulary declared above both. Its rules — which stages a role can reach,
what an unknown URL falls back to, how a requirement is matched against an
attached document — were only reachable by mounting the whole page with a
router, an auth context, a workspace provider and a mocked API.

Four modules now hold that logic, and **not one line of JSX changed**. That was
the constraint: a refactor that also moves markup cannot be verified as
behaviour-preserving by the tests that already exist.

```text
pages/caseWorkspace/
  stages.ts                    the stage vocabulary and its URL mapping
  useCaseStageNavigation.ts    which stages exist, which one the URL opens, how to move
  useCaseAnalysis.ts           the backend read, plus completion and evidence derived from it
  useCaseEntries.ts            every write the page performs against a case
```

**`useCaseStageNavigation`** carries the three rules worth testing on their own:
the URL is the single source of truth so there is no `activeStage` state to
drift from it; an unknown *or role-inappropriate* slug falls back to the
overview rather than rendering nothing; and `attorney-review` is appended in
exactly one place, so the stepper's index always matches what renders.

**`useCaseAnalysis`** keeps the fetch, its cancellation, and the two readings
derived from the response together. Splitting them would mean either fetching
twice or threading the response back out to be re-derived. It also exposes
`requiredEvidencePresent`, which the documents stage renders per requirement —
previously derived twice, in the page and in the count, which is two places able
to disagree.

**`useCaseEntries`** collects the writes. The kind-to-list mapping existed twice
in the page — an if-chain in `addEntry` and five ternaries in `removeEntry` — so
adding a kind meant updating two places and only one of them would fail loudly.

# User-visible behavior

None. No JSX changed, no strings changed, no request changed. The page is 640 →
502 lines.

# Migration / compatibility

`CaseStage`, `BASE_STAGE_ORDER`, `SECTION_TO_STAGE`, `STAGE_TO_SECTION` and
`STAGE_LABEL_KEYS` are re-exported from `CaseWorkspacePage`, so the page's own
test and any future importer keep resolving them at the old path. Moving a
definition should not make every consumer learn where it went.

`useCaseEntries` takes the case id as a parameter rather than reading the
router, so it can be exercised without a route and cannot mutate a case other
than the one being rendered.

# Tests and evidence

- Frontend **94 → 117 tests** across 18 files, all passing. `lint` (0 errors),
  `build` and `npm run agent:flowbite` clean.
- `useCaseStageNavigation.test.tsx` — 11 cases: role-dependent stage sets, slug
  resolution including the two places the URL and internal vocabularies
  deliberately differ (`tasks`→`review`, `activity`→`tracking`), the fallback
  for an unknown slug, a client deep-linking into `attorney-review` landing on
  the overview, and navigation refusing to build a path without a case id.
- `useCaseEntries.test.tsx` — 12 cases, parametrized over all five entry kinds
  for both add and remove, plus that the other four lists are untouched, that
  removing by an id belonging to another kind removes nothing, and that toggling
  the urgent flag leaves the rest of the household alone.
- The page's existing tests were **not modified**, which is the actual evidence
  that behaviour is unchanged.
- ESLint warnings 9 → 6: moving the constants out of the page cleared three
  `react-refresh/only-export-components` reports.

# Risks / limitations

**The JSX is untouched and still ~380 lines in one return.** That is the next
step, not this one: extracting the header card and the per-stage sections into
components is a change whose correctness is visual, so it needs rendered
evidence at the governed widths rather than the passing unit suite this
extraction could lean on. Splitting logic and markup in one commit would have
left neither verifiable.

**`useCaseEntries(caseId ?? "")` is called before the page's redirect guards.**
Hooks must run unconditionally, and the guards below can still redirect away.
The empty id is never used — every consumer of these actions renders after those
guards — but it is a shape that would bite if a future caller used the actions
earlier. A hook that returns no-ops for an absent id would be tidier and is
worth doing when the JSX moves.

**`requiredEvidencePresent` still matches free text against translated labels
by word overlap.** The heuristic is unchanged and inherited; it is now in one
place and testable, which is the precondition for replacing it with a real
mapping between `required_evidence` and `EVIDENCE_TYPE_LABELS` — recorded as
still Spanish-only in `changes/live-run-defects.md`.
