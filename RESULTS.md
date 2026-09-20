# Agent-Friendly Web Layer — Benchmark Results

## Setup

One demo app, "QuickBook" (an event-booking site), with identical business logic exposed through two interaction surfaces:

- **DOM UI** — classic server-rendered, multi-page app. Forms, links, page navigations. No client-side JS. This is what a browsing agent (screenshot / accessibility-tree + click / type) has to work with.
- **Agent-native API** — a small "agent-friendly web layer": a JSON manifest at `/api/manifest` describing 7 capabilities (`search_events`, `filter_events`, `compare_events`, `book_event`, `update_booking`, `cancel_booking`, `get_bookings`), each a single structured HTTP call.

Both surfaces read and write the *same* in-memory store (`server/store.js`), so any difference in outcome is caused by the interface, not the underlying app.

12 tasks were run identically in both modes from a freshly reset state — the first 7 cover the base operation categories (search, filter, compare, book, update, cancel, create+lookup); the last 5 (T8–T12) specifically probe **error recovery**: what happens when the agent's first attempt is invalid and it has to detect that and correct course.

| ID | Category | Task |
|----|----------|------|
| T1 | search | Find the sourdough baking event and report its price |
| T2 | filter | List workshop events under $30 |
| T3 | compare | Compare two named events, report which is cheaper |
| T4 | book | Book 2 seats under a name |
| T5 | update | Change that booking's seat count |
| T6 | cancel | Cancel that booking |
| T7 | create+lookup | Book a seat and report the new booking's id |
| T8 | book-recovery | Overbook (ask for more seats than exist), detect the failure, retry with the max available |
| T9 | cancel-recovery | Cancel a booking, then attempt to cancel it again and report what happens |
| T10 | update-recovery | Attempt to change a cancelled booking's seats and report what happens |
| T11 | compare-recovery | Attempt to compare only one event, detect that's insufficient, retry with two |
| T12 | filter | Multi-field filter (category + max price) |

I acted as the agent in both conditions — DOM mode using only browser tool calls (navigate / read_page / screenshot / click / form_input), API mode using only `curl` against the documented capabilities — since no external LLM API key was configured in this environment. This keeps the comparison controlled (same reasoning agent, same tasks, same underlying app) rather than introducing a second, differently-tuned LLM as a confound.

## Metrics

| Metric | DOM UI | Agent-native API | Delta |
|---|---|---|---|
| Task success rate | 10/12 full success, 2/12 partial | 11/12 full success, 1/12 partial | see "the two asymmetries" below — these aren't clean wins for either side |
| Total agent actions (tool calls) | 90 | 16 (incl. 1 one-time manifest fetch) | **5.6x fewer** (7.5 → 1.3 per task) |
| Wasted/failed actions (tooling retries, dead ends) | 10 (11.1%) | 0 (0%) | DOM-only failure mode |
| Genuine app-level errors surfaced to the agent | 1 (T8's overbook) | 3 (T8, T9's 2nd cancel, T10) | API surfaces more invalid-state attempts as diagnosable errors — see below |
| HTTP round trips | 30 | 16 | 1.9x fewer |
| Server-side processing time (sum) | 85.9 ms | 8.2 ms | 10.5x less (see caveat below) |
| Wall-clock session time (this run) | 494 s | 52 s | 9.5x less (see caveat below) |

Raw per-task data: [results/dom-run.json](results/dom-run.json), [results/api-run.json](results/api-run.json). Raw HTTP logs: [results/dom-http-log.json](results/dom-http-log.json), [results/api-http-log.json](results/api-http-log.json).

## What actually drove the gap

