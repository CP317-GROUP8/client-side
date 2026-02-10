const API_BASE = "https://server-side-zqaz.onrender.com";

function requireLogin() {
  const email = localStorage.getItem("userEmail");
  if (!email) window.location.href = "index.html";
  return email;
}
const userEmail = requireLogin();

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isAdmin");
  window.location.href = "index.html";
});

const params = new URLSearchParams(window.location.search);
const where = params.get("where") || "";
const pickup = params.get("pickup") || "";
const dropoff = params.get("dropoff") || "";

document.getElementById("pillWhere").textContent = `Where: ${where || "(any)"}`;
document.getElementById("pillPickup").textContent = `Pick Up: ${pickup || "(any)"}`;
document.getElementById("pillDropoff").textContent = `Drop Off: ${dropoff || "(any)"}`;

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
}

// Normalize server response into a consistent shape
function normalizeCar(car) {
  const id = car.vehicleId ?? car.id ?? car["Vehicle ID"];

  const manufacturer = firstNonEmpty(
    car.manufacturer,
    car.Manufacturer,
    car["Manufacturer"]
  ) || "Unknown";

  const model = firstNonEmpty(
    car.model,
    car.Model,
    car["Model"]
  ) || "";

  // IMPORTANT: handle lots of possible keys + blank strings
  const type = firstNonEmpty(
    car.type,                // if backend returns AS type
    car.vehicleType,         // if backend returns AS vehicleType
    car.vehicletype,         // sometimes keys get lowercased by mistake
    car.vehicle_type,
    car["Vehicle Type"],     // if backend returns raw column name
    car["Vehicle type"]
  ) || "—";

  const drivetrain = firstNonEmpty(
    car.drivetrain,
    car.Drivetrain,
    car["Drivetrain"]
  ) || "—";

  const priceRaw = car.price ?? car.Price ?? car["Price"];
  const price = priceRaw === null || priceRaw === undefined || String(priceRaw).trim() === ""
    ? null
    : Number(priceRaw);

  return { id, manufacturer, model, type, drivetrain, price };
}

async function loadCars() {
  const status = document.getElementById("status");
  const grid = document.getElementById("carGrid");

  try {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    // DEBUG: see exactly what the API returns
    console.log("RAW /cars response:", data);

    const cars = Array.isArray(data) ? data.map(normalizeCar) : [];

    grid.innerHTML = "";
    status.textContent = `${cars.length} available cars found`;

    cars.forEach((c) => {
      const priceText =
        c.price === null || Number.isNaN(c.price)
          ? "—"
          : `$${c.price.toLocaleString()}`;

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${c.manufacturer} ${c.model}</h3>
        <div class="muted">Type: ${c.type}</div>
        <div class="muted">Drivetrain: ${c.drivetrain}</div>
        <div class="muted">Price: ${priceText}</div>
        <div class="actions">
          <button class="link book" data-book="${encodeURIComponent(c.id)}">Book</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-book]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const vehicleId = btn.getAttribute("data-book");
        await bookCar(vehicleId);
      });
    });
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

async function bookCar(vehicleId) {
  const status = document.getElementById("status");

  try {
    status.textContent = "Booking car…";

    const res = await fetch(`${API_BASE}/cars/${vehicleId}/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
    });

    const data = await res.json().catch(() => ({}));
    console.log("BOOK response:", data);

    if (!res.ok) throw new Error(data.error || "Booking failed");

    status.textContent = `Booked! Sale ID #${data.saleId} — Vehicle #${data.vehicleId} — Price $${Number(data.priceSoldAt).toLocaleString()}`;
    await loadCars();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

loadCars();