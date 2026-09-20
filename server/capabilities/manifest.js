// The "agent-friendly web layer": a machine-readable manifest of the same
// operations the DOM UI exposes, described the way an MCP/WebMCP tool list
// would describe them. An agent-native client reads this once and then calls
// capabilities directly — no page parsing, no navigation, no form-filling.

const MANIFEST = {
  capabilities: [
    {
      name: "search_events",
      description: "Search events by free-text keyword against title and description.",
      method: "GET",
      path: "/api/capabilities/search",
      params: { q: { type: "string", required: true } }
    },
    {
      name: "filter_events",
      description: "Filter events by category, max price, and/or exact date.",
      method: "GET",
      path: "/api/capabilities/filter",
      params: {
        category: { type: "string", enum: ["music", "workshop", "comedy", "sports"], required: false },
        maxPrice: { type: "number", required: false },
        date: { type: "string", format: "YYYY-MM-DD", required: false }
      }
    },
    {
      name: "compare_events",
      description: "Compare two or more events side by side (price, date, venue, seats).",
      method: "GET",
      path: "/api/capabilities/compare",
      params: { ids: { type: "array<string>", required: true } }
    },
    {
      name: "book_event",
      description: "Create a booking for an event under a given name.",
      method: "POST",
      path: "/api/capabilities/book",
      params: {
        eventId: { type: "string", required: true },
        seats: { type: "number", required: true },
        name: { type: "string", required: true }
      }
    },
    {
      name: "update_booking",
      description: "Change the seat count on an existing confirmed booking.",
      method: "PATCH",
      path: "/api/capabilities/bookings/:id",
      params: { id: { type: "string", required: true, in: "path" }, seats: { type: "number", required: true } }
    },
    {
      name: "cancel_booking",
      description: "Cancel an existing booking and release its seats back to the event.",
      method: "DELETE",
      path: "/api/capabilities/bookings/:id",
      params: { id: { type: "string", required: true, in: "path" } }
    },
    {
      name: "get_bookings",
      description: "List bookings made under a given name.",
      method: "GET",
      path: "/api/capabilities/bookings",
      params: { name: { type: "string", required: true } }
    }
  ]
};

module.exports = { MANIFEST };
