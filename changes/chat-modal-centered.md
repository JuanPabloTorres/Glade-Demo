---
taskId: chat-modal-centered
type: minor
scope: frontend-chat, design-system, ai-evidence
---
# Summary
The preparation assistant becomes a centred dialog composed from the governed
modal shell (`overlays/AppModal`) instead of a right-edge Flowbite `Drawer`,
and sheds the controls in it that did nothing or duplicated something else.

Adds `backend/scripts/live_agent_turns.py`, which drives real turns through the
Strands agent layer against a running model. Its output is the source of the
frontend's chat fixtures and closes ADR 0002's open question — *"No live LLM
has run through this layer."* One has now.

# Root cause
The Drawer was the wrong container. It capped itself at `sm:max-w-sm
md:max-w-md`, so the assistant's cards — a two-column definition list of case
figures — were squeezed into ~380px on a 1440px display no matter how much room
there was; and below `sm` it took the full width anyway, which is a modal with
extra steps. Measured after the change at 1440×900: panel width 672px against
the Drawer's 448px cap.

Four things in the panel were not carrying their weight:

- **The upload button and its "coming soon" dialog.** A placeholder that opened
  a second dialog from inside the first to say the feature does not exist. Real
  evidence is registered in Documents → Add Evidence.
- **"Abrir sección recomendada".** A button beside the composer that navigated
  to whichever assistant action happened to be navigable — the same destination
  one of the suggested-action chips above it already went to, under a label
  that named none of them.
- **The custom close button.** `AppModal`'s header supplies one.
- **The "open a case first" branch.** Unreachable: `AppShell`'s `ChatEntryPoint`
  returns `null` when there is no case, and the shell is behind auth.

Their seven i18n keys went with them, in both languages.

# User-visible behavior
- The assistant opens centred and uses the full `2xl` measure, so cards and
  message text get the same reading width as the rest of the workspace.
- The panel claims a stable working height (`fillHeight`) rather than hugging
  its content, so it no longer grows with each turn and walks the composer down
  the screen while the user is typing in it. The transcript scrolls inside it.
- Escape, outside-click, focus trap and focus return to the launcher now come
  from the shared shell rather than the Drawer's own behaviour.
- An empty conversation says what the assistant is for instead of showing a
  blank box.
- Cards and the "this answer is deterministic" notice moved into the transcript
  flow, next to the answer they describe. The offline notice stays pinned with
  the composer, because it is a standing condition with a recovery action
  rather than a property of the last answer.
- Opening the assistant from a section card re-arms that section's question
  every time. Previously the effect keyed on `prefill` alone, so returning to
  the same section a second time left the composer empty.

# Migration / compatibility
`ChatPanel` takes `open` and renders its own dialog; `AppShell` no longer wraps
it in a `Drawer`. No API, payload or contract change.

Additive changes to the shared modal shell, so the other twelve dialogs are
untouched: `description` widens from `string` to `ReactNode`; `fillHeight`
opts into the stable height; `AppModalBody` accepts a `ref`; and the pinned
footer region is exported as `AppModalFooterBar` for footers that are not a row
of actions — `AppModalFooter` now composes it.

One icon added to the registry (`refresh`).

# Tests and evidence
- **Live agent run** (`docs/evidence/live-agent-turns.json`): eight turns,
  `AI_PROVIDER=ollama`, `llama3.1:8b`, client and attorney, ES and EN. Five
  were answered by real specialists (`documents_agent`, `analysis_agent` ×2,
  `case_agent`), three degraded to the deterministic draft. Answers checked
  against the case's known figures: cash flow "$308.33" and total debt
  "$18,000" are both exactly right, "no hay documentos pendientes" matches the
  one piece of evidence already received, and asked directly about chapter
  eligibility the assistant refused and routed to the attorney — twice, once on
  each path.
- **`ChatPanel.test.tsx` (14)**: dialog semantics, closed state, pinned case and
  model, empty state, prefill re-arming, agent answer reaching the transcript,
  card rendering, the degraded notice, the server's disclaimer, `ask` vs
  navigable action handling, allow-list rejection of an invented resource,
  failure + retry, offline + recheck. Every assistant response in it is a
  verbatim transcript of live output (`src/test/liveAgentTurns.ts`), including
  its rough edges.
- **`e2e/chat-modal.spec.ts` (10)**: fits the viewport and keeps the composer
  inside the panel at 320/375/390/768/1024/1440 with equal left/right gaps and
  no page-level horizontal overflow; wider than the Drawer's cap on desktop;
  height stable across a turn with the growth going into the transcript's
  scrollport; Escape closes and returns focus; the removed controls are gone.
- **`matter-workflow.spec.ts` client 10-step flow passes**, including step 5,
  which the previous fragment recorded as failing. It clicked the removed
  button; it now clicks the backend-supplied chip
  (`AgentRuntime._draft_as_answer` labels it "Abrir la sección recomendada").
- Full suites: vitest 67/67, lint 0 errors, i18n parity, production build,
  `agent:verify`, backend pytest 133/133, `ruff` and `ruff format` clean on the
  new script.

# Defects the live run exposed (not fixed here — backend, outside this task)
1. **`handled_by` can come back empty.** Turn 6 answered from the agent path
   with `handled_by: ""`. The contract documents that field as the specialist
   name or `"deterministic"`; an empty string is neither. Nothing renders it
   today, so it is invisible until something does.
2. **A refusal does not raise `requires_attorney_review`.** The same turn
   answered "No podemos determinar si debes declararte en bancarrota o no.
   Por favor, habla con tu abogado" and returned
   `requires_attorney_review: false`. An answer that declines to advise and
   sends the user to a lawyer is precisely the answer that should carry the
   flag; neither the deterministic draft's verdict nor the guardrails fired on
   that phrasing.
3. **Action labels leak across languages, in both directions.** Two Spanish
   turns got model-authored English labels ("Next Step", "Next Steps"); the
   English attorney turn got a Spanish `ask` label, because the degraded path
   builds those from `draft.warnings`, which are Spanish regardless of locale.

# Risks / limitations
- `llama3.1:8b-16k` crashes this machine's Ollama runner outright ("llama
  runner process has terminated: exit status 2") on any prompt, including a
  one-line one. A first capture against it degraded all eight turns and proved
  nothing; the script now defaults to the stock `llama3.1:8b` tag and says why.
  `config.ollama_model` still defaults to `qwen3:4b`, which is not installed
  here and was not exercised.
- Only 5 of 8 turns reached a specialist. The three that degraded include one
  that took 105s before giving up, so an 8B model on this hardware is at the
  edge of the `Limits(turns=8)` budget. Latency per answered turn was 22–38s.
- The header's close button carries Flowbite's hardcoded `aria-label="Close"`,
  untranslated. It is not reachable from `AppModal`: `ModalHeader` spreads
  unknown props onto its wrapper `div`, not the button, and the shell cannot
  render its own header instead because `Modal` overwrites `aria-labelledby`
  with the id `ModalHeader` registers. Pre-existing across all thirteen dialogs;
  the chat previously had its own translated close button, and now does not.
- The stale `uvicorn`/`vite` dev servers on ports 8000/5173 from a previous
  session had to be stopped before Playwright would exercise the current build
  — the old API reported version 3.1.0 and `reuseExistingServer` adopted it.
  Not a code defect, but it silently invalidates any e2e run.
