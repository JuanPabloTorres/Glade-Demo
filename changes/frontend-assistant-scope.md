---
taskId: frontend-assistant-scope
type: minor
scope: assistant scope from UI
---
# Summary

The frontend now sends `assistant_scope`, so the attorney's cross-case
capability is reachable from the application rather than only from an API
client. That was the last piece of R3 that a user could not exercise.

# Derived from the route, not from the words

`ChatPanelContext` already resolves `routeContext`, so the scope falls out of it:
an attorney standing outside a case is asking a portfolio question; anyone inside
a case workspace is asking about that case; a client has one case and never has a
queue.

Classifying the message text instead would have to separate *"¿qué le falta a
este caso?"* from *"¿cuáles necesitan atención?"*, and would get both wrong in the
phrasings that matter most. The UI already knows the answer for free.

# It selects a scope; it never claims one

A scope is a word — `"case"` or `"portfolio"`. No case ids, no attorney id, no
ownership claim, and a test asserts exactly that, because anything richer would
be the frontend asserting what it may see.

The server pairs it with the authenticated role before it means anything: a
client sending `"portfolio"` is ignored, and the collection is resolved
server-side from the session. So a wrong value here can only pick between scopes
the session already allows — it can neither widen nor narrow authorization.

The API client defaults to `"case"`, matching the backend default, so a caller
with no opinion never widens the scope by accident.

# A bug caught before it shipped

The first version placed the `assistantScope` memo above the `routeContext` it
depends on. `const` is hoisted into the temporal dead zone rather than
initialised, so that would have thrown at runtime on the first render — a build
that typechecks and a page that does not load. Moved below its dependency.

# User-visible behavior

An attorney asking about their queue from the dashboard now reaches the
portfolio specialist. Inside a case, the assistant behaves exactly as before.
Clients are unchanged.

# Tests and evidence

- Frontend **121 → 124 tests**, 18 files. `lint` 0 errors, `build`,
  `i18n:check` and the Flowbite check clean.
- Three tests: a case workspace sends `case`, the attorney queue sends
  `portfolio`, and the value carries nothing but the word.

# Risks / limitations

**`resolveAssistantScope` is not unit-tested on its own.** It is exercised
through `ChatPanel`'s mocked context, which pins what the panel does with a scope
but not the route-to-scope derivation itself. A direct test needs a router
harness around `ChatPanelProvider`; the logic is four lines and total, but that is
an argument for testing it, not against.

**An attorney on `/assistant` with no case open resolves to `portfolio`.** That is
intended — it is the queue-level surface — but it means the route, not the
question, decides, and an attorney who navigates there meaning to ask about a
specific case will get portfolio scope until they open one.
