// server/index.js
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;

// ============================
// HTTP ultra-minimal (no HTML)
// ============================
const httpServer = createServer((req, res) => {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

// ============================
// État en mémoire (volatile)
// ============================
let clients = new Map(); // id -> { ws, name }
let messages = []; // { id, name, text, ts }
let typing = new Map(); // id -> { name, text }

function broadcast(obj, exceptId = null) {
  const data = JSON.stringify(obj);
  for (const [id, c] of clients.entries()) {
    if (exceptId && id === exceptId) continue;
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(data);
  }
}

function wipeIfEmpty() {
  if (clients.size === 0) {
    messages = [];
    typing.clear();
  }
}

// ===========
// WebSocket
// ===========
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  const id = nanoid(8);
  let name = null;

  const send = (o) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(o));

  // Demande d’auth (pseudo)
  send({ type: "hello", askName: true });

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return send({ type: "error", message: "bad_json" });
    }

    // auth
    if (msg.type === "auth") {
      if (!msg.name || typeof msg.name !== "string" || !msg.name.trim()) {
        return send({ type: "error", message: "invalid_name" });
      }
      name = msg.name.trim().slice(0, 32);
      clients.set(id, { ws, name });

      // snapshot initial
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

      // notifier les autres
      broadcast({ type: "user_joined", id, name }, id);
      return;
    }

    // Si pas auth, on refuse le reste
    if (!clients.has(id)) {
      return send({ type: "error", message: "unauthorized" });
    }

    // typing en direct
    if (msg.type === "typing") {
      const text = (msg.text ?? "").toString().slice(0, 500);
      if (text.length) {
        typing.set(id, { name, text });
      } else {
        typing.delete(id);
      }
      broadcast({ type: "typing", id, name, text }, id);
      return;
    }

    // envoi message
    if (msg.type === "message") {
      const text = (msg.text ?? "").toString().trim().slice(0, 2000);
      if (!text) return;
      const payload = { type: "message", id, name, text, ts: Date.now() };
      messages.push({ id, name, text, ts: payload.ts });
      typing.delete(id); // stop typing auteur
      broadcast(payload);
      return;
    }

    // liste users (optionnel)
    if (msg.type === "who") {
      return send({
        type: "users",
        users: Array.from(clients.entries()).map(([cid, c]) => ({
          id: cid,
          name: c.name,
        })),
      });
    }

    // inconnu
    send({ type: "error", message: "unknown_type" });
  });

  ws.on("close", () => {
    const hadClient = clients.delete(id);
    typing.delete(id);
    if (hadClient && name) {
      broadcast({ type: "user_left", id, name });
    }
    wipeIfEmpty();
  });
});

httpServer.listen(PORT, () => {
  console.log("HTTP+WS on http://localhost:" + PORT);
});
