import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

const httpServer = createServer((req, res) => {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

let clients = new Map();
let messages = [];
let typing = new Map();

function broadcast(obj, exceptId = null) {
  const data = JSON.stringify(obj);
  for (const [id, c] of clients.entries()) {
    if (exceptId && id === exceptId) continue;
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

function wipeIfEmpty() {
  if (clients.size === 0) {
    messages = [];
    typing.clear();
  }
}

const MAX_TEXT = 2000;

function normalizeOne(file) {
  if (!file || typeof file !== "object") return null;
  const out = {
    name: String(file.name ?? "").slice(0, 255) || "fichier",
    mime: String(file.mime ?? "").slice(0, 255) || "application/octet-stream",
    size: Number.isFinite(Number(file.size)) ? Number(file.size) : 0,
    data: typeof file.data === "string" ? file.data : String(file.data ?? ""),
  };
  if (!out.data) return null;
  return out;
}
function normalizeFiles(filesOrOne) {
  const arr = Array.isArray(filesOrOne)
    ? filesOrOne
    : filesOrOne
      ? [filesOrOne]
      : [];
  const out = [];
  for (const f of arr) {
    const n = normalizeOne(f);
    if (n) out.push(n);
  }
  return out;
}

const wss = new WebSocketServer({ server: httpServer, maxPayload: 0 });

wss.on("connection", (ws) => {
  const id = nanoid(8);
  let name = null;

  const send = (o) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o));
  };

  ws.on("error", (err) =>
    console.warn("WS client error:", err?.message || err)
  );

  send({ type: "hello", askName: true });

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return send({ type: "error", message: "bad_json" });
    }

    if (msg.type === "auth") {
      if (!msg.name || typeof msg.name !== "string" || !msg.name.trim()) {
        return send({ type: "error", message: "invalid_name" });
      }
      name = msg.name.trim().slice(0, 32);
      clients.set(id, { ws, name });

      send({
        type: "welcome",
        self: { id, name },
        users: Array.from(clients.entries()).map(([cid, c]) => ({
          id: cid,
          name: c.name,
        })),
        history: messages,
        typing: Array.from(typing.entries()).map(([tid, t]) => ({
          id: tid,
          name: t.name,
          text: t.text,
        })),
      });

      broadcast({ type: "user_joined", id, name }, id);
      return;
    }

    if (!clients.has(id)) {
      return send({ type: "error", message: "unauthorized" });
    }

    if (msg.type === "typing") {
      const text = (msg.text ?? "").toString().slice(0, 500);
      if (text.length) typing.set(id, { name, text });
      else typing.delete(id);
      broadcast({ type: "typing", id, name, text }, id);
      return;
    }

    if (msg.type === "message") {
      const text = (msg.text ?? "").toString().trim().slice(0, MAX_TEXT);

      const files = normalizeFiles(msg.files ?? msg.file);

      if (!text && files.length === 0) {
        console.warn("DROP message: empty (no text, no files)");
        return send({ type: "error", message: "empty_message" });
      }

      const payload = {
        type: "message",
        id,
        name,
        text: text || null,
        files,
        ts: Date.now(),
      };

      messages.push({
        id,
        name,
        text: payload.text,
        files: payload.files,
        ts: payload.ts,
      });
      typing.delete(id);
      broadcast(payload);
      return;
    }

    if (msg.type === "who") {
      return send({
        type: "users",
        users: Array.from(clients.entries()).map(([cid, c]) => ({
          id: cid,
          name: c.name,
        })),
      });
    }

    send({ type: "error", message: "unknown_type" });
  });

  ws.on("close", () => {
    const hadClient = clients.delete(id);
    typing.delete(id);
    if (hadClient && name) broadcast({ type: "user_left", id, name });
    wipeIfEmpty();
  });
});

wss.on("error", (err) => console.warn("WSS error:", err?.message || err));

httpServer.listen(PORT, () => {
  console.log("HTTP+WS on http://localhost:" + PORT);
});
