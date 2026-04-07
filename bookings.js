const isLocalPreview = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocalPreview ? "http://localhost:10000" : "https://server-side-zqaz.onrender.com";
const SESSION_MS = 12 * 60 * 60 * 1000;
const SERVICE_FEE = 15;
const TAX_RATE = 0.13;

// ── EmailJS config ──────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY      = "H3F1dxhmOW-hMSZij";
const EMAILJS_SERVICE_ID      = "service_v914ueg";
const EMAILJS_PICKUP_TEMPLATE = "template_m5nti5o";

function initEmailJS() {
  if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Email 1 — Booking Confirmed + Pickup Details
 * Fires immediately on booking confirmation.
 */
async function sendPickupEmail({ userName, userEmail, carName, pickupDate, dropoffDate, pickupLocation, saleId }) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_PICKUP_TEMPLATE, {
      user_name:       userName,
      user_email:      userEmail,
      car_name:        carName,
      pickup_date:     pickupDate,
      dropoff_date:    dropoffDate,
      pickup_location: pickupLocation,
      sale_id:         saleId,
      email_type:      "Booking Confirmation",
      email_message:   "your booking is confirmed! Here are your pickup details. Your pickup is on ${pickupDate}.",
      location_label:  "Pickup Location",
    });
  } catch (err) { console.warn("EmailJS pickup email failed:", err); }
}

async function sendReturnEmail({ userName, userEmail, carName, pickupDate, dropoffDate, dropoffLocation, saleId }) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_PICKUP_TEMPLATE, {
      user_name:       userName,
      user_email:      userEmail,
      car_name:        carName,
      pickup_date:     pickupDate,
      dropoff_date:    dropoffDate,
      pickup_location: dropoffLocation,
      sale_id:         saleId,
      email_type:      "Return Details",
      email_message:   "this is a reminder of your return details. Your rental return is on ${dropoffDate}.",
      location_label:  "Dropoff Location",
    });
  } catch (err) { console.warn("EmailJS return email failed:", err); }
}

function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  if (!email || !loggedInAt) {
    if (isLocalPreview) return "";
    window.location.replace("index.html"); throw new Error("No session");
  }
  if (Date.now() - loggedInAt > SESSION_MS) {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    if (isLocalPreview) return "";
    window.location.replace("index.html");
    throw new Error("Session expired");
  }
  return email;
}

const params = new URLSearchParams(window.location.search);
const carId = params.get("id");
const userEmail = requireSession();

let selectedCar = null;
let bookedRanges = [];

const PNG_FIRST_MODEL_KEYS = new Set([
  "dodge/challenger",
  "nissan/kicks",
  "toyota/corolla",
  "toyota/corolla hybrid",
  "toyota/highlander",
  "toyota/highlander hybrid",
]);

function normalizeModelKeyPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getCarImage(manufacturer, model, drivetrain) {
  const vehicleId = safeStr(selectedCar?.id);
  if (vehicleId) {
    try {
      const raw = localStorage.getItem("carImageAssignments");
      const assignments = raw ? JSON.parse(raw) : {};
      if (assignments[vehicleId]) return assignments[vehicleId];
    } catch {}
  }

  const modelKey = `${normalizeModelKeyPart(manufacturer)}/${normalizeModelKeyPart(model)}`;
  if (modelKey === "/") return "./assets/cars/dummy.png";
  const ext = PNG_FIRST_MODEL_KEYS.has(modelKey) ? "png" : "jpeg";
  return `./assets/cars/${modelKey}/1.${ext}`;
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function normalizeLocation(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parts = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "";

  return parts
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const ms = b - a;
  if (ms < 0) return 0;
  if (ms === 0) return 1;
  return Math.ceil(ms / 86400000);
}

function hasDateConflict(from, to) {
  for (const r of bookedRanges) {
    if (from <= r.toDate && to >= r.fromDate) return r;
  }
  return null;
}

function setMsg(msg, type = "") {
  const el = document.getElementById("bookMsg");
  el.className = type;
  el.textContent = msg;
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function computeAndShowBreakdown() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  if (!from || !to || !selectedCar) return;
  const days = daysBetween(from, to);
  const rate = selectedCar.price;
  const subtotal = rate * days;
  const fee = SERVICE_FEE;
  const tax = (subtotal + fee) * TAX_RATE;
  const total = subtotal + fee + tax;
  setMsg(`${days} day${days !== 1 ? "s" : ""} × ${formatMoney(rate)} + $${SERVICE_FEE} fee + tax = ${formatMoney(total)} total`);
}

function validateForm() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const pickup = normalizeLocation(document.getElementById("pickupLocation").value);
  const dropoff = normalizeLocation(document.getElementById("dropoffLocation").value);
  if (!from || !to) return { ok: false, message: "Please select both pickup and dropoff dates." };
  if (from < todayISO()) return { ok: false, message: "Pickup date cannot be in the past." };
  if (to < from) return { ok: false, message: "Dropoff date cannot be before pickup date." };
  if (!pickup) return { ok: false, message: "Please enter a pickup location." };
  if (!dropoff) return { ok: false, message: "Please enter a dropoff location." };
  const conflict = hasDateConflict(from, to);
  if (conflict) return { ok: false, message: `Car already booked ${conflict.fromDate} – ${conflict.toDate}. Pick different dates.` };
  return { ok: true };
}

function refreshForm() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const btn = document.getElementById("bookNowBtn");
  const v = validateForm();
  btn.disabled = !v.ok;
  if (!v.ok) {
    if (from || to) setMsg(v.message, "error");
    return;
  }
  computeAndShowBreakdown();
}

