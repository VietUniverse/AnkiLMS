# Contributing to HaechiVN

Thanks for helping improve the Korean-learning platform. Keep changes focused so maintainers can review them quickly.

## Before opening a pull request

- Describe the learner, teacher, or maintainer problem the change solves.
- For interface changes, include the affected route and a screenshot when it helps explain the result.
- For lesson or transcript updates, identify the source and verify timestamps against the media. Do not present unverified speech recognition as a checked transcript.
- Keep credentials, learner records, downloaded media, generated build output, and local Wrangler state out of commits. Use Cloudflare encrypted secrets for production credentials.

## Review notes

Include the checks you ran and any checks you could not run. Call out database migrations, Cloudflare bindings, or environment variables that a deploy would need. Documentation-only changes should say so explicitly.

See the [deployment guide](AnkiLMS/frontend/DEPLOYMENT.md) before changing production configuration.
