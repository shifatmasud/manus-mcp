# 06 — Troubleshooting

The errors you'll actually hit, in the order you'll hit them.

## "No Manus credential…"

```
Error: No Manus credential. Put your Manus OAuth token or API key
in the Upsy Token field, or set the MANUS_API_KEY worker secret.
```

The worker got no `Authorization` header. Fix: open the Upsy connector, re-paste the token into **Token**, save. (Upsy renames the connector's internal ID when you edit — e.g. `mcp-7cmsittt` → `mcp-ndcjhbxw` — that's cosmetic, but update any hardcoded references.)

## "Unauthenticated" from Manus

Your token reached Manus but was rejected. Causes:

- Pasted with a leading/trailing space or the word `Bearer` included — paste the **raw** token.
- API key revoked or OAuth token expired — generate a fresh one.
- Wrong token type for the endpoint (rare) — try the other kind (API key vs OAuth).

Retest with `manus_whoami` (needs no scope, so it isolates auth from permissions).

## "invalid agent_profile: flex"

Expected — `flex` is not an API profile. Valid values: `standard`, `lite`, `max`, `max-medium`, `max-high`, `max-extra`, `max-ultra` (+ versioned aliases). Details: [Flex & profiles](07-flex-and-profiles.md).

## Empty task list / "task not found"

Almost always **OAuth scopes**, not a bug. A `create_task`-scoped token sees only tasks its own client created. Switch to a `manage_all_tasks` token (or an API key) to see everything. See [Authentication](03-authentication.md).

## Upsy says "arguments is not valid JSON"

You're calling through a generic bridge that wants the tool args in a specific envelope. Pass the inner arguments as a **native object**, not a JSON string:

```json
{ "app": "mcp-xxxxxxx", "tool": "manus_create_task",
  "arguments": { "prompt": "hello" } }
```

…not `"arguments": "{\"prompt\": \"hello\"}"`.

## Client can't connect to the endpoint

- URL must end in `/mcp`: `https://<worker>/mcp`, not the bare domain. (The bare domain shows a help page; `GET /mcp` returns 405 telling clients to POST.)
- Confirm `workers.dev` is enabled for the worker (Deploy guide, step 2) and the worker name matches the URL.
- `curl` the `tools/list` call from [Testing](05-testing.md) — if curl works, the problem is the client's config, not the server.

## Task never finishes

Some tasks pause for input (`waiting_for_event_id` in `manus_get_task`). Plain questions → answer via `manus_send_message`. Action confirmations (`confirm_input_schema`) → `manus_confirm_action` with `event_id` set to `waiting_for_event_id` and `input` built from the schema (see [Tools reference](04-tools-reference.md)). Or open `task_url` in the browser.

## Still stuck?

1. `manus_whoami` — isolates auth.
2. `tools/list` via curl — isolates the server.
3. Check the worker's logs: Cloudflare dash → Workers & Pages → `manus-mcp` → Logs.
4. Open an issue with the (redacted) error text and which step of [Testing](05-testing.md) failed.
