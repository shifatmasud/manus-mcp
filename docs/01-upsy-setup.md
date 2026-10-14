# 01 — Upsy setup

Connect `manus-mcp` to Upsy so your assistants can run Manus agents. Takes about a minute.

## What you need

- Your deployed endpoint, e.g. `https://manus-mcp.<your-subdomain>.workers.dev/mcp`
  (ours: `https://manus-mcp.shifatmasud.workers.dev/mcp`)
- A Manus credential — either:
  - **Option A — API key (easiest):** Manus web app → Developers settings → Create API Key, copy it.
  - **Option B — OAuth access token:** the `access_token` from your Manus Open App flow (acts on behalf of a user).

## Steps

1. Open Upsy → **Connectors** (or `upsy.ai/connectors/add`).
2. Search **"MCP"** → **Add MCP Server**.
3. Fill in the dialog:

   | Field | Value |
   |---|---|
   | **Name** | `Manus` (anything you like) |
   | **MCP Endpoint** | `https://manus-mcp.<your-subdomain>.workers.dev/mcp` — must end in `/mcp` |
   | **Token** | Your Manus API key or OAuth access token (paste the raw token, no `Bearer` prefix) |

4. Click **Add MCP Server**.
5. Upsy starts with the server **off for every assistant** — turn it **on** for the assistants that need it.

## Verify it worked

Ask your assistant (or call the tool directly):

```
manus_whoami  (no arguments)
```

**Good response** — your Manus identity:

```json
{
  "ok": true,
  "user_id": "114538005",
  "name": "Shifat Masud",
  "email": "shifatmasud@gmail.com"
}
```

**Bad response** — `Error: No Manus credential…` means the Token field didn't save. Re-open the connector, re-paste the token, save again. (Upsy reassigns the connector an internal ID like `mcp-xxxxxxx` when you edit it — that's normal.)

## Then try a real task

```
manus_create_task  →  {"prompt": "Reply with exactly the words MCP bridge test OK"}
manus_get_messages →  {"task_id": "<the task_id from above>", "limit": 5}
```

Expect the assistant message `"MCP bridge test OK"`. Full walkthrough: [05 — Testing](05-testing.md).

## Notes

- One connector serves **all** assistants you enable it for, but each assistant must be toggled on individually.
- The token belongs to **you** — assistants using this connector act as you in Manus (tasks appear in your account, spend your credits).
- To rotate the token, edit the connector and replace the Token value. No redeploy needed.
