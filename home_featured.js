const API_BASE_FEATURED = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

const IMAGE_ASSIGNMENTS_KEY = 'carImageAssignments';

const IMAGE_MANIFEST = {
  'bmw/i4':                     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'bmw/x5':                     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'buick/envista':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'byd/dolphin surf':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'byd/seal':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'byd/seagull':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'byd/sealion 7':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'chery/tiggo 4':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'chevrolet/colorado':          [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'chevrolet/equinox':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'chevrolet/silverado 1500':    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'chevrolet/trailblazer':       [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'chevrolet/trax':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'dodge/challenger':            [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'ford/bronco sport':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/everest':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/f-150':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/f-150 lightning':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/maverick':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/mustang':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/mustang mach-e':         [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/puma':                   [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'ford/ranger':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'genesis/gv70':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'gmc/sierra 1500':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'gwm/haval jolion':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/civic':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/civic hybrid':          [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/cr-v':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/fit e:hev':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/passport':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/prelude':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'honda/ridgeline':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/elantra':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/kona':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/kona electric':       [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/palisade':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/santa cruz':          [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/tucson':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'hyundai/venue':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'isuzu/d-max':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'jaecoo/7':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'jeep/compass':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/k4':                      [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/niro hybrid':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/seltos':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/soul':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'kia/sportage':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'leapmotor/c10':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'lexus/es':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'lexus/rx 350 hybrid':         [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mazda/3':                     [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mazda/cx-5':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mazda/cx-50':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mazda/mx-5 miata':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mini/cooper':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mitsubishi/outlander':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mitsubishi/outlander sport':  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'mitsubishi/triton':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/frontier':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/kicks':                [{ num: 1, ext: 'png'  }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/qashqai':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/rogue':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/sentra':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'nissan/z':                    [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'porsche/911':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'renault/twingo e-tech':       [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'rivian/r1s':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'rivian/r1t':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'saic-gm-wuling/bingo ev':     [{ num: 1, ext: 'png'  }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'subaru/brz':                  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'subaru/crosstrek':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'subaru/forester':             [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'subaru/impreza':              [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'suzuki/swift hybrid':         [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'tesla/model y':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/camry':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/corolla':              [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'toyota/corolla cross':        [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/corolla hybrid':       [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'toyota/gr86':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/highlander':           [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'toyota/highlander hybrid':    [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'toyota/hilux':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/rav4':                 [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/rav4 plug-in hybrid':  [{ num: 1, ext: 'png'  }, { num: 2, ext: 'png'  }, { num: 3, ext: 'jpeg' }],
  'toyota/sienna':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/supra':                [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'toyota/tacoma':               [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'vauxhall/frontera electric':  [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'volkswagen/id.2all':          [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'volkswagen/jetta':            [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
  'volkswagen/tiguan':           [{ num: 1, ext: 'jpeg' }, { num: 2, ext: 'jpeg' }, { num: 3, ext: 'jpeg' }],
};

function loadImageAssignments() {
  const raw = localStorage.getItem(IMAGE_ASSIGNMENTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveImageAssignments(a) {
  localStorage.setItem(IMAGE_ASSIGNMENTS_KEY, JSON.stringify(a));
}

function getOrCreateImageAssignment(vehicleId, manufacturer, model) {
  if (!vehicleId || !manufacturer || !model) return './assets/cars/dummy.png';
  const modelKey = `${manufacturer.toLowerCase().trim()}/${model.toLowerCase().trim()}`;
  const assignments = loadImageAssignments();
  if (assignments[vehicleId]) return assignments[vehicleId];
  const available = IMAGE_MANIFEST[modelKey] || [];
  if (!available.length) return './assets/cars/dummy.png';
  const usedUrls = new Set(
    Object.entries(assignments)
      .filter(([vid]) => vid !== vehicleId)
      .map(([, url]) => url)
      .filter(url => url.includes(`/assets/cars/${modelKey}/`))
  );
  const pool = available.filter(i => !usedUrls.has(`./assets/cars/${modelKey}/${i.num}.${i.ext}`));
  const chosen = (pool.length ? pool : available)[Math.floor(Math.random() * (pool.length || available.length))];
  const url = `./assets/cars/${modelKey}/${chosen.num}.${chosen.ext}`;
  assignments[vehicleId] = url;
  saveImageAssignments(assignments);
  return url;
}

function safeStr(v) {
  return (v ?? "").toString().trim();
}

function normalizeFeaturedCar(car) {
  const id           = safeStr(car["Vehicle ID"] ?? car.vehicleId ?? car.id);
  const manufacturer = safeStr(car["Manufacturer"]);
  const model        = safeStr(car["Model"]);
  const type         = safeStr(car["Vehicle Type"]);
  const drivetrain   = safeStr(car["Drivetrain"]);
  const priceNum     = Number(car["Price"]);
  const priceText    = Number.isFinite(priceNum) ? `$${priceNum.toFixed(2)}/day` : "—";
  const imgUrl       = getOrCreateImageAssignment(id, manufacturer, model);

  return {
    id,
    name: `${manufacturer} ${model}`.trim(),
    type,
    drivetrain,
    priceText,
    imgUrl,
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

    const featuredNames = ["Dodge Challenger", "Porsche 911", "Honda Civic", "KIA K4"];
    let featured = [];
    for (const name of featuredNames) {
      const match = cars.find(c => c.name.includes(name));
      if (match) featured.push(match);
    }
    for (const car of cars) {
      if (featured.length >= 4) break;
      if (!featured.some(f => f.id === car.id)) featured.push(car);
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
