const LOCAL_API_BASE = "http://localhost:10000";
const REMOTE_API_BASE = "https://server-side-zqaz.onrender.com";
const API_BASE = window.location.hostname === "localhost"
  ? LOCAL_API_BASE
  : REMOTE_API_BASE;
const PAGE_SIZE = 9;
const IMAGE_ASSIGNMENTS_KEY = "carImageAssignments";

function safeStr(v) {
  return (v ?? "").toString().trim();
}

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function popularityStorageKey() {
  return `popularity:${getWeekKey()}`;
}

function loadPopularityMap() {
  try {
    const raw = localStorage.getItem(popularityStorageKey());
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function getAssignedImage(vehicleId, manufacturer, model) {
  try {
    const raw = localStorage.getItem(IMAGE_ASSIGNMENTS_KEY);
    const assignments = raw ? JSON.parse(raw) : {};
    if (vehicleId && assignments && assignments[vehicleId]) {
      return assignments[vehicleId];
    }
  } catch {}

  const fallbackMap = {
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
  const mapped = fallbackMap[name] || "dummy.png";
  return `./assets/cars/${mapped}`;
}

function normalizeCar(car) {
  const id = safeStr(car.vehicleId ?? car["Vehicle ID"] ?? car.id);
  const manufacturer = safeStr(car.manufacturer ?? car["Manufacturer"]);
  const model = safeStr(car.model ?? car["Model"]);
  const type = safeStr(car.vehicleType ?? car["Vehicle Type"]);
  const drivetrain = safeStr(car.drivetrain ?? car["Drivetrain"]);
  const city = safeStr(car.city ?? car["City"] ?? car["Available City"] ?? car.availableCity);
  const priceNum = Number(car.price ?? car["Price"]);
  const priceText = Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}/day` : "—";
  const name = `${manufacturer} ${model}`.trim();

  return {
    id,
    name,
    city,
    type,
    drivetrain,
    priceText,
    imgUrl: getAssignedImage(id, manufacturer, model),
    score: Number(car.score || 0),
    views: Number(car.views || 0),
    favourites: Number(car.favourites || 0),
    bookClicks: Number(car.bookClicks || 0),
    completedBookings: Number(car.completedBookings || 0),
  };
}

function render(cars, weekStart, total) {
  const grid = document.getElementById("popularGrid");
  const empty = document.getElementById("emptyState");
  const summary = document.getElementById("summary");
  const loadMoreWrap = document.getElementById("loadMoreWrap");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const resultsMeta = document.getElementById("resultsMeta");

  const ranked = cars.filter((c) => c.score > 0);

  summary.textContent = `Week starting ${weekStart} • ${total} popular car(s)`;

  if (!ranked.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    if (loadMoreWrap) loadMoreWrap.style.display = "none";
    return;
  }

  empty.style.display = "none";
  grid.innerHTML = ranked
    .map((c) => {
      const details = `car-details.html?id=${encodeURIComponent(c.id)}&preview=1`;
      const book = `car-details.html?id=${encodeURIComponent(c.id)}&preview=1`;
      const metaBits = [c.city, c.type, c.drivetrain].filter(Boolean);
      return `
        <article class="card">
          <img src="${c.imgUrl}" alt="${c.name}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='./assets/cars/dummy.png'">
          <div class="cardBody">
            <div class="top">
              <h3 class="title">${c.name}</h3>
              <span class="score">Score ${c.score}</span>
            </div>
            <div class="meta">${metaBits.join(" • ") || "—"}</div>
            <div class="meta">Views ${c.views} • Favourites ${c.favourites} • Book clicks ${c.bookClicks} • Booked ${c.completedBookings}</div>
            <div class="price">${c.priceText}</div>
            <div class="actions">
              <a class="linkBtn view" href="${details}">View</a>
              <a class="linkBtn book" href="${book}">Book</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (loadMoreWrap && loadMoreBtn && resultsMeta) {
    resultsMeta.textContent = `Showing ${ranked.length} of ${total} cars`;
    loadMoreWrap.style.display = "flex";
    loadMoreBtn.style.display = ranked.length < total ? "inline-block" : "none";
  }
}

async function boot() {
  const summary = document.getElementById("summary");
  let currentCars = [];
  let currentOffset = 0;
  let total = 0;
  let weekStart = "";

  async function loadLocalRankedPage(offset, { append = false } = {}) {
    const res = await fetch(`${API_BASE}/cars`);
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(`Could not load cars (${res.status})`);

    const popularityMap = loadPopularityMap();
    const allCars = (Array.isArray(data) ? data : []).map((car) => {
      const normalized = normalizeCar(car);
      const localScore = Number(popularityMap[String(normalized.id)] || 0);
      return {
        ...normalized,
        score: localScore,
        views: localScore,
        favourites: 0,
        bookClicks: 0,
        completedBookings: 0,
      };
    });

    const ranked = allCars
      .filter((car) => car.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.id || 0) - Number(a.id || 0));

    const pageRows = ranked.slice(offset, offset + PAGE_SIZE);
    currentCars = append ? [...currentCars, ...pageRows] : pageRows;
    currentOffset = offset;
    total = ranked.length;
    weekStart = getWeekKey();
    render(currentCars, weekStart, total);
  }

  async function loadRankedPage(offset, { append = false } = {}) {
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Loading...";
    }

    try {
      let res;
      let data;

      try {
        res = await fetch(`${API_BASE}/metrics/popular-cars?limit=${PAGE_SIZE}&offset=${offset}`);
        data = await res.json().catch(() => ({}));
      } catch (err) {
        if (API_BASE === LOCAL_API_BASE) {
          res = await fetch(`${REMOTE_API_BASE}/metrics/popular-cars?limit=${PAGE_SIZE}&offset=${offset}`);
          data = await res.json().catch(() => ({}));
        } else {
          throw err;
        }
      }

      if (!res.ok) {
        throw new Error(data.error || data.reason || `Could not load popular cars (${res.status})`);
      }

      const cars = (Array.isArray(data.rows) ? data.rows : []).map(normalizeCar);
      currentCars = append ? [...currentCars, ...cars] : cars;
      currentOffset = offset;
      total = Number(data.total || cars.length);
      weekStart = data.weekStart || "";
      render(currentCars, weekStart, total);
    } catch (err) {
      if (String(err.message || "").includes("Could not load popular cars")) {
        await loadLocalRankedPage(offset, { append });
        return;
      }
      throw err;
    } finally {
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = "Load More";
      }
    }
  }

  try {
    await loadRankedPage(0);

    document.getElementById("loadMoreBtn")?.addEventListener("click", () => {
      loadRankedPage(currentOffset + PAGE_SIZE, { append: true }).catch((err) => {
        summary.textContent = `Error: ${err.message}`;
      });
    });
  } catch (err) {
    summary.textContent = `Error: ${err.message}`;
  }
}

boot();
