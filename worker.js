// Manus API bridge - remote MCP server (Streamable HTTP) for Cloudflare Workers.
// Single file, zero dependencies.
//
// Upsy setup: Name = anything, MCP Endpoint = https://<worker>/mcp,
// Token = Manus OAuth access token (JWT) or Manus API key.
// The token is forwarded per-request to https://api.manus.ai:
//   - JWT-like tokens (two dots) -> Authorization: Bearer <token>
//   - other tokens -> x-manus-api-key: <token>
// If no token is sent, the MANUS_API_KEY worker secret is used as fallback.

var MANUS_BASE = "https://api.manus.ai";
var CRLF = String.fromCharCode(13, 10);

var SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];
var SERVER_INFO = { name: "manus-mcp", version: "1.0.0" };

var TOOLS = [
  {
    name: "manus_whoami",
    description: "Identify the Manus user behind the current credential. Call this first to verify authentication works.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "manus_create_task",
    description: "Create a new Manus agent task with a text prompt. Returns the task_id, save it for follow-up calls.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The task instruction for the Manus agent." },
        title: { type: "string", description: "Optional custom title for the task." },
        agent_profile: { type: "string", description: "Optional profile: standard (default), lite, or max.", enum: ["standard", "lite", "max"] }
      },
      required: ["prompt"],
      additionalProperties: false
    }
  },
  {
    name: "manus_send_message",
    description: "Send a follow-up message to an existing Manus task (multi-turn conversation).",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID from manus_create_task." },
        message: { type: "string", description: "Follow-up text for the agent." }
      },
      required: ["task_id", "message"],
      additionalProperties: false
    }
  },
  {
    name: "manus_get_messages",
    description: "Read the messages and results of a Manus task. Poll this after creating a task to get the agent answer. Newest first by default.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The task ID to read." },
        limit: { type: "number", description: "Messages per page, 1-200. Default 20." },
        verbose: { type: "boolean", description: "Include tool-use and reasoning events. Default false." }
      },
      required: ["task_id"],
      additionalProperties: false
    }
  },
  {
    name: "manus_get_task",
    description: "Get the status and details of a Manus task (running, finished, waiting for input, etc.).",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "The task ID to inspect." } },
      required: ["task_id"],
      additionalProperties: false
    }
  },
  {
    name: "manus_list_tasks",
    description: "List recent Manus tasks, newest first.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "Tasks per page, max 100. Default 20." } },
      additionalProperties: false
    }
  },
  {
    name: "manus_stop_task",
    description: "Stop a running Manus task.",
    inputSchema: {
      type: "object",
      properties: { task_id: { type: "string", description: "The task ID to stop." } },
      required: ["task_id"],
      additionalProperties: false
    }
  }
];

function authHeaders(request, env) {
  var incoming = request.headers.get("Authorization") || "";
  var token = incoming.indexOf("Bearer ") === 0 ? incoming.slice(7).trim() : "";
  if (token) {
    if (token.split(".").length === 3) return { Authorization: "Bearer " + token };
    return { "x-manus-api-key": token };
  }
  if (env.MANUS_API_KEY) return { "x-manus-api-key": env.MANUS_API_KEY };
  return null;
}

function manusFetch(request, env, method, path, body, query) {
  var headers = authHeaders(request, env);
  if (!headers) {
    return Promise.reject(new Error("No Manus credential. Put your Manus OAuth token or API key in the Upsy Token field, or set the MANUS_API_KEY worker secret."));
  }
  var url = MANUS_BASE + path;
  if (query) {
    var qs = new URLSearchParams();
    var entries = Object.entries(query);
    for (var i = 0; i < entries.length; i++) {
      var v = entries[i][1];
      if (v !== undefined && v !== null && v !== "") qs.set(entries[i][0], String(v));
    }
    var s = qs.toString();
    if (s) url += "?" + s;
  }
  return fetch(url, {
    method: method,
    headers: { Authorization: headers.Authorization || "", "x-manus-api-key": headers["x-manus-api-key"] || "", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  }).then(function (res) {
    return res.text().then(function (text) {
      var data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
      if (!res.ok) {
        var msg = (data && (data.error ? data.error.message : data.message)) || ("Manus API error (HTTP " + res.status + ")");
        throw new Error(msg);
      }
      return data;
    });
  });
}

function textResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function callTool(name, args, request, env) {
  if (name === "manus_whoami") {
    return manusFetch(request, env, "GET", "/v2/user.me").then(textResult);
  }
  if (name === "manus_create_task") {
    var body = { message: { content: args.prompt } };
    if (args.title) body.title = args.title;
    if (args.agent_profile) body.agent_profile = args.agent_profile;
    return manusFetch(request, env, "POST", "/v2/task.create", body).then(textResult);
  }
  if (name === "manus_send_message") {
    return manusFetch(request, env, "POST", "/v2/task.sendMessage", { task_id: args.task_id, message: { content: args.message } }).then(textResult);
  }
  if (name === "manus_get_messages") {
    return manusFetch(request, env, "GET", "/v2/task.listMessages", undefined, { task_id: args.task_id, limit: args.limit || 20, verbose: args.verbose || false }).then(textResult);
  }
  if (name === "manus_get_task") {
    return manusFetch(request, env, "GET", "/v2/task.detail", undefined, { task_id: args.task_id }).then(textResult);
  }
  if (name === "manus_list_tasks") {
    return manusFetch(request, env, "GET", "/v2/task.list", undefined, { limit: args.limit || 20 }).then(textResult);
  }
  if (name === "manus_stop_task") {
    return manusFetch(request, env, "POST", "/v2/task.stop", { task_id: args.task_id }).then(textResult);
  }
  return Promise.reject(new Error("Unknown tool: " + name));
}

function rpcOk(id, result) {
  return Response.json({ jsonrpc: "2.0", id: id, result: result });
}

function rpcErr(id, code, message) {
  return Response.json({ jsonrpc: "2.0", id: id, error: { code: code, message: message } });
}

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.headers.set("Access-Control-Expose-Headers", "Mcp-Session-Id");
  return res;
}

