# Asset inventory

No assets were captured. This project runs in no-capture mode by the user's
explicit choice: getpoppy.ai must not be crawled, and all Poppy UI in the video
is a stylized interpretation built from the brand tokens rather than real
product screenshots.

Every visual is therefore authored in HTML/CSS/SVG inside the compositions. The
recurring invented elements, available to any frame as `asset_candidates`:

- `ui/paste-field` — a lavender input field with a generic channel-style URL typing into it.
- `ui/analyzing-state` — a pulsing "Analyzing..." progress state on a lavender card.
- `ui/outlier-card` — an abstract thumbnail rectangle with a salmon performance badge ("14X", "9X", "22X") and the label "Outlier".
- `ui/voice-print` — a waveform / voice-print graphic that assembles from abstract thumbnails, labelled "Your voice".
- `ui/prompt-line` — a typing prompt line reading "write me 10 scripts".
- `ui/script-card` — a stacked cascade of abstract script cards.
- `ui/board` — the full lavender board: clusters labelled "Scripts", "Ads", "Emails", "Landing page", joined by glowing connector lines.
- `ui/generic-ai-panel` — desaturating grey placeholder text blocks labelled "generic AI", for the split-screen contrast.
- `ui/testimonial-card` — a results card: "$29K on $800 spend" with "36X ROAS" beneath.
- `ui/counter` — a count-up from 900 to 97,000.
- `ui/proof-grid` — a grid of abstract, non-identifiable avatar tiles under "13,000+ creators - 4.9/5".
- `ui/cta-button` — a salmon button reading "Try Poppy for $1" with subtext "7 days full access - cancel anytime".
- `ui/end-card` — solid lavender end card with salmon accent and the "Poppy AI" wordmark.

Hard constraints on every item above: no real third-party logos, no real
YouTube pages, no real channel names, no recognizable real faces. Thumbnails
are abstract colored rectangles; avatar tiles are abstract shapes.
