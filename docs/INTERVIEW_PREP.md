# Interview Walkthrough: Agent-Friendly Web Layer

## 30-second pitch (say this first if asked "what did you build")

"I built a benchmark comparing two ways an AI agent can operate a website: clicking around the rendered HTML like a human, versus calling a small set of structured 'capabilities' — search, filter, compare, book, update, cancel — exposed as a documented API, in the spirit of WebMCP. Same app, same underlying data and business logic, two interfaces, 12 tasks including five specifically designed around error recovery. The structured layer bought about 5.6x fewer agent actions per task and eliminated an entire class of failure — render-timing races — that only exist when the agent has to wait for a screen to draw. But the more interesting part is two asymmetries the recovery tasks surfaced: the DOM UI actually *prevents* some invalid actions by hiding the button entirely, while my hand-built API layer had a real validation gap the UI didn't. Neither interface won cleanly — that nuance is the actual finding."

## Why I built the app myself instead of pointing an agent at a real website

**Decision:** built a small demo app (QuickBook, an event-booking site) with two parallel interfaces on one shared backend, rather than scraping/automating an existing production site.

**Why:** a fair DOM-vs-API comparison needs the *same underlying operations* available both ways. Real sites either don't expose a capability API at all (so there's nothing to compare against) or the API and the UI are maintained by different teams and drift apart (so a difference in results could be a bug, not a real interface effect). Building both surfaces on one `store.js` means any measured difference is attributable to the interface, not to inconsistent business logic. This is a controlled-experiment argument — be ready to say that explicitly, it's the strongest technical justification in the project.

**Trade-off I'm upfront about:** I know the site's structure because I built it, which likely makes my DOM navigation faster than a cold agent's would be. I called this out directly in `RESULTS.md` rather than hiding it — if asked "isn't that a confound?", the answer is "yes, and here's the limitations section where I say so."

## Why a classic multi-page app (forms + links), not a modern SPA

**Decision:** server-rendered HTML, real page navigations, no client-side JS, no `data-testid` hooks.

**Why:** two failure modes were worth avoiding on both ends of the spectrum. Giving the DOM agent `data-testid` attributes would make DOM automation artificially easy and understate the benefit of a capability layer. Building a heavy SPA would add framework-specific noise (hydration timing, virtual DOM diffing) that's a separate research question from "does exposing semantic capabilities help." The classic MPA is the median real website — it let genuine friction show up (see the render-timing failures) without me hand-tuning either interface to win.

## Why I acted as the agent myself instead of scripting an LLM loop

**Decision:** no separate LLM API call loop; I drove both conditions directly — browser tool calls only for DOM mode, `curl` only for API mode.

**Why, honestly:** no LLM API key was configured in this environment, so scripting an autonomous loop wasn't available without extra setup. But the more interesting answer, and the one to lead with in an interview, is methodological: using myself as the fixed reasoning agent in both conditions removes a confound — if I'd used GPT-4 for one arm and Claude for the other (or even the same model with different prompts), any gap could be "which model is better at browsing" rather than "which interface is better." Holding the agent constant isolates the interface as the only variable. I say plainly in the write-up that this doesn't replace an automated multi-model, multi-trial study — it's a controlled demonstration, not a large-N benchmark.

## Why these 12 tasks / these 7 capabilities

**Decision:** mapped T1–T7 directly onto the operation categories from the brief — search, filter, compare, book (create), update, cancel — plus one "create+lookup" task to expose the id-addressability difference. Then added T8–T12: four dedicated *error-recovery* tasks (overbook-then-retry, cancel-twice, update-a-cancelled-booking, compare-with-one-then-two) plus one more filter task for breadth.

**Why T7 exists:** T4/T5/T6 (book → update → cancel) already showed the multi-step-with-lookup cost. T7 isolates *just* the return-value difference: the DOM confirmation page shows a booking id as page text (unusable by the agent as a handle without re-parsing), while the API's `POST /book` response returns a structured `{ booking: { id, ... } }` object the agent can hold onto directly.

**Why T8–T11 exist:** the first pass (T1–T7) only tested the happy path, and every task succeeded in both conditions — which meant the *success rate* metric had nothing to say. Real agent deployments spend a lot of their action budget on invalid-input recovery, not golden paths, so I designed four tasks specifically to force an error and see what the agent does with it. This is the round that actually surfaced the project's most interesting finding (the two asymmetries below) — the happy-path tasks alone would have made the story "APIs are faster," which is true but shallow. If asked "how did you decide what to measure," this is the concrete example: I noticed the first task set couldn't discriminate on reliability, so I added tasks designed to force failures and expose how each interface handles them.

