# 07 — Manus Flex & agent profiles

**Can I pass `agent_profile: "flex"` to choose the Manus Flex model?**

No — verified live on 2026-10-13. This page documents why, so nobody has to re-discover it.

## What Flex is

Manus Flex (launched 2026-09-29) is a **workspace-level** feature: you connect your own inference-provider key (OpenRouter, Fireworks, Modal — the initial partners) in the Manus web app, pick a model + reasoning effort there, and the Manus harness runs on it. Provider bills inference; Manus credits still cover tools/infrastructure. Announcement: [Introducing Manus Flex](https://manus.im/blog/introducing-manus-flex).

## What the API accepts

`task.create` / `task.sendMessage` accept only (per the [live docs](https://open.manus.ai/docs/v2/task.create) and the v2 OpenAPI spec — zero mentions of `flex`):

- `standard` (default), `lite`, `max`
- Thinking levels: `max-medium`, `max-high`, `max-extra`, `max-ultra`
- Versioned aliases: `1.6-lite`, `2.0-max`, `2.0-max-ultra`, legacy `manus-1.6-lite`

## The live proof

Sent through this very bridge:

```json
{ "tool": "manus_create_task",
  "arguments": { "prompt": "…", "agent_profile": "flex" } }
```

Manus API response:

```
invalid agent_profile: flex. Valid profiles are standard, lite, max,
max-medium, max-high, max-extra, max-ultra, or a versioned alias
such as 1.6-lite or 2.0-max-ultra
```

## What this means for you

Nothing to change in the worker. Tasks created via the MCP run under **whatever your workspace is configured with** — if Flex is your workspace inference, API-created tasks inherit it. To confirm, create a task through the bridge and check in the web app which model powered it.

## If Manus adds it later

If a `flex` profile (or a model-selection parameter) lands in the API, the fix is a one-line change: extend the `agent_profile` enum in `manus_create_task` in `worker.js` and redeploy ([Deploy guide](02-cloudflare-deploy.md)). The bridge passes the value straight through, so no other code changes.
