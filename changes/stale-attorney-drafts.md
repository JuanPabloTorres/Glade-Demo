---
taskId: stale-attorney-drafts
type: patch
scope: Attorney dashboard authorization-aligned case list
---
# Summary

Align the attorney dashboard and case route with the server-side ownership rule by excluding legacy browser-only cases whose owner is the signed-in attorney.

# User-visible behavior

- Old empty drafts named for Lic. Andrea Morales no longer appear in the attorney queue, counts, filters, or Open actions.
- A bookmarked URL for one of those invalid drafts returns to the dashboard without requesting financial analysis or showing the refresh error.
- Client-owned demo cases remain available for review.

# Migration / compatibility

No stored data is rewritten. The invalid localStorage rows are ignored at the authorization boundary, preserving legitimate client cases and keeping backend ownership enforcement unchanged.

# Tests and evidence

- Red/green dashboard regression test covering a valid client case beside a legacy attorney-owned draft.
- Red/green workspace-route regression test proving redirect without an analyze request.
- Targeted frontend tests, lint, build, and release verification.

# Risks / limitations

Legacy invalid rows remain in browser storage but are unreachable. This avoids destructive client-side migration while preventing the failing API path.
