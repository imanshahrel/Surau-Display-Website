(() => {
  "use strict";
  const C = window.CONFIG;
  const TZ = "Asia/Kuala_Lumpur";
  const $ = (id) => document.getElementById(id);

  const PRAYERS = [
    { key: "subuh",   label: "Subuh",   api: "Fajr" },
    { key: "zohor",   label: "Zohor",   api: "Dhuhr" },
    { key: "asar",    label: "Asar",    api: "Asr" },
    { key: "maghrib", label: "Maghrib", api: "Maghrib" },
    { key: "isyak",   label: "Isyak",   api: "Isha" }
  ];
  const DAYS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  const MONTHS = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  const HIJRI_MONTHS = ["Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"];

  // ---------- Time helpers (always Malaysia time, whatever the device says) ----------
  // Testing: add ?at=12:49 to the URL to pretend it is 12:49 today.
  let debugOffsetMs = 0;
  const at = new URLSearchParams(location.search).get("at");
  if (at && /^\d{1,2}:\d{2}$/.test(at)) {
    const [h, m] = at.split(":").map(Number);
    const k = klParts(new Date());
    debugOffsetMs = ((h * 3600 + m * 60) - (k.h * 3600 + k.mi * 60 + k.s)) * 1000;
  }
  const now = () => new Date(Date.now() + debugOffsetMs);

  function klParts(d) {
    const p = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23"
    }).formatToParts(d).forEach((x) => { if (x.type !== "literal") p[x.type] = parseInt(x.value, 10); });
    // Weekday from the KL calendar date itself
    const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second, wd };
  }

  function hijriString(y, mo, d) {
    // Use noon UTC of the KL calendar date, then shift by the configured offset
    const base = new Date(Date.UTC(y, mo - 1, d, 12) + (C.hijriOffsetDays || 0) * 86400000);
    const p = {};
    new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      timeZone: "UTC", day: "numeric", month: "numeric", year: "numeric"
    }).formatToParts(base).forEach((x) => { if (x.type !== "literal") p[x.type] = x.value; });
    const year = String(p.year).replace(/\D/g, "");
    return `${p.day} ${HIJRI_MONTHS[parseInt(p.month, 10) - 1]} ${year}H`;
  }

  // ---------- Prayer times (aladhan.com, JAKIM method, cached per month) ----------
  const monthCache = {}; // "2026-11" -> { 1: {subuh:"05:49",...}, ... }
  const pad = (n) => String(n).padStart(2, "0");

  async function loadMonth(y, mo) {
    const key = `${y}-${pad(mo)}`;
    if (monthCache[key]) return monthCache[key];
    const lsKey = `prayer-${C.latitude}-${C.longitude}-${C.method}-${key}`;
    try {
      const saved = JSON.parse(localStorage.getItem(lsKey) || "null");
      if (saved) return (monthCache[key] = saved);
    } catch (e) {}
    const url = `https://api.aladhan.com/v1/calendar/${y}/${mo}?latitude=${C.latitude}&longitude=${C.longitude}&method=${C.method}&timezonestring=${TZ}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const out = {};
    json.data.forEach((row, i) => {
      const day = {};
      PRAYERS.forEach((p) => { day[p.key] = row.timings[p.api].slice(0, 5); });
      out[i + 1] = day;
    });
    try { localStorage.setItem(lsKey, JSON.stringify(out)); } catch (e) {}
    return (monthCache[key] = out);
  }

  let today = null; // { subuh: minutesOfDay, ... , raw: {...} }
  let todayKey = "";

  async function ensureToday() {
    const k = klParts(now());
    const key = `${k.y}-${k.mo}-${k.d}`;
    if (key === todayKey && today) return;
    try {
      const month = await loadMonth(k.y, k.mo);
      const raw = month[k.d];
      const t = { raw: {} };
      PRAYERS.forEach((p) => {
        const [h, m] = raw[p.key].split(":").map(Number);
        const mins = h * 60 + m + ((C.adjustMinutes && C.adjustMinutes[p.key]) || 0);
        t[p.key] = mins;
        t.raw[p.key] = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
      });
      today = t;
      todayKey = key;
      renderPrayers();
      // Warm up next month's cache near month end
      if (k.d >= 25) {
        const nm = k.mo === 12 ? 1 : k.mo + 1;
        loadMonth(k.mo === 12 ? k.y + 1 : k.y, nm).catch(() => {});
      }
    } catch (e) {
      console.warn("Prayer times unavailable:", e);
      setTimeout(ensureToday, 5 * 60 * 1000);
    }
  }

  // ---------- Rendering ----------
  function fmt12(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
  }

  function renderPrayers() {
    const ul = $("prayers");
    if (!ul.children.length) {
      PRAYERS.forEach((p) => {
        const li = document.createElement("li");
        li.className = "prayer";
        li.id = "p-" + p.key;
        li.innerHTML = `<span class="name">${p.label}</span><span class="time">--:--</span>`;
        ul.appendChild(li);
      });
    }
    if (!today) return;
    const k = klParts(now());
    const nowMin = k.h * 60 + k.mi;
    let nextKey = null;
    for (const p of PRAYERS) { if (today[p.key] > nowMin) { nextKey = p.key; break; } }
    PRAYERS.forEach((p) => {
      const li = $("p-" + p.key);
      li.querySelector(".time").textContent = fmt12(today[p.key]);
      li.classList.toggle("passed", today[p.key] <= nowMin);
      li.classList.toggle("next", p.key === nextKey);
    });
  }

  function tick() {
    const d = now();
    const k = klParts(d);
    $("clockTime").textContent = `${((k.h + 11) % 12) + 1}:${pad(k.mi)}`;
    $("clockAmpm").textContent = k.h >= 12 ? "PM" : "AM";
    $("dateDay").textContent = DAYS[k.wd];
    $("dateGreg").textContent = `${k.d} ${MONTHS[k.mo - 1]} ${k.y}`;
    $("dateHijri").textContent = hijriString(k.y, k.mo, k.d);
    ensureToday();
    renderPrayers();
    updateAlert(k);
  }

  // ---------- Alerts ----------
    function updateAlert(k) {
    const box = $("alert");
    const card = box.querySelector(".alert-card");
    const icon = $("alertIcon");
    if (!today) { box.hidden = true; return; }
    const nowSec = k.h * 3600 + k.mi * 60 + k.s;
    const pre = (C.alertMinutesBefore || 10) * 60;
    const post = (C.alertAtTimeMinutes || 2) * 60;
    const iq = (C.iqamahCountdownMinutes || 10) * 60;
    icon.hidden = true;
    card.classList.remove("iqamah");
    for (const p of PRAYERS) {
      const t = today[p.key] * 60;
      // 1) countdown to prayer time
      if (nowSec >= t - pre && nowSec < t) {
        const left = t - nowSec;
        $("alertKicker").textContent = `${Math.ceil(left / 60)} minit lagi menjelang waktu`;
        $("alertTitle").textContent = p.label;
        $("alertSub").textContent = `${fmt12(today[p.key])} · ${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
        box.hidden = false;
        return;
      }
      // 2) prayer time has entered
      if (nowSec >= t && nowSec < t + post) {
        $("alertKicker").textContent = "Telah masuk waktu";
        $("alertTitle").textContent = p.label;
        $("alertSub").textContent = "Marilah menunaikan solat, luruskan dan rapatkan saf";
        box.hidden = false;
        return;
      }
      // 3) countdown to iqamah
      if (nowSec >= t + post && nowSec < t + post + iq) {
        const left = t + post + iq - nowSec;
        $("alertKicker").textContent = `${Math.ceil(left / 60)} minit lagi menjelang iqamah ${p.label}`;
        $("alertTitle").textContent = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`;
        $("alertSub").textContent = "Sila matikan telefon bimbit anda"; 
        icon.hidden = false;
        card.classList.add("iqamah");
        box.hidden = false;
        return;
      }
    }
    box.hidden = true;
  }

  // ---------- Ticker (reads ticker.txt, refreshes live) ----------
  let tickerSig = "";
  async function loadTicker() {
    try {
      const res = await fetch("ticker.txt?t=" + Date.now(), { cache: "no-store" });
      const text = await res.text();
      const lines = text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
      const sig = lines.join("\n");
      if (sig === tickerSig) return;
      tickerSig = sig;
      buildTicker(lines.length ? lines : ["Selamat datang"]);
    } catch (e) { console.warn("ticker.txt unavailable", e); }
  }

  function buildTicker(lines) {
    const track = $("tickerTrack");
    const makeSet = () => {
      const set = document.createElement("span");
      set.className = "ticker-set";
      lines.forEach((l) => {
        const item = document.createElement("span");
        item.className = "ticker-item";
        item.textContent = l;
        const sep = document.createElement("span");
        sep.className = "ticker-sep";
        sep.textContent = "✦";
        set.append(item, sep);
      });
      return set;
    };
    track.replaceChildren();
    let first = makeSet();
    track.appendChild(first);
    // repeat the set until one half is wider than the screen, then double it for a seamless loop
    let guard = 0;
    while (first.offsetWidth < window.innerWidth && guard++ < 20) {
      first.append(...Array.from(makeSet().childNodes));
    }
    track.appendChild(first.cloneNode(true));
    const dur = first.offsetWidth / (C.tickerSpeed || 90);
    track.style.animationDuration = dur + "s";
  }

  // ---------- Slideshow (reads slides.json) ----------
  let slidesSig = "";
  let slideTimer = null;
  async function loadSlides() {
    try {
      const res = await fetch("slides.json?t=" + Date.now(), { cache: "no-store" });
      const data = await res.json();
      const list = (data.slides || []).filter(Boolean);
      const secs = data.seconds || C.slideSeconds || 12;
      const sig = JSON.stringify([list, secs]);
      if (sig === slidesSig) return;
      slidesSig = sig;
      buildSlides(list, secs);
    } catch (e) { console.warn("slides.json unavailable", e); }
  }

  function buildSlides(list, secs) {
    const box = $("slideshow");
    clearInterval(slideTimer);
    box.replaceChildren();
    if (!list.length) {
      box.innerHTML = '<div class="slide-empty">Tiada slaid</div>';
      return;
    }
    const els = list.map((src) => {
      const s = document.createElement("div");
      s.className = "slide";
      s.style.setProperty("--img", `url("${src}")`);
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      s.appendChild(img);
      box.appendChild(s);
      return s;
    });
    let i = 0;
    els[0].classList.add("active");
    if (els.length > 1) {
      slideTimer = setInterval(() => {
        els[i].classList.remove("active");
        i = (i + 1) % els.length;
        els[i].classList.add("active");
      }, secs * 1000);
    }
  }

  // ---------- Boot ----------
  $("surauName").textContent = C.surauName;
  const logo = $("logo");
  logo.src = C.logo;
  logo.onerror = () => { logo.style.display = "none"; };

  renderPrayers();
  tick();
  setInterval(tick, 1000);
  loadTicker();
  loadSlides();
  setInterval(() => { loadTicker(); loadSlides(); }, (C.refreshSeconds || 60) * 1000);

  // Reload once a day (~3:30 AM KL) so any new code/config on GitHub is picked up
  setInterval(() => {
    const k = klParts(new Date());
    if (k.h === 3 && k.mi === 30 && k.s < 2) location.reload();
  }, 1000);
})();
