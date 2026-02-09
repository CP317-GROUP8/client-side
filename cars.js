function requireLogin() {
  const userStr = localStorage.getItem("user");
  if (!userStr) window.location.href = "index.html";
}
requireLogin();

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

const params = new URLSearchParams(window.location.search);
const where = params.get("where") || "";
const pickup = params.get("pickup") || "";
const dropoff = params.get("dropoff") || "";

document.getElementById("pillWhere").textContent = `Where: ${where || "(any)"}`;
document.getElementById("pillPickup").textContent = `Pick Up: ${pickup || "(any)"}`;
document.getElementById("pillDropoff").textContent = `Drop Off: ${dropoff || "(any)"}`;

function normalizeCar(car) {
  return {
    id: car.id ?? car.vehicleId ?? car.vehicle_id ?? car["Vehicle ID"],
    manufacturer: car.manufacturer ?? car.Manufacturer ?? car["Manufacturer"] ?? "Unknown",
    model: car.model ?? car.Model ?? car["Model"] ?? "",
    type: car.vehicle_type ?? car.vehicleType ?? car["Vehicle Type"] ?? "—",
    availability: car.availability ?? car.Availability ?? car["Availability"]
  };
}

async function loadCars() {
  const status = document.getElementById("status");
  const grid = document.getElementById("carGrid");

  try {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const cars = data.map(normalizeCar);

    grid.innerHTML = "";
    status.textContent = `${cars.length} cars found`;

    cars.forEach(raw => {
      const c = normalizeCar(raw);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${c.manufacturer} ${c.model}</h3>
        <div class="muted">Type: ${c.type}</div>
        <div class="muted">Available: ${c.availability ? "Yes" : "No"}</div>
        <a class="link" href="car.html?id=${encodeURIComponent(c.id)}">View Details</a>
      `;
      grid.appendChild(card);
    });

  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

loadCars();
