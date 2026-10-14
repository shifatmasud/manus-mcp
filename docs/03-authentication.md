# 03 — Authentication

How credentials flow from your MCP client, through the worker, to Manus — and which token to use.

## The chain

```
Upsy "Token" field
        │  Authorization: Bearer <token>   (MCP client → worker)
        ▼
worker.js  (authHeaders)
        ├── token looks like a JWT (two dots) → Authorization: Bearer <token>
        └── anything else                     → x-manus-api-key: <token>
        ▼
https://api.manus.ai  (Manus API v2)
```

This mirrors the [Manus auth contract](https://open.manus.ai/docs/v2/authentication):
API keys travel in `x-manus-api-key`; third-party OAuth2 apps acting on behalf of a user travel in `Authorization: Bearer {access_token}`.

## Which token should I paste?

| Credential | Where to get it | Acts as | Best for |
|---|---|---|---|
| **Manus API key** | Manus web app → Developers settings → Create API Key | You, full access | Personal use, quick setup |
| **OAuth access token** | Your Manus Open App authorization flow | The authorizing user, scoped (`create_task`, `manage_all_tasks`, …) | Multi-user / third-party apps |

Notes:

- Standard OAuth clients are scope-restricted: `create_task` sees only tasks created by the same client. If your `manus_list_tasks` looks empty, that's why — the tasks exist, your token just can't see other clients' tasks. `manage_all_tasks` or a trusted client lifts this.
- `manus_whoami` (`user.me`) needs **no scope** — it's the perfect first call to prove a token works.
- Tokens are per-request. The worker **never stores** them. Rotate by editing the Upsy connector; no redeploy.

## The fallback secret

If the incoming request has no `Authorization` header, the worker falls back to a `MANUS_API_KEY` secret (if you set one — see [Deploy](02-cloudflare-deploy.md)). Priority:

1. Request's Bearer token (always wins)
2. `MANUS_API_KEY` secret
3. Otherwise → clean `isError` telling the caller to add a token

Leave the secret **unset** unless you have a reason — per-user tokens are safer.

## What the worker never does

- Never logs tokens, never forwards them anywhere except `api.manus.ai`.
- Never calls Manus endpoints beyond the seven tools' needs (`user.me`, `task.*`).
- Never accepts tokens via query strings (headers only — they stay out of logs).
