const API_BASE = "https://server-side-zqaz.onrender.com";

const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");

  if (!email || !loggedInAt) {
    window.location.replace("index.html");
    throw new Error("No session");
  }

  if (Date.now() - loggedInAt > SESSION_MS) {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    window.location.replace("index.html");
    throw new Error("Session expired");
  }

  return email;
}

const userEmail = requireSession();

const signInBtn = document.getElementById("signInBtn");
const logoutBtn = document.getElementById("logout");

// logged in -> hide Sign In
if (signInBtn) signInBtn.style.display = "none";

if (logoutBtn) {
  logoutBtn.style.display = "inline-block";
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    window.location.href = "index.html";
  });
}

const params = new URLSearchParams(window.location.search);
const where = params.get("where") || "";
const pickup = params.get("pickup") || "";
const dropoff = params.get("dropoff") || "";

document.getElementById("pillWhere").textContent = `Where: ${where || "(any)"}`;
document.getElementById("pillPickup").textContent = `Pick Up: ${pickup || "(any)"}`;
document.getElementById("pillDropoff").textContent = `Drop Off: ${dropoff || "(any)"}`;

function pick(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s.length) return v;
  }
  return null;
}

function normalizeCar(row) {
  const id = pick(row["Vehicle ID"], row.vehicleId, row.id);

  const manufacturer = pick(row["Manufacturer"], row.manufacturer) || "Unknown";
  const model = pick(row["Model"], row.model) || "";

  const type = pick(row["Vehicle Type"], row.vehicleType, row.type) || "—";
  const drivetrain = pick(row["Drivetrain"], row.drivetrain) || "—";

  const priceVal = pick(row["Price"], row.price);
  const priceNum = priceVal === null ? null : Number(priceVal);

  return {
    id,
    manufacturer,
    model,
    type,
    drivetrain,
    price: Number.isFinite(priceNum) ? priceNum : null,
  };
}

async function loadCars() {
  const status = document.getElementById("status");
  const grid = document.getElementById("carGrid");

  try {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const cars = Array.isArray(data) ? data.map(normalizeCar) : [];

    grid.innerHTML = "";
    status.textContent = `${cars.length} available cars found`;

    cars.forEach((c) => {
      const priceText = c.price === null ? "—" : `$${c.price.toLocaleString()}`;

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
    document.getElementById("status").textContent = `Error: ${err.message}`;
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
    if (!res.ok) throw new Error(data.error || "Booking failed");

    status.textContent =
      `Booked! Sale ID #${data.saleId} — Vehicle #${data.vehicleId} — Price $${Number(data.priceSoldAt).toLocaleString()}`;

    await loadCars();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

loadCars();