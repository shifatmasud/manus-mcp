# Changelog

## 1.1.0 — 2026-10-14

- New tool: `manus_confirm_action` (`task.confirmAction`) — confirm pending actions on waiting tasks
- CI/CD: GitHub Actions auto-redeploys the worker on push (`docs/08-cicd.md`)
- Repo is now public

## 1.0.0 — 2026-10-14

Initial public release.

- Remote MCP server (Streamable HTTP) on Cloudflare Workers, single zero-dependency `worker.js`
- 7 tools: `manus_whoami`, `manus_create_task`, `manus_send_message`, `manus_get_messages`, `manus_get_task`, `manus_list_tasks`, `manus_stop_task`
- Per-request Bearer passthrough (JWT → `Authorization`, else `x-manus-api-key`), optional `MANUS_API_KEY` fallback secret
- Verified end-to-end via Upsy: auth → create → poll → read
- Verified `agent_profile: "flex"` is rejected by the Manus API (documented in `docs/07-flex-and-profiles.md`)
