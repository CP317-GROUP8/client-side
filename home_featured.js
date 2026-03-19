const API_BASE_FEATURED = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

function safeStr(v) {
  return (v ?? "").toString().trim();
}

function normalizeFeaturedCar(car) {
  const id = safeStr(car["Vehicle ID"] ?? car.vehicleId ?? car.id);
  const manufacturer = safeStr(car["Manufacturer"]);
  const model = safeStr(car["Model"]);
  const type = safeStr(car["Vehicle Type"]);
  const drivetrain = safeStr(car["Drivetrain"]);
  const priceNum = Number(car["Price"]);
  const priceText = Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}/day` : "—";

  const imageMap = {
    "Dodge Challenger | AWD": "challenger.png",
    "KIA K4 | RWD": "kia.png",
    "Honda Civic | RWD": "civic.png",
    "Porsche 911 | AWD": "porsche.png",
    "Toyota Highlander | AWD": "highlander-awd.png",
    "Toyota Highlander | RWD": "highlander-rwd.png",
    "Toyota Corolla | FWD": "corolla-fwd.png",
    "Toyota Corolla | AWD": "corolla-awd.png",
  };

  const name = `${manufacturer} ${model}`.trim();
  const imgKey = `${name} | ${drivetrain}`;
  const imgFile = imageMap[imgKey] || "dummy.png";

  return {
    id,
    name,
    type,
    drivetrain,
    priceText,
    imgUrl: `./assets/cars/${imgFile}`,
  };
}

async function loadFeaturedCars() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;

  try {
    const res = await fetch(`${API_BASE_FEATURED}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Could not load cars");

    const cars = (Array.isArray(data) ? data : []).map(normalizeFeaturedCar);
    
    const featuredNames = [
      "Dodge Challenger",
      "Porsche 911",
      "Honda Civic",
      "KIA K4"
    ];

    let featured = [];
    for (const name of featuredNames) {
      const match = cars.find(c => c.name.includes(name));
      if (match) featured.push(match);
    }
    
    // Fill up exactly 4 spots if needed
    for (const car of cars) {
      if (featured.length >= 4) break;
      if (!featured.some(f => f.id === car.id)) {
        featured.push(car);
      }
    }

    if (!featured.length) {
      grid.innerHTML = `<p style="color: var(--muted, #666);">No vehicles found at this time.</p>`;
      return;
    }

    grid.innerHTML = featured.map(c => `
      <article class="f-card">
        <img src="${c.imgUrl}" alt="${c.name}" onerror="this.src='./assets/cars/dummy.png'">
        <div class="f-cardBody">
          <h3>${c.name}</h3>
          <div class="f-meta">${c.type} • ${c.drivetrain}</div>
          <div class="f-price">${c.priceText}</div>
          <div class="f-actions">
            <a href="car-details.html?id=${encodeURIComponent(c.id)}&preview=1" class="f-btn-secondary">View</a>
            <a href="car-details.html?id=${encodeURIComponent(c.id)}&preview=1" class="f-btn-primary">Book</a>
          </div>
        </div>
      </article>
    `).join("");

  } catch (err) {
    grid.innerHTML = `<p style="color: red;">Error: ${err.message}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFeaturedCars);