async function loadBookedDates() {
  try {
    const res = await fetch(`${API_BASE}/cars/${carId}/booked-dates`);
    const data = await res.json().catch(() => ({ ranges: [] }));
    bookedRanges = Array.isArray(data.ranges) ? data.ranges : [];
  } catch {
    bookedRanges = [];
  }
}

async function loadCarAndShowForm() {
  document.getElementById("pageTitle").textContent = "Confirm Booking";
  document.getElementById("bookLayout").style.display = "grid";

  await Promise.all([
    fetch(`${API_BASE}/cars/${carId}`).then(async (r) => {
      const row = await r.json().catch(() => null);
      if (!r.ok || !row) throw new Error("Car not found");
      selectedCar = {
        id: row["Vehicle ID"],
        manufacturer: row["Manufacturer"] || "Unknown",
        model: row["Model"] || "",
        vehicleType: row["Vehicle Type"] || "-",
        drivetrain: row["Drivetrain"] || "-",
        price: Number(row["Price"] || 0),
      };
      const fullName = `${selectedCar.manufacturer} ${selectedCar.model}`.trim();
      document.getElementById("carImg").src = getCarImage(selectedCar.manufacturer, selectedCar.model, selectedCar.drivetrain);
      document.getElementById("carImgName").textContent = fullName;
      document.getElementById("carImgPrice").textContent = `${formatMoney(selectedCar.price)}/day`;
      document.getElementById("carImgPills").innerHTML = `
        <span class="carPill">${selectedCar.vehicleType}</span>
        <span class="carPill">${selectedCar.drivetrain}</span>
        <span class="carPill" style="background:#dcfce7;border-color:#86efac;color:#166534;">Available</span>
      `;
      setStatus(`Booking for ${fullName} (ID ${selectedCar.id})`);
    }),
    loadBookedDates(),
  ]);

  if (bookedRanges.length > 0) {
    setMsg(`⚠ Already booked: ${bookedRanges.map(r => `${r.fromDate} – ${r.toDate}`).join("  |  ")}`, "error");
  }

  const today = todayISO();
  const fromEl = document.getElementById("fromDate");
  const toEl = document.getElementById("toDate");
  fromEl.min = today;
  toEl.min = today;

  fromEl.addEventListener("change", () => {
    toEl.min = fromEl.value || today;
    if (toEl.value && toEl.value < fromEl.value) toEl.value = fromEl.value;
    refreshForm();
  });
  toEl.addEventListener("change", refreshForm);
  document.getElementById("pickupLocation").addEventListener("input", refreshForm);
  document.getElementById("dropoffLocation").addEventListener("input", refreshForm);
  document.getElementById("pickupLocation").addEventListener("blur", () => {
    const el = document.getElementById("pickupLocation");
    el.value = normalizeLocation(el.value);
    refreshForm();
  });
  document.getElementById("dropoffLocation").addEventListener("blur", () => {
    const el = document.getElementById("dropoffLocation");
    el.value = normalizeLocation(el.value);
    refreshForm();
  });
  document.getElementById("bookNowBtn").addEventListener("click", submitBooking);
  document.getElementById("bookNowBtn").disabled = true;
}

async function submitBooking() {
  if (!userEmail) {
    setMsg("Sign in is required to complete a booking. Local preview mode only shows the form.", "error");
    return;
  }

  const v = validateForm();
  if (!v.ok) { setMsg(v.message, "error"); return; }

  const btn = document.getElementById("bookNowBtn");
  btn.disabled = true;
  btn.textContent = "Booking...";
  setMsg("Submitting booking...");

  try {
    const payload = {
      fromDate:        document.getElementById("fromDate").value,
      toDate:          document.getElementById("toDate").value,
      pickupLocation:  normalizeLocation(document.getElementById("pickupLocation").value),
      dropoffLocation: normalizeLocation(document.getElementById("dropoffLocation").value),
    };

    document.getElementById("pickupLocation").value = payload.pickupLocation;
    document.getElementById("dropoffLocation").value = payload.dropoffLocation;

    const res = await fetch(`${API_BASE}/cars/${encodeURIComponent(carId)}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Email": userEmail },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Booking failed");

    const saleId = data.saleId || "—";
    const carName = `${selectedCar.manufacturer} ${selectedCar.model}`.trim();
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userEmail;

    setMsg(`✅ Booked successfully! Sale ID #${saleId}.`, "success");
    btn.textContent = "Booked ✓";
    bookedRanges.push({ fromDate: payload.fromDate, toDate: payload.toDate });

    // 📧 Email 1: Booking Confirmed + Pickup Details
    await sendPickupEmail({
      userName, userEmail, carName,
      pickupDate:     formatDate(payload.fromDate),
      dropoffDate:    formatDate(payload.toDate),
      pickupLocation: payload.pickupLocation,
      saleId,
    });

    // 📧 Email 2: Return Details
    await sendReturnEmail({
      userName, userEmail, carName,
      pickupDate:      formatDate(payload.fromDate),
      dropoffDate:     formatDate(payload.toDate),
      dropoffLocation: payload.dropoffLocation,
      saleId,
    });

  } catch (err) {
    setMsg(`Error: ${err.message}`, "error");
    btn.disabled = false;
    btn.textContent = "Book Now";
  }
}

document.getElementById("backBtn").addEventListener("click", () => {
  if (carId) history.back();
  else window.location.href = "home.html";
});

(async function init() {
  initEmailJS();
  if (carId) {
    try {
      await loadCarAndShowForm();
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  } else {
    window.location.href = "my-bookings.html";
  }
})();
