# HaechiVN Korean LMS

HaechiVN is a Korean-learning platform with guided lessons, TOPIK practice, dictation, shadowing, Anki-style spaced repetition, and classroom tools for teachers and students.

**Live site:** [lms.ankivn.com](https://lms.ankivn.com)

## Repository layout

- [`AnkiLMS/frontend`](AnkiLMS/frontend) — Next.js app, lesson content, static media, and Cloudflare Pages Functions.
- [`AnkiLMS/frontend/migrations`](AnkiLMS/frontend/migrations) — D1 database migrations.
- [`AnkiLMS/frontend/DEPLOYMENT.md`](AnkiLMS/frontend/DEPLOYMENT.md) — Cloudflare Pages setup and release notes.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
cd AnkiLMS/frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

Useful project commands:

```powershell
npm run typecheck
npm run lint
npm run build
```

## Deployment

The production app uses Cloudflare Pages with Pages Functions, D1, KV, and R2. Build and deployment configuration is in `AnkiLMS/frontend/wrangler.json`. Review the [deployment guide](AnkiLMS/frontend/DEPLOYMENT.md) before applying migrations or deploying.

Keep API credentials in Cloudflare encrypted secrets or local ignored environment files. Never commit credentials, user databases, or Wrangler state.

Korean pronunciation in the current interface uses the Korean voice available in the learner's browser/device; voice availability depends on that device's speech settings.

## Working on the project

The deployable application is in `AnkiLMS/frontend`; the repository root also contains local research and media inputs that are intentionally excluded from Git. Make application changes inside the frontend unless a task explicitly targets repository documentation.

Before changing the production setup, read the [Cloudflare deployment guide](AnkiLMS/frontend/DEPLOYMENT.md). It documents the Pages project, D1 migrations, sign-in configuration, and release checks.

For a typical local session:

```powershell
cd AnkiLMS/frontend
npm ci
npm run dev
```

Available checks are `npm run typecheck`, `npm run lint`, and `npm run build`. Production credentials belong in Cloudflare secrets or ignored local environment files. Do not add secrets, learner data, downloaded media, or `.wrangler` state to commits.

See [CONTRIBUTING.md](CONTRIBUTING.md) for focused change and review guidance.
