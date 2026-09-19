---
format: 1080x1920
duration: 45s
message: "Poppy learns from what's already winning and from your actual voice — so the scripts sound like you"
arc: Hook → Problem → Mechanism (3 steps) → Proof → CTA
audience: creators and marketers who tried ChatGPT for content and got generic output
mode: autonomous
music: none
---

## Video direction

**Palette system** (from `frame.md`, by role — nothing invented). Canvas is the
near-black ink (`black`) for the hook and the proof beats; the lavender
(`yellow` key, #7F78EB) is Poppy's surface — every board, card and panel that
belongs to the product. The salmon (`cream` key, #F4938F, with `pink` #F59D99 as
its softer tint) is the scarce voltage: step numerals, performance badges, the
CTA button, and nothing else. The lavender tints (`blue` #CAC7F7, `green`
#8781EC) carry connector lines, depth layers and secondary chrome. Off-white
(`white` #F7F6FD) is card stock and body text on dark. The "generic AI" panel in
Frame 2 is the only desaturated surface in the film — that is its whole point.

Type by role from `frame.md`: display for the slam lines and numerals, body for
UI labels and subtext, mono for anything that reads as a link, prompt or code.

**Motion grammar + reveal model.** One camera, one feel. Every entrance is a
**smooth long-tail settle** (`power3`; `expo.out` on a fast arrival) — this ad
gets its punch from **hard cuts and scale-punches, never from bounce**. No
`back.out` / `bounce.out` / `elastic.out` anywhere; the single sanctioned
overshoot in the whole film is the CTA button's press in Frame 9, and even that
stays a critically-damped settle rather than a bell-hit.

Every frame follows the **VO-paced reveal model**: at t=0 only what the
voiceover is saying enters, and each further piece reveals on its spoken cue,
weighted into the back ~50% of the shot. Nothing is dumped at entrance. During a
hold the only permitted aliveness is **subtle jitter** (`sine-wave-loop`, low
amplitude) — no breathing, no back-half pan or push.

**Rhythm / held-frame allocation.** The film alternates worked beats and held
beats so it doesn't read as uniformly busy. Deliberately **held** (content
resolved, reading still): **Frame 3** (the turn — the typographic stamp lands and
the board just sits), **Frame 7** second half (the results card must be readable
at a glance), and **Frame 9** from the button settle to the last frame. Every
other frame develops across its full duration. Frames 4 and 5 are the two
densest shots; Frame 6 is the widest and Frame 8 the fastest.

**Negative list.** Never: nav bars, footers, scrollbars, browser chrome, real
cursors, real third-party logos, real YouTube pages, real channel names, any
recognizable human face, floating bokeh or purple-blue "AI" gradient wash.
Never the two motion failure modes — **slideshow** (everything dumped in the
first 25%, then frozen) and **screensaver** (elements floating independently as
a substitute for motion). Never `repeat`/`yoyo`, `Math.random`, or `Date.now`.

**Caption band.** The bottom ~17% is reserved for the caption pill; all content
is planned into the top ~83%.

**A note on sound.** `music: none` and no SFX are named: the project is not
signed in to HeyGen, so BGM and SFX retrieval are unavailable this run. The film
is cut to carry on voiceover and captions alone; a music bed can be laid in
later without re-cutting.

## Frame 1 — Hook: it watches

- status: outline
- duration: 4s
- transition_in: cut
- type: hook
- scene: A channel link is pasted into Poppy; hard zoom; "wait, it WATCHES it?" punches in.
- voiceover: This AI feels illegal to know about. It watches your competitor's videos and hands you the scripts.
- asset_candidates: ui/paste-field
- blueprint: prompt-type-submit-generate (Adapt)
- focal: ui/paste-field
- roles: ui/paste-field = cutout
- poster: 2.0
- handoff_out: none — deliberate clean cut.

Adapt: keep the signature **type-into-the-product's-input then cut at the
submit** — but the payload is a pasted competitor link, not a prompt, and the
"answer" is withheld until Frame 4. No status theater here; the hook is the
implication, not the result.

Open on near-black #12101F — no logo, no preamble, straight into the action. A
lavender input field sits centred. A generic channel-style URL types itself in
fast (monospace, no real channel name). The moment the last character lands, the
camera punches in hard on the field.

On the punch, the overlay "wait, it WATCHES it?" slams in at a slight rotation
(about −3°), salmon on black, display weight. This is the retention hook — it
must land before 3s. Hard cut out.

Scene 1 (0.0–1.4s): near-black field, empty; the lavender input field alone,
dead-centre, ~45% of frame width — Centered template, 3 depth layers (black
ground, a dim lavender glow plate, the field). As the VO says "this AI feels
illegal to know about", the field enters on a **spring-pop entrance**
(`spring-pop-entrance`) on a smooth long-tail settle — no overshoot.

Scene 2 (1.4–2.6s): on "it watches your competitor's videos", the URL **types on
with a caret** (`discrete-text-sequence` + `context-sensitive-cursor`)
character-by-character inside the field. Nothing else on screen — the typing is
the only motion. Layout unchanged; the glow plate lifts slightly in opacity as
the line fills.

Scene 3 (2.6–4.0s): the last character lands and the camera **zooms to target**
(`coordinate-target-zoom`) hard onto the field. On the zoom's peak velocity, the
overlay "wait, it WATCHES it?" enters as a **kinetic beat-slam**
(`kinetic-beat-slam`), salmon, rotated ~−3°, overlapping the field upper-third
(golden position). It holds still to the cut — **subtle jitter**
(`sine-wave-loop`, low amplitude) only. The seam into Frame 2 is a clean hard
cut, not a velocity match: the jolt is the point.

## Frame 2 — The problem: generic AI never saw you

- status: outline
- duration: 6s
- transition_in: cut
- type: pain_point
- scene: Split screen — grey generic AI dies on the left, the lavender Poppy board wakes up on the right.
- voiceover: Everyone's using ChatGPT for content and getting slop. Here's why — it never actually saw you. It's guessing from random stuff on the internet.
- asset_candidates: ui/generic-ai-panel, ui/board
- blueprint: comparison-split (Adapt)
- focal: ui/generic-ai-panel
- roles: ui/generic-ai-panel = cutout · ui/board = supporting
- poster: 3.0
- handoff_out: the lavender board sits in the right half, x ≈ +27% from centre, scale 1.0, opacity 1, static at the cut.

Adapt: keep the **mirrored split-tilt entrance** signature — two panels entering
from opposite wings with opposing rotationY. What changes: the two sides are
deliberately *unequal* in outcome rather than weighed as equals, and the badge
punctuation is replaced by the left panel's desaturation. This is a pain beat
wearing a comparison shape.

Scene 1 (0.0–2.0s): hard vertical split, 50/50. On "everyone's using ChatGPT for
content and getting slop", the LEFT panel — grey placeholder text blocks,
labelled "generic AI" — enters alone via **split-tilt cards**
(`split-tilt-cards`) from the left wing on a long-tail settle. The right half
stays empty black: the problem gets the frame to itself first.

Scene 2 (2.0–3.6s): on "it never actually saw you" — the pivot line — the left
panel **desaturates and settles downward** (`depth-of-field-blur` taking it
off-focus) while it stays on screen. Still nothing on the right. The line lands
in the vacated upper-third as a **per-word staggered reveal**
(`dynamic-content-sequencing`).

Scene 3 (3.6–6.0s): on "guessing from random stuff on the internet", the RIGHT
panel enters from the right wing with the mirrored tilt — the lavender board,
gaining saturation as it arrives, abstract thumbnail cards fading up inside it
in a staggered cascade (`grid-card-assemble` motion, borrowed). The two halves
now move in opposition: left dim and low, right lit and lifted. Layout evolves
to asymmetric 60/40 in the right panel's favour by the cut. Both hold; no drift.

## Frame 3 — The turn: not another wrapper

- status: outline
- duration: 4s
- transition_in: cut
- type: product_intro
- scene: Thumbnails draw glowing connector lines into a central AI node; the board fills frame.
- voiceover: But Poppy? Poppy only learns from what's already winning, and from your actual voice. No, this isn't another ChatGPT wrapper.
- asset_candidates: ui/board
- blueprint: constellation-hub (Adapt)
- focal: ui/board
- roles: ui/board = cutout
- poster: 2.0
- handoff_in: the lavender board enters at x ≈ +27% from centre, scale 1.0, opacity 1, and travels to centre over Scene 1 — matching Frame 2's handoff_out.
- handoff_out: none — clean cut into the step sequence.

Adapt: keep the **ring-of-nodes-with-connectors resolving on the core** signature
(`avatar-cloud-network` + push-in). What changes: the nodes are the outlier
thumbnails already established in Frame 2, so the ring *forms from material the
viewer has seen* rather than springing in cold. This is a **held** frame by
allocation — the second half reads still.

Scene 1 (0.0–1.3s): on "but Poppy?", the board travels from the right half to
full frame via **pan / focus-lock** (`viewport-change`) — a whip that carries
Frame 2's velocity. Layered-depth, 3 layers. Board fills ~90% of canvas.

Scene 2 (1.3–2.7s): on "only learns from what's already winning, and from your
actual voice", the thumbnail cards **draw connector lines** inward to a central
node — **logo/avatar ring + connectors** (`avatar-cloud-network`) with the lines
**self-drawing** (`svg-path-draw`) stroke-by-stroke, staggered by element index.
The centre node **glow-blooms** (`ambient-glow-bloom`) as the last line lands.

Scene 3 (2.7–4.0s): on "this isn't another ChatGPT wrapper", the line lands as a
single hard typographic stamp over the board, upper-third, display weight,
off-white on lavender — a **hard-cut word slam** (`discrete-text-sequence`), one
move, no build. Everything then **holds still** — the allocated breather. Subtle
jitter only.

## Frame 4 — Step 1: paste any link

- status: outline
- duration: 7s
- transition_in: cut
- type: feature_showcase
- scene: Big salmon "1". Link drops in, "Analyzing…" pulses, outlier cards flip up with 14X / 9X / 22X badges.
- voiceover: Three steps. One — paste any link. A YouTube channel, a competitor, your own page. Poppy pulls their outliers — the videos that beat their average by 14X.
- asset_candidates: ui/paste-field, ui/analyzing-state, ui/outlier-card
- blueprint: agent-progress-theater (Adapt)
- focal: ui/outlier-card
- roles: ui/outlier-card = cutout · ui/analyzing-state = supporting · ui/paste-field = supporting
- poster: 4.5
- handoff_out: the "1" numeral holds upper-left, x ≈ −34%, y ≈ −38%, scale 1.0, opacity 1, static at the cut — Frame 5 swaps the glyph in place.

Adapt: keep the **status-theater-into-receipt-cascade** signature — the machine
visibly works, then the findings arrive and resolve. What changes: the receipt
is a cascade of outlier cards with performance badges rather than a checklist
that checks off, and the trigger is the pasted link from Frame 1 rather than a
menu pick.

Scene 1 (0.0–1.2s): on "three steps", the salmon numeral "1" **scale-punches**
into the upper-left anchor position (`spring-pop-entrance`, long-tail settle) at
~18% of frame height. The field from Frame 1 is already present beneath it,
smaller — asymmetric 70/30, numeral dominant by size and colour.

Scene 2 (1.2–2.6s): on "paste any link. A YouTube channel, a competitor, your
own page", three short mono labels reveal **sequentially**
(`dynamic-content-sequencing`) beside the field, one per named source — each on
its own spoken cue, not as a set.

Scene 3 (2.6–4.0s): on "Poppy pulls their outliers", the labels clear and the
lavender "Analyzing…" state enters, its **progress ring filling**
(`stat-bars-and-fills`). This is the shot's only waiting beat — long enough to
read, short enough not to stall. Centred, ~40% of frame.

Scene 4 (4.0–7.0s): the seam into the payoff is a **zoom-through**
(`cut-catalog.md`) — the ring's centre becomes the card grid. On "the videos
that beat their average by 14X", outlier cards **self-assemble in a staggered
cascade** (`grid-card-assemble`) into a 2×3 grid, each an abstract thumbnail
with a salmon badge — "14X", "9X", "22X" — and the label "Outlier". The "14X"
badge **keyword-glows** (`asr-keyword-glow`) exactly as the VO says it and holds
≥0.4s. Grid occupies ~70% of canvas, 3 depth layers. Holds to the cut.

## Frame 5 — Step 2: it learns your voice

- status: outline
- duration: 6s
- transition_in: cut
- type: feature_showcase
- scene: Big salmon "2". Your videos feed a voice-print; "write me 10 scripts" types; script cards cascade out.
- voiceover: Two — it watches your real videos and learns your voice, so when you say "write me 10 scripts," they sound like you.
- asset_candidates: ui/voice-print, ui/prompt-line, ui/script-card
- blueprint: prompt-type-submit-generate (Adapt)
- focal: ui/prompt-line
- roles: ui/prompt-line = cutout · ui/voice-print = supporting · ui/script-card = supporting
- poster: 3.5
- handoff_in: the step numeral is already on screen upper-left at x ≈ −34%, y ≈ −38%, scale 1.0, opacity 1; only the glyph changes, 1 → 2, by hard cut in place.
- handoff_out: the numeral holds at the same position, scale 1.0, opacity 1 — Frame 6 swaps 2 → 3 in place.

Adapt: this is the **full prompt→answer loop** variant, where Frame 1 used the
cut-at-submit variant — same blueprint, deliberately different half of it, so
the two never read as a repeat. Keep the signature **prompt types into a real
input and the machine answers**; the answer is a cascade of script cards.

Scene 1 (0.0–1.0s): the numeral swaps 1 → 2 in place on a hard cut
(`discrete-text-sequence`) — an **in-place token cycle** on the step anchor.
Nothing else moves; the anchor's stillness is what makes the swap read.

Scene 2 (1.0–2.6s): on "it watches your real videos and learns your voice",
abstract thumbnails labelled "Your videos" slide inward via
**cluster→outward expansion run in reverse** (`center-outward-expansion`) and
resolve into a waveform voice-print that **self-draws**
(`svg-path-draw`), labelled "Your voice". Centred, ~50% of frame.

Scene 3 (2.6–4.2s): on "so when you say 'write me 10 scripts'", the prompt line
**types on with a caret** (`discrete-text-sequence` +
`context-sensitive-cursor`) beneath the voice-print. The voice-print stays lit —
the coupling between the two is the point of the beat.

Scene 4 (4.2–6.0s): on "they sound like you", script cards **cascade out** of the
prompt in a staggered stack (`grid-card-assemble`), each carrying a few lines of
abstract text, overlapping with depth. The final card lands on "you" and the
frame holds. Asymmetric 60/40, cards dominant.

## Frame 6 — Step 3: one visual board

- status: outline
- duration: 5s
- transition_in: cut
- type: benefit_highlight
- scene: Big salmon "3". Camera pulls back to the whole lavender board — Scripts, Ads, Emails, Landing page.
- voiceover: Three — it all lives on one visual board. Scripts, ads, emails, even a landing page, all in one place.
- asset_candidates: ui/board
- blueprint: zoom-out-workspace-reveal (Reproduce)
- focal: ui/board
- roles: ui/board = cutout
- poster: 3.0
- handoff_in: the step numeral is on screen upper-left at x ≈ −34%, y ≈ −38%, scale 1.0, opacity 1; glyph swaps 2 → 3 in place.
- handoff_out: none — clean cut into the proof beat.

Reproduce: open TIGHT on the script cards left by Frame 5, then **one continuous
decelerating zoom-out reveals the containing whole**. The pull-back is the
engine and there is no zoom-in anywhere in this frame. This is the widest shot in
the film.

Scene 1 (0.0–0.9s): the numeral swaps 2 → 3 in place on a hard cut. The frame is
still tight on the script-card stack from Frame 5 — full-bleed, no context.

Scene 2 (0.9–3.2s): on "it all lives on one visual board", ONE unbroken
decelerating **pull-back** (`multi-phase-camera`, pull-back phase only) reveals
the whole lavender board containing those cards. Layered-depth, 3 layers, board
filling ~95% of canvas at rest. No re-push afterwards.

Scene 3 (3.2–5.0s): the frame locks and the four cluster labels — "Scripts",
"Ads", "Emails", "Landing page" — reveal **sequentially on their spoken cue**
(`dynamic-content-sequencing`), each with its connector line **self-drawing**
(`svg-path-draw`) to the board's spine as it is named. "Landing page" lands on
"all in one place" and everything holds still.

## Frame 7 — Proof: the numbers

- status: outline
- duration: 5s
- transition_in: cut
- type: social_proof
- scene: Results card snaps in — "$29K on $800 spend", "36X ROAS" — then a 900 → 97,000 counter.
- voiceover: This is how Jason turned eight hundred dollars in ad spend into twenty-nine thousand in forty days — with Poppy writing 100% of the copy.
- asset_candidates: ui/testimonial-card, ui/counter
- blueprint: dataviz-countup (Adapt)
- focal: ui/testimonial-card
- roles: ui/testimonial-card = cutout · ui/counter = supporting
- poster: 2.5
- handoff_out: none.

Adapt: keep the **number-as-hero with a camera landing on one metric**
signature. What changes: there is no push-THROUGH a chart — the beat is a single
results card that must be legible at a glance, so the camera lands and *stays*.
The count-up guest-stars as the second half rather than carrying the shot. The
back half of this frame is an allocated **held** read.

Scene 1 (0.0–1.0s): hard cut to near-black. On "this is how Jason turned eight
hundred dollars in ad spend", the results card **scale-punches** in dead-centre
(`spring-pop-entrance`, long-tail settle, no overshoot) carrying only its
headline "$29K on $800 spend". Centred, card ~60% of canvas, 3 depth layers with
an **ambient glow bloom** (`ambient-glow-bloom`) behind it.

Scene 2 (1.0–2.2s): on "into twenty-nine thousand in forty days", "36X ROAS"
reveals beneath the headline in salmon — one **per-word staggered reveal**
(`dynamic-content-sequencing`). Held ≥0.4s. Nothing else enters.

Scene 3 (2.2–3.6s): on "with Poppy writing 100% of the copy", the subline reveals
and the "100%" **keyword-glows** (`asr-keyword-glow`) as it is spoken.

Scene 4 (3.6–5.0s): the card clears upward and a **value-scaled counter**
(`counting-dynamic-scale`) runs 900 → 97,000 dead-centre, its size growing with
the value so the climb itself escalates, settling on a decelerating curve. The
settled figure holds ≥0.4s, perfectly still.

## Frame 8 — Proof: the crowd

- status: outline
- duration: 3s
- transition_in: cut
- type: social_proof
- scene: Grid of abstract avatar tiles fills the frame — "13,000+ creators · 4.9/5".
- voiceover: It's how creators go from 900 followers to almost 100,000 in six months. Your next week of content, in your voice, done tonight.
- asset_candidates: ui/proof-grid
- blueprint: grid-card-assemble (Reproduce)
- focal: ui/proof-grid
- roles: ui/proof-grid = cutout
- poster: 1.5
- handoff_out: none.

Reproduce: N tiles **self-assemble in a staggered cascade** into a grid and
hold. This is the fastest shot in the film — the cascade is quick and the frame
is dense by design.

Scene 1 (0.0–1.4s): on "creators go from 900 followers to almost 100,000 in six
months", abstract avatar tiles **self-assemble** (`grid-card-assemble`) in a fast
staggered wave, filling the frame corner-to-corner. Tiles are abstract shapes in
the lavender/salmon family — never faces. Full-bleed grid, 2 depth layers.

Scene 2 (1.4–2.3s): the overlay "13,000+ creators · 4.9/5" reveals across the
grid's centre band, off-white on a dimmed plate, with the star rating arriving as
a **fractional star wipe** (`stat-bars-and-fills`).

Scene 3 (2.3–3.0s): on "done tonight", the last tile lands and everything stops
dead. No jitter here — the abrupt stillness is what makes the line hit.

## Frame 9 — CTA: one dollar

- status: outline
- duration: 5s
- transition_in: cut
- type: cta
- scene: Salmon "Try Poppy for $1" button snaps in; lavender end card holds to the last frame.
- voiceover: Try Poppy for one dollar. Seven days, full access. Paste your first link and watch it work. Your next winning post is already out there.
- asset_candidates: ui/cta-button, ui/end-card
- blueprint: titlecard-reveal (Adapt)
- focal: ui/cta-button
- roles: ui/cta-button = cutout · ui/end-card = background
- poster: 3.5
- handoff_out: final frame — this is the only frame in the film with a real exit, and it exits by holding, not by moving.

Adapt: keep the **end-card chain seamed by hard cuts, terminating on a held
lockup** signature. What changes: the chain is two cards, not three, and the
terminal card carries an offer rather than a bare logo. Low motion is the
payload here, by allocation — from the button settle to the last frame, nothing
moves.

Scene 1 (0.0–1.6s): hard cut to solid lavender — the end card ground. On "try
Poppy for one dollar", the salmon button **presses in**
(`press-release-spring`) dead-centre carrying "Try Poppy for $1". This is the
film's single sanctioned overshoot, and it stays a critically-damped settle —
a tactile press, not a bounce. Centred, button ~55% of frame width.

Scene 2 (1.6–2.8s): on "seven days, full access", the subtext "7 days full
access · cancel anytime" reveals beneath the button in body weight, small — one
quiet **staggered reveal** (`dynamic-content-sequencing`). No other motion.

Scene 3 (2.8–5.0s): on "paste your first link and watch it work", the "Poppy AI"
wordmark reveals in the upper-third, completing the lockup. From that settle to
the final frame the composition is **completely still** — the last line, "your
next winning post is already out there", plays over a locked card. Let the offer
sit; no jitter, no drift, no exit move.
