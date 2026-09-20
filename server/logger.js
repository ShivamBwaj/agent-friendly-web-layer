const fs = require("fs");
const path = require("path");

const LOG_PATH = path.join(__dirname, "..", "logs", "requests.jsonl");

function classify(p) {
  if (p.startsWith("/api/capabilities") || p === "/api/manifest") return "api";
  if (p.startsWith("/api/_")) return "harness";
  return "dom";
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const originalPath = req.path; // capture now — Express mutates req.path when a sub-router mounts
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const mode = classify(originalPath);
    if (mode === "harness") return; // don't count our own reset/verify calls
    if (originalPath === "/favicon.ico") return; // browser chrome noise, not an agent action
    const entry = {
      ts: Date.now(),
      mode,
      method: req.method,
      path: originalPath,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      // a >=400 status on a mutating call is what we count as a "recovery" trigger downstream
      failed: res.statusCode >= 400
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  });
  next();
}

function resetLog() {
  fs.writeFileSync(LOG_PATH, "");
}

function readLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return fs
    .readFileSync(LOG_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

module.exports = { requestLogger, resetLog, readLog, LOG_PATH };
