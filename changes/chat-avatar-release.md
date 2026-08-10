---
taskId: chat-avatar-release
type: patch
scope: Integrated chat avatar polish release
---
# Summary

Integrate the verified chat-avatar refinement and publish it as FreshStart
4.15.1 with consolidated release notes.

# User-visible behavior

The client and assistant chat avatars remain complete, distinct and accessible
at every governed viewport, and the transcript keeps its newest message below
the panel header without moving the document.

# Migration / compatibility

No migration, API change, persistence change or AI-provider configuration
change is required.

# Tests and evidence

- Contributor gate: 390 backend, 147 frontend and 124 Playwright tests pass.
- Architecture, Flowbite, contracts, Ruff, mypy, i18n, lint and build pass.
- Responsive visual evidence covers the five governed widths and both locales.

# Risks / limitations

The exact `agent:verify -- full` wrapper requires GNU Make and therefore stops
at `make verify` on Windows. Its commands were executed directly in Makefile
order and passed; the integrated release gate remains the publication authority.
