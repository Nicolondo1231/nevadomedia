# NevadoMedia — repo instructions

## Hard rules

- **Never delete files without Sebastian's explicit permission.** This applies to
  every file in this repository, generated artifacts, and anything on the
  Hostinger VPS. If something looks obsolete, ask first. Moving or renaming
  counts as deleting — ask.
- Never commit secrets. All API keys live in environment secrets / `.env`
  (git-ignored) / the VPS `.env`, never in tracked files.
- Build in the phase order agreed in `dashboard/PLAN.md`. Confirm each phase
  with Sebastian before starting the next; do not skip or combine phases.

## Repository layout

- `src/`, `README.md` — Poppy AI HTTP API client (unrelated to the dashboard).
- `videos/` — HyperFrames video projects.
- `dashboard/` — NevadoMedia business intelligence dashboard (see its PLAN.md).

## Contacts / context

- Owner: Sebastian (admin). Operator: Nico (operations-only access).
- Agency: NevadoMedia, Union, New Jersey. Clients are Latino home-service
  contractors in NJ/NY/CT.
