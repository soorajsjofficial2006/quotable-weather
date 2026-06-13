# Pulse — Autonomous Daily Summary Bot

Pulse fetches **live weather** + a **motivational quote** every day, generates
a formatted daily summary, and commits the report back to the repo —
automated end-to-end with **GitHub Actions**.

The project ships with a polished web dashboard (the working demo) and a
production Python automation pipeline.

---

## 🚀 What's inside

| Layer        | Stack                                       |
| ------------ | ------------------------------------------- |
| Frontend     | React 19 + Vite + Tailwind v4 + Framer Motion |
| Automation   | Python 3.12 (stdlib only — zero deps)       |
| Scheduling   | GitHub Actions cron (`0 8 * * *` daily)     |
| Hosting      | GitHub Pages (static)                       |
| APIs         | `wttr.in` (weather) · `zenquotes.io` (quote) |

---

## 📅 Daily automation

`scripts/daily_summary.py` is triggered by `.github/workflows/daily-summary.yml`:

1. Runs at **08:00 UTC every day** (and on-demand via `workflow_dispatch`).
2. Calls the weather + quote APIs.
3. Writes `reports/summary-YYYY-MM-DD.txt`, `reports/latest.txt`, `reports/latest.json`.
4. Commits the new report back to the repository.

Run locally:

```bash
python scripts/daily_summary.py
# or pick a city
PULSE_CITY="Tokyo" python scripts/daily_summary.py
```

---

## 🌐 Deploy to GitHub Pages

The included workflow `.github/workflows/deploy-pages.yml` builds the app and
publishes it to GitHub Pages on every push to `main`.

**One-time setup:**

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and pick
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually). Your site goes live at
   `https://<user>.github.io/<repo>/`.

A SPA fallback (`404.html`) and `.nojekyll` are written automatically so
client-side routes and Vite-hashed assets serve correctly.

---

## 🧑‍💻 Local development

```bash
bun install
bun run dev      # http://localhost:8080
bun run build    # production build
```

---

## ✅ What Pulse demonstrates

- Python automation
- REST API integration with graceful fallbacks
- GitHub Actions workflows (CI + scheduled cron)
- Automated commit-back reporting
- Static SPA deployment on free GitHub hosting