## The metrics, and how to talk about each one

| Metric | Value | How to describe it if pushed |
|---|---|---|
| Task success rate | 10/12 full + 2/12 partial (DOM); 11/12 full + 1/12 partial (API) | "This isn't a clean scoreboard — the 'partial' outcomes on both sides are the two asymmetries I found (below), not failures in the everyday sense. I'd rather explain those than round them into a fake 100%." |
| Agent actions per task | 7.5 (DOM) vs 1.3 (API) — 5.6x | "Each DOM action is a full agent turn — screenshot or DOM read, reasoning, tool call. In a real LLM-driven agent that's the dominant cost in both latency and token spend, so this ratio is a reasonable proxy for 'how much cheaper is this API-native agent to run.'" |
| Wasted/failed tooling actions | 11.1% (DOM) vs 0% (API) | "read_page returning empty before the page finished drawing, a click failing because the tab hadn't rendered yet. Not a task-logic bug — a structural property of DOM control. There's no 'half-rendered' JSON response." |
| Recovery cost (T8, overbook→retry) | 13 actions (DOM) vs 2 calls (API) — 6.5x | "The DOM error page was bare text with no form on it, so recovery meant re-navigating and refilling the whole form. The API error was a JSON object I could read and immediately retry against with one corrected field. This is where the interface gap is largest, because recovery compounds the discovery cost." |
| Server-side latency / wall-clock | 86ms / 494s (DOM) vs 8ms / 52s (API) | "I'm explicit in the write-up that these specific numbers are close to meaningless as absolute figures — it's local in-memory processing time and my own pacing between tool calls, not a deployed agent's real latency. The number worth citing is the action-count ratio, not these; I kept them for transparency, not as headline metrics." |

Do **not** lead with the latency numbers in an interview — if you cite them without the caveat, a sharp interviewer will ask "isn't that just network overhead / your own typing speed" and you'll look like you didn't understand your own data. Lead with actions-per-task and the two asymmetries — they're the parts that show judgment, not just measurement.

## The two asymmetries — know these cold, they're the best part of the project

**DOM UI hides invalid actions; the agent literally can't attempt them (T9, T10).** Once a booking is cancelled, its Update/Cancel buttons stop rendering in the template. I confirmed this with a `find()` call that came back with zero matches. So "cancel it a second time" isn't a DOM-agent failure — it's an action the interface never offers. The API has no such client-side guard: it accepts the DELETE and returns a structured `{error: "already cancelled"}`. Same validation rule (`status !== 'confirmed'`), enforced two different ways. If asked "so which is better," the honest answer is: preventive (hide the control) protects a human from a pointless click; reactive-with-a-structured-reason is more useful to an *agent*, which can reason over an explicit error message but can't easily reason over the absence of a button.

**The API layer has a validation gap the DOM route doesn't (T11).** `/compare` on the DOM side explicitly checks for at least 2 ids. `/api/capabilities/compare` doesn't — send it 1 id and it returns HTTP 200 with a 1-item array, no error, nothing telling the agent the comparison is incomplete. I built both interfaces and still let one drift out of sync with the other. I did not go back and patch it once I saw the asymmetry — leaving it in is the honest result, and it's a genuinely useful lesson: shared backend logic does not give you shared input validation for free, each entry point needs its own checks. If an interviewer asks "did you fix that bug," the answer is "no, on purpose — patching it after finding it during the benchmark would have quietly improved the API's numbers using information a real agent wouldn't have had going in."

## Resume bullets (pick one or two, don't use all three — depth beats breadth)

- Designed and built a controlled benchmark comparing DOM-based browser automation against a structured "agent-native" capability API (WebMCP-style) on an identical backend across 12 tasks including dedicated error-recovery scenarios, finding a 5.6x reduction in agent actions per task and elimination of render-timing failure modes.
- Built a dual-interface demo application (Node/Express) exposing identical business logic through both a classic server-rendered UI and a documented JSON capability manifest, to isolate interface effects on AI agent task performance from confounds like model choice or business-logic drift.
- Instrumented request-level telemetry (latency, failure classification, action attribution) to produce reproducible, artifact-backed metrics, and identified two unplanned validation asymmetries between the two interfaces by designing tasks that specifically forced error paths rather than only testing happy-path scenarios.

