// Seed data for the QuickBook demo app. Reset to this between every benchmark run
// so DOM-mode and API-mode tasks always start from identical state.

function freshEvents() {
  return [
    { id: "1", title: "Indie Rock Night", category: "music", date: "2026-10-03", price: 25, seatsAvailable: 40, venue: "The Attic", description: "Three local bands, one small stage, loud amps." },
    { id: "2", title: "Jazz on the Rooftop", category: "music", date: "2026-10-10", price: 45, seatsAvailable: 20, venue: "Skyline Bar", description: "Sunset jazz trio, cocktails included." },
    { id: "3", title: "Intro to Woodworking", category: "workshop", date: "2026-10-05", price: 60, seatsAvailable: 8, venue: "Maker Space East", description: "Build a small stool. Tools provided." },
    { id: "4", title: "Sourdough Baking Basics", category: "workshop", date: "2026-10-12", price: 35, seatsAvailable: 12, venue: "Community Kitchen", description: "Starter, folds, and your first loaf." },
    { id: "5", title: "Stand-Up Comedy Open Mic", category: "comedy", date: "2026-10-04", price: 10, seatsAvailable: 60, venue: "Basement Club", description: "15 comedians, 5 minutes each, no mercy." },
    { id: "6", title: "Improv for Beginners", category: "comedy", date: "2026-10-18", price: 20, seatsAvailable: 15, venue: "Basement Club", description: "Yes-and your way through a Saturday night." },
    { id: "7", title: "City Marathon 10K Fun Run", category: "sports", date: "2026-10-25", price: 30, seatsAvailable: 200, venue: "Riverside Park", description: "10K loop along the river, medal at the finish." },
    { id: "8", title: "Beginner Rock Climbing", category: "sports", date: "2026-10-09", price: 40, seatsAvailable: 10, venue: "Vertical Gym", description: "Belay basics and your first climb." },
    { id: "9", title: "Watercolor Landscapes", category: "workshop", date: "2026-10-20", price: 28, seatsAvailable: 14, venue: "Art Loft", description: "Paint a landscape from reference photos." },
    { id: "10", title: "Classical Guitar Recital", category: "music", date: "2026-10-15", price: 18, seatsAvailable: 50, venue: "Conservatory Hall", description: "Student recital, Bach through Villa-Lobos." }
  ];
}

module.exports = { freshEvents };