1. **Discovery cost.** The DOM agent has to *find* the affordance every time — read the page, locate the right form, sometimes locate the submit button in a second pass because it wasn't in the first accessibility-tree read (T3, T11). The API agent reads one manifest once and then knows every operation's name, method, and parameters for the rest of the session.
2. **State is implicit vs. explicit.** The API's `book_event` response returns the booking id directly, so `update_booking`/`cancel_booking` are single calls with no lookup step. The DOM UI's confirmation page shows the id as page text with no follow-up handle — updating or cancelling later means re-navigating to "My bookings," refilling a lookup form, and re-parsing the page.
3. **Render-timing failures are a DOM-only failure mode.** 10 of 90 DOM actions (11.1%) were pure tooling overhead: a `read_page` returning empty before the page finished drawing, a `click` failing because the tab "hadn't drawn yet." These aren't task-logic errors — they're artifacts of coupling correctness to *when a screen finishes rendering*, which is structurally impossible over a JSON API (there is no "half-rendered" JSON response).
4. **Recovery cost compounds the discovery cost.** T8 (overbook → retry) took 13 DOM actions vs. 2 API calls — 6.5x — specifically because the DOM error response was a bare text page with no form on it: recovering meant re-navigating to the event page and refilling the entire form from scratch, not just correcting one field. The API error was a JSON object the agent could read and immediately retry against.

## The two asymmetries (the actually interesting part)

Not every result favored the API. Two genuine, unplanned findings came out of the recovery tasks:

**T9/T10 — the DOM UI prevents invalid actions the agent can't even attempt.** Once a booking is cancelled, the EJS template stops rendering its Update/Cancel buttons entirely (`bookings.ejs` guards them on `status === 'confirmed'`). I confirmed this with `find()` — zero matches for "Cancel" or "Update" on a cancelled booking's row. So "attempt to cancel it again" is literally impossible through the DOM UI's own affordances; the correct report becomes "the interface won't let you," which is a different (and in some ways better — a wrong action was never reachable) outcome than a reactive error. The API layer has no such guard on the *client* side — it happily accepts the DELETE/PATCH and returns a structured `{error: "already cancelled"}` / `{error: "booking not active"}`. Same validation rule, expressed two different ways: **preventive (hide the button) vs. reactive (return a diagnosable error)**. Neither is strictly better for a human; for an agent, reactive-with-structured-errors is arguably more useful, because the agent gets an explicit, machine-readable reason rather than having to infer "this button isn't here, therefore..." from absence.

**T11 — the capability layer has a real validation gap the DOM route doesn't.** The DOM `/compare` route explicitly checks `events.length < 2` and shows "Select at least two events." The API's `/api/capabilities/compare` endpoint has no such check — a 1-id request returns HTTP 200 with a 1-item array and no error field at all. An agent calling the API has to notice the array is too short on its own; nothing tells it the comparison is incomplete. I did not fix this after finding it — it's a real inconsistency between the two hand-built interfaces, and leaving it in is more honest than quietly patching it to make the API look uniformly better. **Lesson for anyone building a real agent-native layer: parity between your capability API's validation and your UI's validation isn't automatic just because they share a backend function — each entry point needs its own explicit checks.**

## Honest limitations

- **N=12 tasks, single run each.** This is a demonstration methodology, not a statistically powered study. No variance/confidence intervals.
- **"Latency" here is mostly server processing time / my own pacing**, not end-to-end agent wall-clock for an autonomous system. A real deployed DOM agent's dominant cost is page-load + screenshot + LLM-reasoning time per turn (seconds), not the ~1-3ms this trivial local server takes to handle a request, and the wall-clock numbers above include my own thinking time between tool calls, not pure system latency. The **action-count ratio (5.6x)** is the metric that would translate most directly into a real-world latency and token-cost gap, since each DOM action is a full agent turn (screenshot/DOM read → reasoning → tool call).
- **One demo app I designed myself**, and I know its structure going in — a from-scratch LLM agent with no memory of having built the site would likely spend more actions on discovery than I did. The DOM UI is deliberately "classic" (no client JS, real multi-page navigation, no `data-testid` hints) rather than a modern SPA, to avoid making the automation artificially easy or hard in either direction.
- **The two asymmetries above are exactly the kind of finding a larger study would want to chase.** With more time, the next step is testing whether the same recovery tasks against a *harder, more adversarial* DOM UI (client-rendered SPA, ambiguous copy, no server-side validation feedback at all) change the picture, and whether patching the compare-endpoint validation gap changes T11's outcome.
