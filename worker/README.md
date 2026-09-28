# NevadoMedia worker

Runs on the Hostinger VPS. Holds every third-party API secret, writes into
Supabase with the service role key, and is the only component that talks to
Meta. Netlify serves static files only and never runs a cron or a function.

Two jobs:

| | What | How it runs |
|---|---|---|
| Daily sync | Pulls 30 days of Meta insights for every active account | `nevado-sync.timer`, 07:00 America/New_York |
| Refresh endpoint | Backs the dashboard's "Refresh Data" button | `nevado-worker.service`, HTTP on 127.0.0.1 |

Scheduling is a systemd timer rather than an in-process cron: systemd applies
the timezone including daylight saving, and a timer keeps firing across process
restarts.

## Install

```sh
sudo adduser --system --group --home /opt/nevado-worker nevado
sudo -u nevado git clone <repo> /opt/nevado-worker-src
sudo cp -r /opt/nevado-worker-src/worker/* /opt/nevado-worker/
cd /opt/nevado-worker && sudo -u nevado npm ci --omit=dev

sudo -u nevado cp .env.example .env
sudo -u nevado chmod 600 .env
sudo -u nevado nano .env          # fill in the values

sudo cp deploy/*.service deploy/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nevado-worker.service nevado-sync.timer
```

Check it:

```sh
systemctl status nevado-worker
systemctl list-timers nevado-sync      # confirms the next 07:00 fire
sudo -u nevado node src/cli.js sync --days 7   # one-off, logs what it wrote
journalctl -u nevado-sync -n 50
```

## Exposing /refresh

The service binds to `127.0.0.1` deliberately. Put it behind nginx with TLS and
point `VITE_WORKER_URL` at that hostname:

```nginx
location /worker/ {
    proxy_pass http://127.0.0.1:8787/;
    proxy_set_header Host $host;
}
```

## Authentication

`/refresh` takes two kinds of caller and treats them differently:

- **The dashboard** sends the signed-in user's Supabase access token. The worker
  verifies it and requires the `admin` role. This is why the frontend does not
  hold `WORKER_REFRESH_TOKEN` — a static site ships whatever it holds to every
  visitor.
- **Server-to-server** (a curl from the box, an uptime check) may present
  `WORKER_REFRESH_TOKEN` as a bearer token, compared in constant time.

Only one sync runs at a time; a second request while one is in flight gets a
409 rather than starting a duplicate pull against Meta's rate limits.

## Tests

```sh
npm test
```

18 tests, no network. They cover the insights parsing against recorded response
fixtures — lead extraction, CPL derivation, paging, error surfacing — and the
server's auth, CORS and method handling.

## Known unverified

The Meta field mapping in `src/meta.js` follows the documented insights shape
but **has not been run against a live ad account**. The most likely thing to
need adjustment is which `action_type` carries leads: `LEAD_ACTION_TYPES` is a
priority list because it depends on whether a client uses on-Facebook lead
forms or a pixel event. After the first real sync, check that `leads` on a
known day matches Ads Manager; if it does not, reorder that list.
