const express = require("express");
const store = require("../store");
const { MANIFEST } = require("./manifest");

const router = express.Router();

router.get("/manifest", (req, res) => res.json(MANIFEST));

router.get("/capabilities/search", (req, res) => {
  res.json({ events: store.listEvents({ q: req.query.q }) });
});

router.get("/capabilities/filter", (req, res) => {
  res.json({ events: store.listEvents(req.query) });
});

router.get("/capabilities/compare", (req, res) => {
  let ids = req.query.ids || [];
  if (!Array.isArray(ids)) ids = String(ids).split(",");
  res.json({ events: store.compareEvents(ids) });
});

router.post("/capabilities/book", (req, res) => {
  const result = store.createBooking(req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.get("/capabilities/bookings", (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: "name is required" });
  res.json({ bookings: store.listBookingsByName(name) });
});

router.patch("/capabilities/bookings/:id", (req, res) => {
  const result = store.updateBookingSeats(req.params.id, req.body.seats);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.delete("/capabilities/bookings/:id", (req, res) => {
  const result = store.cancelBooking(req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

module.exports = router;
