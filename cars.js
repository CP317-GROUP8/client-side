const API_BASE = "https://server-side-zqaz.onrender.com";

const signInBtn = document.getElementById("signInBtn");
const logoutBtn = document.getElementById("logout");

function requireLogin() {
  const email = localStorage.getItem("userEmail");

  // If logged in -> hide Sign In, show Logout
  if (email) {
    if (signInBtn) signInBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    return email;
  }

  // If not logged in -> show Sign In, hide Logout, redirect
  if (signInBtn) signInBtn.style.display = "inline-block";
  if (logoutBtn) logoutBtn.style.display = "none";
  window.location.href = "index.html";
  return null;
}

const userEmail = requireLogin();

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userEmail");
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

function normalizeCar(row) {
  return {
    id: row["Vehicle ID"],
    manufacturer: row["Manufacturer"] || "Unknown",
    model: row["Model"] || "",
    type: row["Vehicle Type"] || "—",
    drivetrain: row["Drivetrain"] || "—",
    price: row["Price"],
    availability: row["Availability"],
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
      const priceNum = Number(c.price);
      const priceText =
        c.price === null || c.price === undefined || Number.isNaN(priceNum)
          ? "—"
          : `$${priceNum.toLocaleString()}`;

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

    await loadCars(); // refresh
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

loadCars();