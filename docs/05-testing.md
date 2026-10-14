# 05 — Testing

Prove the whole loop with curl. Set your endpoint once, then run top to bottom (~1 minute).

```bash
MCP="https://manus-mcp.<your-subdomain>.workers.dev/mcp"
TOKEN="<your Manus API key or OAuth token>"
```

## 1. Handshake

```bash
curl -s -X POST "$MCP" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
       "params":{"protocolVersion":"2025-06-18","capabilities":{},
                 "clientInfo":{"name":"curl-test","version":"1.0"}}}'
```

Expect: `serverInfo: {"name":"manus-mcp","version":"1.0.0"}` and the protocol version echoed back.

## 2. Tool list

```bash
curl -s -X POST "$MCP" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
| python3 -c "import json,sys; print([t['name'] for t in json.load(sys.stdin)['result']['tools']])"
```

Expect: all seven `manus_*` names.

## 3. Auth (`manus_whoami`)

```bash
curl -s -X POST "$MCP" -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"manus_whoami","arguments":{}}}'
```

Expect: your Manus user (`ok: true`, `user_id`, `name`, `email`).
Without the header, expect the clean `No Manus credential…` error — that proves passthrough works.

## 4. Full loop (create → poll → read)

```bash
# create
TASK=$(curl -s -X POST "$MCP" -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call",
       "params":{"name":"manus_create_task",
                 "arguments":{"prompt":"Reply with exactly the words MCP bridge test OK",
                              "title":"MCP bridge test"}}}' \
| python3 -c "import json,sys; print(json.loads(json.load(sys.stdin)['result']['content'][0]['text'])['task_id'])")
echo "task: $TASK"

# wait for the agent, then read
sleep 25
curl -s -X POST "$MCP" -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",
       \"params\":{\"name\":\"manus_get_messages\",
                 \"arguments\":{\"task_id\":\"$TASK\",\"limit\":5}}}" \
| python3 -m json.tool | head -n 60
```

Expect an `assistant_message` with `"content": "MCP bridge test OK"` and a `status_update` showing `stopped`. If the agent is still `running`, wait and re-run the read.

## 5. Cleanup (optional)

```bash
curl -s -X POST "$MCP" -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":6,\"method\":\"tools/call\",
       \"params\":{\"name\":\"manus_stop_task\",\"arguments\":{\"task_id\":\"$TASK\"}}}"
```

(Only needed if the task is still running; finished test tasks can just stay in your history.)

## What "passing" looks like

| Step | Pass signal |
|---|---|
| Handshake | `serverInfo.name === "manus-mcp"` |
| Tools | 7 tools listed |
| Auth | `ok: true` + your email |
| Loop | agent echoes `MCP bridge test OK`, status `stopped` |

Anything else → [Troubleshooting](06-troubleshooting.md).
