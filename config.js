// ============================================================
//  TETAPAN / SETTINGS  — the only code file you normally edit
// ============================================================
window.CONFIG = {
  // Name shown beside the logo in the top ribbon
  surauName: "Selamat Datang ke Surau Ar-Raudhah TPSP",

  // Logo shown in the ribbon. Replace assets/logo.svg with your own file,
  // or point this to e.g. "assets/logo.png"
  logo: "assets/suraulogo.png",

  // Prayer times location (latitude / longitude of the surau).
  // Default below is around Sepang, Selangor. Get yours from Google Maps
  // (right-click the surau -> click the coordinates to copy them).
  latitude: 2.626569591839776,
  longitude: 101.70728155767213,

  // Calculation method 17 = JAKIM (Malaysia). Leave as is.
  method: 17,

  // Fine-tune each prayer in minutes if it doesn't match the official
  // JAKIM e-solat table for your zone (e.g. subuh: 1 adds one minute).
  adjustMinutes: { subuh: 0, zohor: 0, asar: 0, maghrib: 0, isyak: 0 },

  // Malaysia's Hijri date can differ by a day from the standard calendar.
  // If the Hijri date shown is wrong: use 1 (a day later) or -1 (a day earlier).
  hijriOffsetDays: 0,

  // Alerts
  alertMinutesBefore: 10,   // "10 minutes to prayer" alert starts this early
  alertAtTimeMinutes: 5,    // "Prayer time has entered" alert stays this long

  // Slideshow: seconds each slide is shown (can be overridden in slides.json)
  slideSeconds: 12,

  // Ticker speed in pixels per second (higher = faster)
  tickerSpeed: 90,

  // How often the page re-reads slides.json and ticker.txt (seconds)
  refreshSeconds: 60
};
