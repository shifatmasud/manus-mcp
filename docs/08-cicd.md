# 08 — Auto-redeploy on push (CI/CD)

Pushes to `main` that touch `worker.js` redeploy the worker automatically via GitHub Actions + Wrangler. One-time setup (5 minutes):

## 1. Create a Cloudflare API token

Cloudflare dash → My Profile → **API Tokens** → Create Token → use the **"Edit Cloudflare Workers"** template. It needs **Workers Scripts: Edit** on your account. Copy the token (shown once).

## 2. Add GitHub secrets

Repo → **Settings** → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | The token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID (Workers & Pages → right sidebar) |

## 3. Push

```bash
git push origin main
```

Actions → "Deploy to Cloudflare Workers" runs: syntax check → `wrangler deploy --name manus-mcp`. The endpoint URL doesn't change, so Upsy needs no updates.

## Notes

- The workflow only triggers when `worker.js` (or `wrangler.toml`, if you add one) changes — doc edits don't redeploy.
- `workflow_dispatch` lets you redeploy manually from the Actions tab.
- Wrangler needs no `wrangler.toml` here: `--name manus-mcp` plus the account ID from secrets is enough for this single-file worker. If you add a `wrangler.toml` later (e.g. for a custom domain or secrets), the workflow picks it up automatically.
- If a deploy fails, check the Actions log first, then the worker logs (dash → Workers & Pages → `manus-mcp` → Logs).
