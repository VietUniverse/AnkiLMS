# Deploy HaechiVN to Cloudflare Pages

The frontend and Pages Functions live in this directory. The configured Pages project is `haechivn-korean`, with the production site at `https://lms.ankivn.com`.

## Build settings

- Root directory: `AnkiLMS/frontend`
- Build command: `npm run build`
- Build output directory: `out`
- Node.js: use the version supported by the current Next.js release (Node.js 20.9 or newer)

Keep the D1 binding `DB` and KV binding `SESSIONS` attached to the Pages project. Their production IDs and the D1 migration directory are recorded in `wrangler.json`.

## Apply database migrations

For an existing production database, apply pending migrations before deploying code that uses the new tables or columns:

```powershell
npx wrangler d1 migrations apply haechivn-korean-db --remote
```

For a newly created, empty D1 database, initialize the base schema once first, then apply the migrations:

```powershell
npx wrangler d1 execute haechivn-korean-db --remote --file schema.sql
npx wrangler d1 migrations apply haechivn-korean-db --remote
```

## Google sign-in

Set the OAuth credentials as Pages secrets (never commit them):

```powershell
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name haechivn-korean
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name haechivn-korean
```

Register `https://lms.ankivn.com/api/auth/callback` as an authorized redirect URI in the Google OAuth client. Google sign-in stays unavailable until both secrets and the redirect URI are configured; email/password sign-in does not require them.

## Naver CLOVA Voice

The Korean pronunciation endpoint uses the NAVER Cloud Platform CLOVA Voice Premium API. Register an application in the NAVER Cloud Platform console, enable CLOVA Voice for that application, and copy its Client ID and Client Secret. Add them to the production Pages project as encrypted secrets (Wrangler prompts for each value; never commit them or paste them into source files):

```powershell
npx wrangler pages secret put CLOVA_VOICE_CLIENT_ID --project-name haechivn-korean
npx wrangler pages secret put CLOVA_VOICE_CLIENT_SECRET --project-name haechivn-korean
```

The endpoint reads these two secrets on each request, so a new deployment is not required after adding them. If CLOVA Voice is not enabled for the Naver application, the provider may reject requests even when both keys are present. Check the configured secrets by name only with `npx wrangler pages secret list --project-name haechivn-korean`; their values cannot be read back.

## Release checklist

1. Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build`.
2. Apply pending D1 migrations to the intended environment.
3. Deploy the `out` directory and Pages Functions to the existing `haechivn-korean` Pages project.
4. Confirm sign-up, sign-in, sign-out, check-in, study-session rewards, community, chat, feedback, and rewards on the production hostname.
5. Verify `lms.ankivn.com` is still the configured custom domain and HTTPS is active.

Do not deploy this site with `next start`; Cloudflare Pages serves the static export and `functions/` API routes.
