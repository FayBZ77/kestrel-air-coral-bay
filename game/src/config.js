// Kestrel Air — Coral Bay: shared tuning for the whole game.
// Every other src file reads its numbers from here so the world, the flight
// model and the scenery all agree with each other.
window.KA = window.KA || {};

KA.WORLD = {
  size: 6400,            // the island is a square this many metres across
  seaLevel: 0,
  airportElevation: 14,  // metres; the flattened field the runway sits on
  airportCenter: { x: 0, z: 420 },
  airportRadius: 620,    // terrain blends to flat inside this radius
  runwayLength: 920,
  runwayWidth: 42,
  runwayHeadingDeg: 360, // runway points north (-Z)
  cityCenter: { x: 1250, z: -350 },
  riverX: -620,          // the river runs north-south near this x
  lighthouse: { x: -1980, z: -1450 },
};

KA.FLIGHT = {
  maxThrust: 9.5,        // m/s^2 at full throttle
  idleSpeed: 0,
  rotateSpeed: 26,       // m/s, about 50 knots
  stallSpeed: 21,
  cruiseSpeed: 48,
  maxSpeed: 78,
  rollRate: 1.9,         // rad/s at full stick
  pitchRate: 1.15,
  maxBankDeg: 62,
  maxPitchDeg: 38,
  fuelCapacity: 100,     // percent units, one sortie is a few minutes
  fuelBurn: 0.55,        // percent per second at full throttle
  gearHeight: 1.55,      // metres from origin to the wheels
};

KA.PALETTE = {
  sky: 0x9fd4e8,
  horizon: 0xeaf6fb,
  sea: 0x1b6f8f,
  sand: 0xe3d29b,
  grass: 0x6fae4e,
  meadow: 0x8fbc5e,
  forest: 0x3e7d3a,
  rock: 0x8d8578,
  snow: 0xf4f7f7,
  asphalt: 0x33373b,
  livery: 0xf2f0ea,
  liveryAccent: 0xe8641e,
};

// The three ways a sortie can start; the menu and the screenshot runs both
// pick from this list.
KA.SCENARIOS = {
  runway: {
    title: 'Take off and fly the ring course',
    brief: 'Full throttle, ease back at 50 knots, then chase the amber rings.',
  },
  rings: {
    title: 'Ring run, already airborne',
    brief: 'Nine rings over the bay, the city and the river. Gold first, then follow the beacon.',
  },
  approach: {
    title: 'Land back at Coral Bay field',
    brief: 'You are on final, three kilometres out. Hold 55 knots and mind the PAPI lights.',
  },
};
