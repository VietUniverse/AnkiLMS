# HaechiVN

HaechiVN is a Korean-learning LMS deployed on Cloudflare Pages at [lms.ankivn.com](https://lms.ankivn.com). Its Next.js static export is served from `out`, and its Pages Functions provide authentication and the application API using Cloudflare D1 and KV.

## Local development

```powershell
npm ci
npm run dev
```

## Validate a release

```powershell
npm run typecheck
npm run lint
npm run build
```

Review [DEPLOYMENT.md](./DEPLOYMENT.md) before changing the Cloudflare Pages deployment or applying D1 migrations.