## Questions an interviewer will probably ask, and the honest answer

**"Why should I believe 5.6x generalizes beyond your 12 tasks?"**
I shouldn't claim it does as a number. What generalizes is the *mechanism*: discovery cost (finding the right form vs. reading one manifest), implicit vs. explicit state (re-parsing a page for an id vs. getting it in a response), render-timing brittleness being structurally DOM-only, and recovery cost compounding discovery cost when an error response gives you nothing to act on. Those mechanisms are the actual contribution; 5.6x is one measurement of them under one small workload.

**"Isn't this just 'APIs are better than scraping,' which everyone already knows?"**
The angle that's actually new is quantifying it as an *agent cost metric* (actions per task, wasted-action rate) rather than a developer-experience argument. "APIs are nicer to use" has been said forever; "here's what percentage of an LLM agent's turns are pure render-timing overhead, measured" is a different, more specific claim.

**"What would you do with more time / a real LLM loop?"**
Script an actual multi-trial harness: N independent LLM agents (same model, temperature>0) per task per condition, reporting distributions not single runs. Fix the `/compare` validation gap and re-run T11 to see if the API's advantage widens once its input validation actually matches the UI's. Also worth testing whether *giving the DOM agent the manifest as a hint* (without the actual API) closes any of the gap — that would separate "agents are bad at browsing" from "capabilities genuinely remove necessary work."

**"You built the app and graded your own recovery tasks — isn't that circular?"**
Partly, yes, and I say so in the limitations section. What isn't circular is the two asymmetries: I didn't design T9/T10 expecting the DOM UI to hide its buttons, and I didn't design T11 expecting the API to skip validation — both were discovered live during the run, not engineered in advance. That's the difference between "I proved what I set out to prove" and "I found something I wasn't looking for," and it's worth saying explicitly if asked.

## Why I added a real external site instead of stopping at the demo app

**Decision:** ran a smaller, 4-task, read-only benchmark against automationexercise.com, a live third-party site, in addition to the controlled demo app.

**Why:** the strongest objection to the whole project is "you built both interfaces yourself, so of course the comparison favors your API." I can't fully answer that objection by building a better demo app — I can only answer it by leaving my own sandbox. I picked automationexercise.com specifically because it's a real site that (a) needs no login or payment for search/browse operations, so it doesn't require me to create accounts or touch payments — both hard no's regardless of what's technically possible — and (b) publishes an actual public API for the same catalog the UI shows, which is the one thing that made a real controlled comparison possible at all instead of "DOM automation with nothing to compare it to."

**What this bought that the demo app couldn't:** two findings I did not engineer and could not have predicted. A live ad overlay intercepted two clicks mid-task (real ad inventory, not scripted) — that's a failure mode that only exists outside a sandbox. And the real API's `productsList` response turned out to carry enough metadata (brand + category per product) that one cached fetch answered three of the four tasks — a stronger version of the "structured responses substitute for navigation" finding from the demo app, arrived at completely independently. If asked "what did the real-site test add beyond confirming the same thing," lead with these two — they're not confirmations, they're new mechanisms.

**What I'd say if pushed on rigor:** N=4 tasks, one run, and the 16x action-count ratio is noisier than the demo app's 5.6x — it's dominated by one outlier task (the ad-overlay incident). I say this directly in `RESULTS.md` rather than let the flashier number stand unqualified. The value of this run isn't the ratio, it's the two mechanisms.

## What's actually in the repo (so you can navigate it live if asked)

- `server/store.js` — the one shared source of truth both interfaces read/write.
- `server/domRoutes.js` + `server/views/*.ejs` — the classic multi-page UI.
- `server/capabilities/manifest.js` + `server/capabilities/routes.js` — the agent-native layer: this *is* the "agent-friendly web layer" from the brief.
- `server/logger.js` — request-level instrumentation (mode classification, latency, failure flag).
- `tasks/tasks.json` — the 12-task suite with expected outcomes (T1–T7 base operations, T8–T12 recovery/edge cases).
- `results/*.json` — raw per-task and per-request data from the demo-app run.
- `results/real-site/*.json` — the same methodology run against a real live external site (automationexercise.com), read-only tasks only.
- `RESULTS.md` — the write-up, including the limitations section (read this before an interview, it's where the hard questions come from).
