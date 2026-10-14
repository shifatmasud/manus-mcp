# 02 — Cloudflare deploy

Deploy `worker.js` to your own Cloudflare account. Two paths: **API** (no login dance, scriptable) or **Wrangler** (nicer for iteration).

## What you need

- A Cloudflare account (free tier is fine). Note your **Account ID** (dash → Workers & Pages → right sidebar).
- The `worker.js` file from this repo.

## Path A — Cloudflare REST API (what we used)

Upload the script, then flip on its public URL. No npm, no OAuth browser flow.

### 1. Upload the worker

```bash
ACCOUNT_ID="your-account-id"
SCRIPT="manus-mcp"

curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}" \
  -H "Authorization: Bearer <CLOUDFLARE_API_TOKEN>" \
  -F 'metadata={"main_module":"worker.js","compatibility_date":"2025-06-01"};type=application/json' \
  -F 'worker.js=@./worker.js;type=application/javascript+module'
```

Your API token needs **Workers Scripts: Edit** permission (dash → My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers").

Expected: `"success": true` with `"id": "manus-mcp"` and `"handlers": ["fetch"]`.

### 2. Enable the public URL

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}/subdomain" \
  -H "Authorization: Bearer <CLOUDFLARE_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 3. Find your endpoint

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/subdomain" \
  -H "Authorization: Bearer <CLOUDFLARE_API_TOKEN>"
# → {"result":{"subdomain":"yourname"}, ...}
```

Your MCP endpoint is then:

```
https://manus-mcp.yourname.workers.dev/mcp
```

### 4. Smoke-test

```bash
curl -s -X POST "https://manus-mcp.yourname.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
| head -c 300
```

You should see the seven `manus_*` tool names. Full test script: [05 — Testing](05-testing.md).

## Path B — Wrangler (better for iterating)

```bash
npm i -g wrangler
cp wrangler.toml.example wrangler.toml   # fill in your account_id
wrangler deploy
```

Then enable `workers_dev` (it's `true` in the example, so the URL is live immediately).

## Redeploying after edits

Just repeat the upload (Path A step 1) or `wrangler deploy` (Path B). The endpoint URL doesn't change; Upsy needs no updates.

## Optional: custom domain

Workers & Pages → your worker → Settings → Domains & Routes → Add Custom Domain. Then your endpoint becomes `https://mcp.yourdomain.com/mcp`. Recommended if you share the server with others (cleaner than `workers.dev`, and you keep it if you rename things).

## Optional: server-side fallback key

If you want the server to answer even when a client sends no token, store a Manus API key as a secret:

```bash
wrangler secret put MANUS_API_KEY --name manus-mcp
```

⚠️ Think twice: with a fallback key set, **anyone who knows the URL can spend your Manus credits**. For personal use it's convenient; for anything shared, leave it unset and require per-user tokens (see [Authentication](03-authentication.md)).
