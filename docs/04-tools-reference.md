# 04 — Tools reference

Eight tools. Each maps to one Manus API v2 endpoint. Results come back as pretty-printed JSON in a single text block.

> Conventions: `task_id` is the 22-character ID returned by `manus_create_task`
> (or the shortcut `agent-default-main_task` for the default IM agent).
> Tasks run **asynchronously** — create, then poll `manus_get_messages`.

---

## manus_whoami

Identify the Manus user behind the current credential. **Call this first.**

- **Arguments:** none
- **Upstream:** `GET /v2/user.me` (no OAuth scope required)
- **Example:**
  ```json
  { "jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": { "name": "manus_whoami", "arguments": {} } }
  ```
- **Returns:** `{ok, user_id, name, email, avatar_url, …}`

## manus_create_task

Start a new agent task.

- **Arguments:**

  | Field | Type | Required | Notes |
  |---|---|---|---|
  | `prompt` | string | ✅ | The instruction. Keep user text ≈ under 5,000 tokens |
  | `title` | string | – | Custom title; auto-generated if omitted |
  | `agent_profile` | enum | – | `standard` (default), `lite`, `max` |

- **Upstream:** `POST /v2/task.create`
- **Returns:** `{ok, task_id, task_title, task_url, …}` — **save `task_id`**.
- **Example:**
  ```json
  { "prompt": "Summarize today's AI news in 5 bullets", "title": "Morning brief" }
  ```

## manus_send_message

Follow-up message on an existing task (multi-turn).

- **Arguments:** `task_id` ✅, `message` ✅
- **Upstream:** `POST /v2/task.sendMessage`
- **Tip:** if the agent asked a normal question, answer here. If it is an *action confirmation* (`waiting_for_event_id` + `confirm_input_schema` in task detail), use `manus_confirm_action`.

## manus_get_messages

Read a task's messages and results. **Poll this** after creating a task.

- **Arguments:** `task_id` ✅, `limit` (1–200, default 20), `verbose` (default `false`; `true` adds tool-use & reasoning events)
- **Upstream:** `GET /v2/task.listMessages` (newest first by default)
- **Reading results:** the agent's answer is the `assistant_message` with `"delivery_kind": "result"`. A `status_update` with `"agent_status": "stopped"` means it's done.
- **Polling pattern:** call every ~10–20 s until you see `stopped`, then read the latest `assistant_message`. Don't treat the *first* stopped event as final if background jobs may still run — check `has_running_background_jobs` via `manus_get_task`.

## manus_get_task

Status and details of a task.

- **Arguments:** `task_id` ✅
- **Upstream:** `GET /v2/task.detail`
- **Use it for:** `status` / `agent_status`, waiting-state detection, task URL.

## manus_list_tasks

Recent tasks, newest first.

- **Arguments:** `limit` (max 100, default 20)
- **Upstream:** `GET /v2/task.list`
- **Scope gotcha:** with a `create_task`-scoped OAuth token you only see tasks your own client created. Missing tasks usually mean scopes, not bugs — see [Authentication](03-authentication.md).

## manus_stop_task

Stop a running task.

- **Arguments:** `task_id` ✅
- **Upstream:** `POST /v2/task.stop`

## manus_confirm_action

Confirm a pending action on a waiting task.

- **Arguments:** `task_id` ✅, `event_id` ✅ (the `waiting_for_event_id` from the waiting `status_update`), `input` (object matching the event's `confirm_input_schema`; omit for simple confirmations)
- **Upstream:** `POST /v2/task.confirmAction`
- **Flow:** `manus_get_task` shows `agent_status: waiting` → `manus_get_messages` with `verbose: true` to find the waiting event and its `confirm_input_schema` + tool params → build `input` → call this.
- **Do NOT use for plain questions** (`messageAskUser` / `cascadeAskUser`) — answer those with `manus_send_message`. Never auto-confirm an action you don't understand.

---

## Error shape

Tool failures never break the JSON-RPC envelope — they come back as a normal result with `isError: true`:

```json
{ "content": [{ "type": "text", "text": "Error: <what happened>" }], "isError": true }
```

Common messages and fixes: [Troubleshooting](06-troubleshooting.md).
