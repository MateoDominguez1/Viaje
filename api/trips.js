// API dei viaggi condivisi. Salva ogni viaggio come campo di un hash Redis (Upstash),
// così due persone che modificano viaggi diversi non si sovrascrivono a vicenda.
const crypto = require("crypto");

const KEY = "viaggi:trips";
const MAX_BYTES = 200 * 1024;

function env() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    password: process.env.APP_PASSWORD
  };
}

async function redis(cfg, command) {
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(data.error || "redis_" + r.status);
  return data.result;
}

function samePassword(given, expected) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const cfg = env();
  if (!cfg.url || !cfg.token || !cfg.password) {
    return res.status(503).json({ error: "not_configured" });
  }
  if (!samePassword(req.headers["x-app-key"], cfg.password)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const flat = (await redis(cfg, ["HGETALL", KEY])) || [];
      const trips = [];
      for (let i = 0; i < flat.length; i += 2) {
        try { trips.push(JSON.parse(flat[i + 1])); } catch (e) { /* ignora righe corrotte */ }
      }
      return res.status(200).json({ trips });
    }

    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
      const trip = body && body.trip;
      if (!trip || typeof trip !== "object" || !validId(trip.id)) {
        return res.status(400).json({ error: "invalid_trip" });
      }
      const json = JSON.stringify(trip);
      if (Buffer.byteLength(json) > MAX_BYTES) return res.status(413).json({ error: "too_large" });
      await redis(cfg, ["HSET", KEY, trip.id, json]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = req.query && req.query.id;
      if (!validId(id)) return res.status(400).json({ error: "invalid_id" });
      await redis(cfg, ["HDEL", KEY, id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(502).json({ error: "storage_error" });
  }
};
