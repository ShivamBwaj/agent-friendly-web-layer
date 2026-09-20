const { freshEvents } = require("./data/seed");

// Single in-memory store shared by both the DOM UI routes and the agent-native
// capability routes. This is the point: identical business logic and state,
// two different interaction surfaces on top of it.
let events = freshEvents();
let bookings = [];
let nextBookingId = 1;

function reset() {
  events = freshEvents();
  bookings = [];
  nextBookingId = 1;
}

function listEvents({ q, category, maxPrice, date } = {}) {
  return events.filter((e) => {
    if (q && !`${e.title} ${e.description}`.toLowerCase().includes(String(q).toLowerCase())) return false;
    if (category && e.category !== category) return false;
    if (maxPrice && e.price > Number(maxPrice)) return false;
    if (date && e.date !== date) return false;
    return true;
  });
}

function getEvent(id) {
  return events.find((e) => e.id === String(id));
}

function compareEvents(ids) {
  return ids.map((id) => getEvent(id)).filter(Boolean);
}

function createBooking({ eventId, seats, name }) {
  const event = getEvent(eventId);
  if (!event) return { error: "no such event" };
  seats = Number(seats);
  if (!name || !seats || seats < 1) return { error: "name and seats(>=1) required" };
  if (seats > event.seatsAvailable) return { error: "not enough seats available" };
  event.seatsAvailable -= seats;
  const booking = { id: String(nextBookingId++), eventId, seats, name, status: "confirmed", createdAt: Date.now() };
  bookings.push(booking);
  return { booking };
}

function getBooking(id) {
  return bookings.find((b) => b.id === String(id));
}

function listBookingsByName(name) {
  return bookings.filter((b) => b.name.toLowerCase() === String(name).toLowerCase());
}

function updateBookingSeats(id, seats) {
  const booking = getBooking(id);
  if (!booking) return { error: "no such booking" };
  if (booking.status !== "confirmed") return { error: "booking not active" };
  seats = Number(seats);
  const event = getEvent(booking.eventId);
  const delta = seats - booking.seats;
  if (delta > 0 && delta > event.seatsAvailable) return { error: "not enough seats available" };
  event.seatsAvailable -= delta;
  booking.seats = seats;
  return { booking };
}

function cancelBooking(id) {
  const booking = getBooking(id);
  if (!booking) return { error: "no such booking" };
  if (booking.status === "cancelled") return { error: "already cancelled" };
  const event = getEvent(booking.eventId);
  event.seatsAvailable += booking.seats;
  booking.status = "cancelled";
  return { booking };
}

function dumpState() {
  return { events, bookings };
}

module.exports = {
  reset,
  listEvents,
  getEvent,
  compareEvents,
  createBooking,
  getBooking,
  listBookingsByName,
  updateBookingSeats,
  cancelBooking,
  dumpState
};
