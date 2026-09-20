const express = require("express");
const store = require("./store");
const { resetLog, readLog } = require("./logger");

const router = express.Router();

// Harness-only endpoints. Never called as part of a task's task-solving —
// only used by the benchmark scripts to reset state and verify outcomes.
router.post("/_reset", (req, res) => {
  store.reset();
  resetLog();
  res.json({ ok: true });
});

router.get("/_state", (req, res) => {
  res.json(store.dumpState());
});

router.get("/_log", (req, res) => {
  res.json(readLog());
});

module.exports = router;
