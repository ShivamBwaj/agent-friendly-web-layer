const express = require("express");
const store = require("./store");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("home");
});

router.get("/events", (req, res) => {
  const events = store.listEvents(req.query);
  res.render("events", { events });
});

router.get("/events/:id", (req, res) => {
  const event = store.getEvent(req.params.id);
  if (!event) return res.status(404).send("Event not found");
  res.render("event_detail", { event });
});

router.get("/compare", (req, res) => {
  let ids = req.query.ids || [];
  if (!Array.isArray(ids)) ids = [ids];
  const events = store.compareEvents(ids);
  res.render("compare", { events });
});

router.post("/bookings", (req, res) => {
  const { eventId, seats, name } = req.body;
  const result = store.createBooking({ eventId, seats, name });
  if (result.error) return res.status(400).send(`Booking failed: ${result.error}`);
  const event = store.getEvent(eventId);
  res.render("booking_confirm", { booking: result.booking, event });
});

router.get("/bookings", (req, res) => {
  const { name } = req.query;
  if (!name) return res.render("bookings", { bookings: [], name: "", error: null });
  const bookings = store.listBookingsByName(name).map((b) => ({ ...b, event: store.getEvent(b.eventId) }));
  res.render("bookings", { bookings, name, error: null });
});

router.post("/bookings/:id/update", (req, res) => {
  const result = store.updateBookingSeats(req.params.id, req.body.seats);
  if (result.error) {
    const bookings = store.listBookingsByName(req.body.name || "").map((b) => ({ ...b, event: store.getEvent(b.eventId) }));
    return res.status(400).render("bookings", { bookings, name: req.body.name || "", error: result.error });
  }
  res.redirect("/bookings?name=" + encodeURIComponent(req.body.name || ""));
});

router.post("/bookings/:id/cancel", (req, res) => {
  const result = store.cancelBooking(req.params.id);
  if (result.error) {
    const bookings = store.listBookingsByName(req.body.name || "").map((b) => ({ ...b, event: store.getEvent(b.eventId) }));
    return res.status(400).render("bookings", { bookings, name: req.body.name || "", error: result.error });
  }
  res.redirect("/bookings?name=" + encodeURIComponent(req.body.name || ""));
});

module.exports = router;
