# manus-mcp

A remote MCP server that lets any MCP client drive the **Manus API** — create agent tasks, chat with them, and read results — hosted as a single zero-dependency file on **Cloudflare Workers**.

```
Upsy / Claude / any MCP client
        │  Streamable HTTP + Bearer token
        ▼
manus-mcp.<you>.workers.dev/mcp
        │  Manus API v2 (api.manus.ai)
        ▼
Manus agent tasks
```

**Live demo:** `https://manus-mcp.shifatmasud.workers.dev/mcp`

---

## Why this exists

Upsy's "Add MCP Server" dialog asks for two things: an **MCP Endpoint** and an optional **Token**. This repo gives you exactly that shape — no OAuth dance, no extra login screens. Paste your Manus token, and your assistant can run Manus agents.

## Features

- 🔌 **Remote MCP (Streamable HTTP)** — works with Upsy, Claude, Cursor, and any spec-compliant client
- 🔑 **Per-request Bearer passthrough** — each caller uses their own Manus credential
- 🧰 **8 focused tools** — whoami, create / message / read / inspect / list / stop / confirm tasks
- 🔄 **Auto-redeploy on push** — GitHub Actions + Wrangler (see [CI/CD](docs/08-cicd.md))
- 📦 **Single file, zero dependencies** — `worker.js`, ~11 KB, no build step
- 🌍 **Edge-hosted** — runs on Cloudflare Workers (`workers.dev`, or your own domain)

## Quick start (2 minutes)

1. **Deploy** — see [Cloudflare deploy guide](docs/02-cloudflare-deploy.md)
2. **Connect** — see [Upsy setup guide](docs/01-upsy-setup.md)
3. **Verify** — call `manus_whoami`, expect your Manus user back. See [Testing](docs/05-testing.md)

## Docs

| Guide | What you'll learn |
|---|---|
| [01 — Upsy setup](docs/01-upsy-setup.md) | Connect the server in Upsy's "Add MCP Server" dialog |
| [02 — Cloudflare deploy](docs/02-cloudflare-deploy.md) | Deploy (or redeploy) the worker, enable its public URL |
| [03 — Authentication](docs/03-authentication.md) | Which token to paste, how it's forwarded to Manus |
| [04 — Tools reference](docs/04-tools-reference.md) | Every tool, with arguments and examples |
| [05 — Testing](docs/05-testing.md) | Prove the loop works end-to-end with curl |
| [06 — Troubleshooting](docs/06-troubleshooting.md) | Fix the errors you'll actually hit |
| [07 — Manus Flex & profiles](docs/07-flex-and-profiles.md) | Why `agent_profile: "flex"` doesn't work (verified) |
| [08 — CI/CD](docs/08-cicd.md) | Auto-redeploy to Cloudflare on every push |

## Tools at a glance

| Tool | Purpose |
|---|---|
| `manus_whoami` | Verify auth — returns your Manus user |
| `manus_create_task` | Start a new agent task → returns `task_id` |
| `manus_send_message` | Follow up on a task (multi-turn) |
| `manus_get_messages` | Read results — poll this after creating a task |
| `manus_get_task` | Status & details of a task |
| `manus_list_tasks` | Recent tasks, newest first |
| `manus_stop_task` | Stop a running task |
| `manus_confirm_action` | Confirm a pending action on a waiting task |

Full schemas and examples: [Tools reference](docs/04-tools-reference.md).

## Repo layout

```
manus-mcp/
├── worker.js              # the entire server (deploy this)
├── wrangler.toml.example  # optional Wrangler config template
├── package.json           # optional local dev (wrangler)
├── docs/                  # human guides
│   ├── 01-upsy-setup.md
│   ├── 02-cloudflare-deploy.md
│   ├── 03-authentication.md
│   ├── 04-tools-reference.md
│   ├── 05-testing.md
│   ├── 06-troubleshooting.md
│   └── 07-flex-and-profiles.md
├── CHANGELOG.md
└── LICENSE
```

## Security notes

- The worker **never stores** your Manus token. It forwards the `Authorization` header it receives, per request.
- Prefer a **Manus API key scoped to what you need**, or a short-lived OAuth token.
- If you set the optional `MANUS_API_KEY` worker secret as a fallback, anyone with your endpoint URL can spend your Manus credits. Prefer per-user tokens (leave the secret unset) for shared servers.
- The worker speaks to only one upstream: `https://api.manus.ai`.

## License

MIT — see [LICENSE](LICENSE). Built for [Shifat Masud](https://github.com/shifatmasud).