function handleRpc(msg, request, env) {
  var method = msg ? msg.method : null;
  var params = msg ? msg.params : null;
  var id = msg ? msg.id : null;
  if (!method) return Promise.resolve(null);
  if (method === "ping") return Promise.resolve(rpcOk(id, {}));
  if (method === "initialize") {
    var asked = params ? params.protocolVersion : null;
    var version = SUPPORTED_PROTOCOLS.indexOf(asked) >= 0 ? asked : SUPPORTED_PROTOCOLS[0];
    return Promise.resolve(rpcOk(id, { protocolVersion: version, capabilities: { tools: {} }, serverInfo: SERVER_INFO }));
  }
  if (method === "notifications/initialized") return Promise.resolve(new Response(null, { status: 202 }));
  if (method === "tools/list") return Promise.resolve(rpcOk(id, { tools: TOOLS }));
  if (method === "tools/call") {
    var tname = params ? params.name : null;
    var targs = (params && params.arguments) ? params.arguments : {};
    return callTool(tname, targs, request, env).then(
      function (result) { return rpcOk(id, result); },
      function (e) { return rpcOk(id, { content: [{ type: "text", text: "Error: " + e.message }], isError: true }); }
    );
  }
  return Promise.resolve(rpcErr(id, -32601, "Method not found: " + method));
}

function helpPage(origin) {
  return "<!doctype html><html><head><meta charset=\"utf-8\"><title>manus-mcp</title></head><body style=\"font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px\">"
    + "<h1>manus-mcp</h1><p>Remote MCP server bridging the Manus API. Stateless Streamable HTTP.</p>"
    + "<h3>Connect from Upsy</h3><p><b>MCP Endpoint:</b> " + origin + "/mcp<br><b>Token:</b> your Manus OAuth access token or API key</p>"
    + "<h3>Tools</h3><ul><li>manus_whoami</li><li>manus_create_task</li><li>manus_send_message</li>"
    + "<li>manus_get_messages</li><li>manus_get_task</li><li>manus_list_tasks</li><li>manus_stop_task</li></ul></body></html>";
}

export default {
  fetch: function (request, env) {
    var url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (url.pathname === "/" && request.method === "GET") {
      return cors(new Response(helpPage(url.origin), { headers: { "Content-Type": "text/html;charset=utf-8" } }));
    }
    if (url.pathname === "/mcp" && request.method === "GET") {
      return cors(Response.json({ error: "Use POST for Streamable HTTP" }, { status: 405 }));
    }
    if (url.pathname === "/mcp" && request.method === "POST") {
      return request.json().then(function (msg) {
        if (Array.isArray(msg)) {
          var chain = Promise.resolve([]);
          msg.forEach(function (m) {
            chain = chain.then(function (out) {
              return handleRpc(m, request, env).then(function (r) {
                if (r && r.status !== 202) return r.json().then(function (j) { out.push(j); return out; });
                return out;
              });
            });
          });
          return chain.then(function (out) { return cors(Response.json(out.length ? out : null, { status: 202 })); });
        }
        return handleRpc(msg, request, env).then(function (res) {
          if (!res) return cors(new Response(null, { status: 202 }));
          return cors(res);
        });
      }, function () {
        return cors(rpcErr(null, -32700, "Parse error: invalid JSON"));
      });
    }
    return cors(new Response("Not found", { status: 404 }));
  }
};
