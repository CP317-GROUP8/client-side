const LOCAL_API_BASE_NEARBY = "http://localhost:10000";
const REMOTE_API_BASE_NEARBY = "https://server-side-zqaz.onrender.com";
const API_BASE_NEARBY = window.location.hostname === "localhost"
  ? LOCAL_API_BASE_NEARBY
  : REMOTE_API_BASE_NEARBY;

const IMAGE_ASSIGNMENTS_KEY = "carImageAssignments";
const PNG_FIRST_MODEL_KEYS = new Set([
  "dodge/challenger",
  "nissan/kicks",
  "toyota/corolla",
  "toyota/corolla hybrid",
  "toyota/highlander",
  "toyota/highlander hybrid",
]);

const SUPPORTED_AREAS = [
  "Toronto",
  "North York",
  "Scarborough",
  "Mississauga",
  "Brampton",
  "Markham",
  "Etobicoke",
  "Vaughan",
];

function safeStr(value) {
  return (value ?? "").toString().trim();
}

function normalizeArea(value) {
  return safeStr(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeModelKeyPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getAssignedImage(vehicleId, manufacturer, model, drivetrain) {
  try {
    const raw = localStorage.getItem(IMAGE_ASSIGNMENTS_KEY);
    const assignments = raw ? JSON.parse(raw) : {};
    if (vehicleId && assignments[vehicleId]) return assignments[vehicleId];
  } catch {}

  const modelKey = `${normalizeModelKeyPart(manufacturer)}/${normalizeModelKeyPart(model)}`;
  if (modelKey === "/") return "./assets/cars/dummy.png";
  const ext = PNG_FIRST_MODEL_KEYS.has(modelKey) ? "png" : "jpeg";
  return `./assets/cars/${modelKey}/1.${ext}`;
}

function getInitialArea() {
  try {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const saved = safeStr(userData.location || userData.Location);
    if (saved) return saved;
  } catch {}

  return "";
}

function getAreaForVehicle(id) {
  const numericId = Number.parseInt(String(id || "").replace(/\D+/g, ""), 10);
  if (Number.isFinite(numericId) && numericId > 0) {
    return SUPPORTED_AREAS[(numericId - 1) % SUPPORTED_AREAS.length];
  }
  return SUPPORTED_AREAS[0];
}

function normalizeCar(car) {
  const id = safeStr(car.vehicleId ?? car["Vehicle ID"] ?? car.id);
  const manufacturer = safeStr(car.manufacturer ?? car["Manufacturer"]);
  const model = safeStr(car.model ?? car["Model"]);
  const type = safeStr(car.vehicleType ?? car["Vehicle Type"]);
  const drivetrain = safeStr(car.drivetrain ?? car["Drivetrain"]);
  const priceNum = Number(car.price ?? car["Price"]);
  const area = getAreaForVehicle(id);

  return {
    id,
    name: `${manufacturer} ${model}`.trim(),
    type,
    drivetrain,
    area,
    priceText: Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}/day` : "—",
    imgUrl: getAssignedImage(id, manufacturer, model, drivetrain),
  };
}

function render(cars, selectedArea) {
  const summary = document.getElementById("summary");
  const grid = document.getElementById("nearbyGrid");
  const empty = document.getElementById("emptyState");

  if (!selectedArea) {
    summary.textContent = "Add your location in My Account to see cars in your area.";
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  summary.textContent = `${cars.length} car${cars.length === 1 ? "" : "s"} available in ${selectedArea}`;

  if (!cars.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = cars.map((car) => `
    <article class="card">
      <img src="${car.imgUrl}" alt="${car.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='./assets/cars/dummy.png'">
      <div class="cardBody">
        <div class="top">
          <h3 class="title">${car.name}</h3>
          <span class="areaTag">${car.area}</span>
        </div>
        <div class="meta">${[car.type, car.drivetrain].filter(Boolean).join(" • ") || "—"}</div>
        <div class="price">${car.priceText}</div>
        <div class="actions">
          <a class="linkBtn view" href="car-details.html?id=${encodeURIComponent(car.id)}&preview=1">View</a>
          <a class="linkBtn book" href="car-details.html?id=${encodeURIComponent(car.id)}&preview=1">Book</a>
        </div>
      </div>
    </article>
  `).join("");
}

async function loadNearbyCars() {
  const summary = document.getElementById("summary");
  const selectedArea = getInitialArea();

  if (!selectedArea) {
    render([], "");
    return;
  }

  summary.textContent = `Finding cars in ${selectedArea}...`;

  try {
    let res;
    let data;

    try {
      res = await fetch(`${API_BASE_NEARBY}/cars`);
      data = await res.json().catch(() => []);
    } catch (err) {
      if (API_BASE_NEARBY === LOCAL_API_BASE_NEARBY) {
        res = await fetch(`${REMOTE_API_BASE_NEARBY}/cars`);
        data = await res.json().catch(() => []);
      } else {
        throw err;
      }
    }

    if (!res.ok) throw new Error("Could not load cars");

    const cars = (Array.isArray(data) ? data : []).map(normalizeCar);
    const matches = cars.filter((car) => normalizeArea(car.area) === normalizeArea(selectedArea));
    render(matches, selectedArea);
  } catch (err) {
    summary.textContent = `Error: ${err.message}`;
    document.getElementById("nearbyGrid").innerHTML = "";
    document.getElementById("emptyState").style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("accountBtn")?.addEventListener("click", () => {
    window.location.href = "account.html?preview=1";
  });
  document.getElementById("browseAllBtn")?.addEventListener("click", () => {
    window.location.href = "cars.html?preview=1&v=5";
  });

  loadNearbyCars();
});
