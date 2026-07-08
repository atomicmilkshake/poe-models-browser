// Tiny local proxy that:
//   1. Serves the static app (index.html, app.js, styles.css, benchmarks.json)
//   2. Forwards GET /api/models -> https://api.poe.com/v1/models with your key
//   3. Forwards GET /api/benchmarks -> https://openrouter.ai/api/v1/models (public, no key)
//
// Usage:
//   1. cp .env.example .env   (then fill in POE_API_KEY)
//   2. npm install
//   3. npm start
//   4. Open http://localhost:8787
//   5. In the app, set Endpoint URL (or Local proxy URL) = http://localhost:8787/api/models

const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 8787;
const ROOT = __dirname;

const POE_API_KEY = process.env.POE_API_KEY || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found: " + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
}

function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (upstream) => {
      let body = "";
      upstream.on("data", (c) => (body += c));
      upstream.on("end", () => {
        resolve({ status: upstream.statusCode, body });
      });
      upstream.on("error", reject);
    }).on("error", reject);
  });
}

async function handleProxy(req, res) {
  try {
    if (req.url.startsWith("/api/models")) {
      if (!POE_API_KEY) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "POE_API_KEY not set in .env" }));
        return;
      }
      const upstream = await fetchJson("https://api.poe.com/v1/models", {
        Authorization: `Bearer ${POE_API_KEY}`,
        Accept: "application/json"
      });
      res.writeHead(upstream.status, { "Content-Type": "application/json" });
      res.end(upstream.body);
      return;
    }

    if (req.url.startsWith("/api/benchmarks")) {
      const upstream = await fetchJson("https://openrouter.ai/api/v1/models", {
        Accept: "application/json"
      });
      res.writeHead(upstream.status, { "Content-Type": "application/json" });
      res.end(upstream.body);
      return;
    }

    serveStatic(req, res);
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Proxy error", message: String(err.message || err) }));
  }
}

const server = http.createServer(handleProxy);
server.listen(PORT, () => {
  console.log(`Poe Models Browser running at http://localhost:${PORT}`);
  console.log(`  POE_API_KEY: ${POE_API_KEY ? "set" : "NOT SET (edit .env)"}`);
  console.log(`  Benchmarks: OpenRouter public /api/v1/models (no key)`);
});
