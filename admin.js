const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

let userEmail = localStorage.getItem("userEmail") || "";

let currentTableKey = null;
let currentRows = [];
let currentColumns = [];
let editingRowId = null;
let creating = false;

let saleCreateUserId = "";
let saleCreateVehicleId = "";

const statusEl = document.getElementById("status");
const adminArea = document.getElementById("adminArea");
const tableLinksEl = document.getElementById("tableLinks");
const tableTitleEl = document.getElementById("tableTitle");
const tableContainerEl = document.getElementById("tableContainer");
const saveBtn = document.getElementById("saveBtn");
const createBtn = document.getElementById("createBtn");
const exportBtn = document.getElementById("exportBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------- helpers ----------
function normalizeCol(col) {
  return String(col || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeColKey(col) {
  return normalizeCol(col).replace(/[_-\s]/g, "");
}

function findMatchingColumnName(columns, aliases) {
  const byKey = new Map((columns || []).map((c) => [normalizeColKey(c), c]));
  for (const alias of aliases) {
    const hit = byKey.get(normalizeColKey(alias));
    if (hit) return hit;
  }
  return null;
}

function ensureSalesColumns(columns) {
  if (currentTableKey !== "sales") return columns;
  const aliasGroups = [
    { aliases: ["pickupLocation", "pickup_location", "pickup location", "Pickup Location"], canonical: "Pickup Location" },
    { aliases: ["dropoffLocation", "dropOffLocation", "dropoff_location", "drop off location", "Drop Off Location", "Dropoff Location"], canonical: "Drop Off Location" },
  ];
  const next = [];
  const seen = new Set();
  (columns || []).forEach((col) => {
    const group = aliasGroups.find(({ aliases }) => aliases.some((alias) => normalizeColKey(alias) === normalizeColKey(col)));
    const normalized = group ? group.canonical : col;
    const key = normalizeColKey(normalized);
    if (!seen.has(key)) { seen.add(key); next.push(normalized); }
  });
  aliasGroups.forEach(({ canonical }) => {
    const key = normalizeColKey(canonical);
    if (!seen.has(key)) { seen.add(key); next.push(canonical); }
  });
  return next;
}

function ensureUserColumns(columns) {
  if (currentTableKey !== "users") return columns;
  const next = [...(columns || [])];
  const required = [{ aliases: ["Location", "location", "Home Location", "homeLocation", "home_location"], fallback: "Location" }];
  required.forEach(({ aliases, fallback }) => {
    if (!findMatchingColumnName(next, aliases)) next.push(fallback);
  });
  return next;
}

function readRowValue(row, col) {
  if (!row) return "";
  if (Object.prototype.hasOwnProperty.call(row, col)) return row[col];
  const wanted = normalizeColKey(col);
  const found = Object.keys(row).find((k) => normalizeColKey(k) === wanted);
  return found ? row[found] : "";
}

function isLockedIdColumn(col) {
  const c = normalizeCol(col);
  return c === "user id" || c === "vehicle id" || c === "sale id";
}

function isCreateEditableIdColumn(col) {
  if (currentTableKey !== "sales" || !creating) return false;
  const c = normalizeCol(col);
  return c === "sale id" || c === "user id" || c === "vehicle id";
}

function isOwnerId(col) { return normalizeCol(col) === "owner id"; }
function isAvailability(col) { return normalizeCol(col) === "availability"; }

function isDateColumn(col) {
  const c = normalizeCol(col);
  return c === "from date" || c === "to date";
}

function toDateInputValue(val) {
  if (!val) return "";
  return String(val).substring(0, 10);
}

function isVehicleLockedBusinessColumn(col) {
  if (currentTableKey !== "vehicles") return false;
  return isOwnerId(col) || isAvailability(col);
}

function isLockedColumnForContext(col) {
  if (isCreateEditableIdColumn(col)) return false;
  if (isLockedIdColumn(col)) return true;
  if (isVehicleLockedBusinessColumn(col)) return true;
  return false;
}

function updateButtons() {
  createBtn.disabled = !currentTableKey || creating;
  createBtn.title = creating ? "Finish creating the current entry first" : "";
  saveBtn.disabled = !(creating || editingRowId !== null);
  exportBtn.disabled = !currentTableKey || !currentRows.length;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pkForTable(tableKey, columns, rows) {
  const map = { users: ["User ID"], vehicles: ["Vehicle ID"], sales: ["Sale ID"] };
  const candidates = map[tableKey] || ["id", "ID"];
  const keys = columns?.length ? columns : (rows?.[0] ? Object.keys(rows[0]) : []);
  return candidates.find((k) => keys.includes(k)) || keys[0] || null;
}

function formatDeleteWarning(info) {
  if (!info) return "Could not check rules.";
  if (info.canDelete) return "OK.";
  const parts = [info.reason || info.error || "Blocked."];
  if (Array.isArray(info.mustDeleteFirst) && info.mustDeleteFirst.length) {
    const pretty = info.mustDeleteFirst.map((b) => `${b.tableKey}: [${(b.ids || []).join(", ")}]`).join(" | ");
    parts.push(`Delete these first → ${pretty}`);
  }
  return parts.join(" ");
}

function highlightLink(linkEl, message) {
  if (!linkEl) return;
  linkEl.style.background = "#fef08a";
  linkEl.style.borderRadius = "6px";
  linkEl.style.padding = "2px 4px";
  linkEl.title = message || linkEl.title || "";
  setTimeout(() => { linkEl.style.background = "transparent"; linkEl.style.borderRadius = ""; linkEl.style.padding = ""; }, 2500);
}

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function syncStoredUserProfile(user) {
  const existingData = readStoredJson("userData");
  const existingProfile = readStoredJson("userProfile");
  const mergedUser = { ...existingProfile, ...existingData, ...user };
  localStorage.setItem("userData", JSON.stringify(mergedUser));
  localStorage.setItem("userProfile", JSON.stringify(mergedUser));
  if (mergedUser.email) localStorage.setItem("userEmail", mergedUser.email);
  localStorage.setItem("isAdmin", Number(mergedUser.administrator) === 1 ? "1" : "0");
}

// ---------- PDF EXPORT ----------
exportBtn?.addEventListener("click", () => {
  if (!currentRows.length || !currentTableKey) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  const tableLabel = tableTitleEl.textContent || currentTableKey;
  const exportDate = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  doc.setFontSize(18); doc.setTextColor(15, 23, 42);
  doc.text(`Admin Export: ${tableLabel}`, 14, 18);
  doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${exportDate} · ${currentRows.length} record(s)`, 14, 26);
  const cols = currentColumns.length ? currentColumns : (currentRows[0] ? Object.keys(currentRows[0]) : []);
  const head = [cols];
  const body = currentRows.map(row => cols.map(col => String(readRowValue(row, col) ?? "")));
  doc.autoTable({ head, body, startY: 32, styles: { fontSize: 9, cellPadding: 4, textColor: [15, 23, 42] }, headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 9 }, alternateRowStyles: { fillColor: [238, 242, 255] }, margin: { left: 14, right: 14 } });
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`CP317 Car Rentals · Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }
  doc.save(`${currentTableKey}-export-${Date.now()}.pdf`);
});

// ---------- logout ----------
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("userEmail");
  userEmail = "";
  adminArea && (adminArea.style.display = "none");
  logoutBtn && (logoutBtn.style.display = "none");
  tableLinksEl && (tableLinksEl.innerHTML = "");
  tableTitleEl && (tableTitleEl.textContent = "Select a table above.");
  tableContainerEl && (tableContainerEl.innerHTML = "");
  currentTableKey = null; currentRows = []; currentColumns = []; editingRowId = null; creating = false;
  updateButtons();
  statusEl && (statusEl.textContent = "Logged out.");
});

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-User-Email": userEmail, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  console.log("API RESPONSE:", path, { status: res.status, data });
  if (!res.ok) {
    const err = new Error(data.error || data.reason || `Request failed: ${res.status}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

async function getDeleteInfo(tableKey, id) {
  const path = `/admin/${tableKey}/${id}/can-delete`;
  const res = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { "Content-Type": "application/json", "X-User-Email": userEmail } });
  const data = await res.json().catch(() => ({}));
  console.log("CAN-DELETE RESPONSE:", path, { status: res.status, data });
  if (res.status === 200) return { ...data, canDelete: true };
  if (res.status === 409) return { ...data, canDelete: false };
  const err = new Error(data.error || data.reason || `Request failed: ${res.status}`);
  err.status = res.status; err.data = data; throw err;
}

// ---------- admin meta ----------
async function loadAdminMeta() {
  const meta = await api("/admin/meta", { method: "GET" });
  tableLinksEl.innerHTML = "";
  meta.forEach((t) => {
    const link = document.createElement("a");
    link.textContent = t.label; link.href = "#";
    link.onclick = (e) => { e.preventDefault(); loadTable(t.key, t.label); };
    tableLinksEl.appendChild(link);
  });
  currentTableKey = null; creating = false; editingRowId = null;
  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";
  updateButtons();
}

// ---------- load table ----------
async function loadTable(key, label) {
  currentTableKey = key; creating = false; editingRowId = null;
  saleCreateUserId = ""; saleCreateVehicleId = "";
  tableTitleEl.textContent = label;
  const data = await api(`/admin/${key}`, { method: "GET" });
  currentRows = Array.isArray(data.rows) ? data.rows : [];
  currentColumns = currentRows[0] ? Object.keys(currentRows[0]) : [];
  currentColumns = ensureUserColumns(currentColumns);
  currentColumns = ensureSalesColumns(currentColumns);
  updateButtons();
  renderTable();
}

// ---------- render ----------
function rowHtml(row, cols, pkName) {
  const isNew = row.__new === true;
  const isEditing = !isNew && editingRowId !== null && String(row[pkName]) === String(editingRowId);
  const rowIdAttr = isNew ? "new" : (pkName ? row[pkName] : "");
  let tr = `<tr data-rowid="${escapeHtml(rowIdAttr)}">`;
  cols.forEach((col) => {
    let val = isNew ? "" : (readRowValue(row, col) ?? "");
    if (isNew && currentTableKey === "vehicles" && isAvailability(col)) val = "1";
    if (isNew && currentTableKey === "vehicles" && isOwnerId(col)) val = "";
    if (isNew || isEditing) {
      if (isLockedColumnForContext(col)) {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}" disabled style="background:#f3f3f3;color:#666;"></td>`;
      } else {
        const inputType = isDateColumn(col) ? "date" : "text";
        const inputVal = isDateColumn(col) ? toDateInputValue(val) : escapeHtml(val);
        tr += `<td><input type="${inputType}" data-col="${escapeHtml(col)}" value="${inputVal}"></td>`;
      }
    } else {
      const displayVal = isDateColumn(col) ? toDateInputValue(val) : val;
      tr += `<td>${escapeHtml(displayVal)}</td>`;
    }
  });
  tr += `<td>`;
  if (isNew) tr += `<a data-action="cancelCreate" href="#">cancel</a>`;
  else if (isEditing) tr += `<a data-action="cancelEdit" href="#">cancel</a>`;
  else tr += `<a data-action="edit" href="#">edit</a> | <a data-action="delete" href="#">delete</a>`;
  tr += `</td></tr>`;
  return tr;
}

function attachDeleteHoverWarnings() {
  const deleteLinks = tableContainerEl.querySelectorAll('a[data-action="delete"]');
  deleteLinks.forEach((a) => {
    let checked = false;
    a.addEventListener("mouseenter", async () => {
      if (checked && !window.event?.shiftKey) return;
      checked = true;
      try {
        const tr = a.closest("tr");
        const rowId = tr?.getAttribute("data-rowid");
        if (!rowId || rowId === "new") { a.title = "Not applicable."; return; }
        const info = await getDeleteInfo(currentTableKey, rowId);
        const msg = formatDeleteWarning(info);
        a.title = msg;
        if (!info.canDelete) highlightLink(a, msg);
      } catch (err) {
        console.warn("Hover can-delete check failed:", err?.status, err?.message);
        a.title = "Could not check rules.";
      }
    });
  });
}

function renderTable() {
  if (!currentTableKey) return;
  if (!currentRows.length && !creating) {
    tableContainerEl.innerHTML = `<div class="muted" style="margin-top:10px;">This table currently has no rows. Click <b>Create</b> to add a new entry.</div>`;
    updateButtons(); return;
  }
  const pkName = pkForTable(currentTableKey, currentColumns, currentRows);
  const cols = currentColumns.length ? currentColumns : (currentRows[0] ? Object.keys(currentRows[0]) : []);
  let html = `<table><thead><tr>`;
  cols.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
  html += `<th>Actions</th></tr></thead><tbody>`;
  if (creating) html += rowHtml({ __new: true }, cols, pkName);
  currentRows.forEach((r) => (html += rowHtml(r, cols, pkName)));
  html += `</tbody></table>`;
  tableContainerEl.innerHTML = html;
  tableContainerEl.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", onActionClick));
  attachDeleteHoverWarnings();
  updateButtons();
}

// ---------- create/save ----------
createBtn?.addEventListener("click", () => {
  if (!currentTableKey || creating) return;
  creating = true; editingRowId = null;
  updateButtons(); renderTable();
});

saveBtn?.addEventListener("click", async () => {
  try {
    if (!currentTableKey) return;
    const pkName = pkForTable(currentTableKey, currentColumns, currentRows);
    const rowSelector = creating ? `tr[data-rowid="new"]` : `tr[data-rowid="${editingRowId}"]`;
    const tr = tableContainerEl.querySelector(rowSelector);
    if (!tr) return;
    const inputs = [...tr.querySelectorAll("input[data-col]")];
    const payload = {};
    inputs.forEach((inp) => {
      const col = inp.getAttribute("data-col");
      if (isLockedIdColumn(col) && !isCreateEditableIdColumn(col)) return;
      if (currentTableKey === "vehicles" && (isOwnerId(col) || isAvailability(col))) return;
      payload[col] = inp.value;
    });
    const existingRow = !creating
      ? currentRows.find((row) => String(row?.[pkName] ?? "") === String(editingRowId))
      : null;
    if (creating) { await api(`/admin/${currentTableKey}`, { method: "POST", body: JSON.stringify(payload) }); }
    else { await api(`/admin/${currentTableKey}/${editingRowId}`, { method: "PUT", body: JSON.stringify(payload) }); }

    if (currentTableKey === "users") {
      const sessionEmail = String(localStorage.getItem("userEmail") || "").trim();
      const previousEmail = String(existingRow?.["Email Address"] ?? "").trim();
      const nextEmail = String(payload["Email Address"] ?? previousEmail).trim();

      if (sessionEmail && (sessionEmail === previousEmail || sessionEmail === nextEmail)) {
        const cachedUser = readStoredJson("userData");

        const mergedUser = {
          ...cachedUser,
          firstName: payload["First Name"] ?? existingRow?.["First Name"] ?? cachedUser.firstName ?? cachedUser["First Name"] ?? "",
          lastName: payload["Last Name"] ?? existingRow?.["Last Name"] ?? cachedUser.lastName ?? cachedUser["Last Name"] ?? "",
          location: payload["Location"] ?? existingRow?.["Location"] ?? cachedUser.location ?? cachedUser["Location"] ?? "",
          totalSpent: payload["Total Amount Spent"] ?? existingRow?.["Total Amount Spent"] ?? cachedUser.totalSpent ?? cachedUser["Total Amount Spent"] ?? 0,
          administrator: payload["Administrator"] ?? existingRow?.["Administrator"] ?? cachedUser.administrator ?? cachedUser["Administrator"] ?? 0,
          email: nextEmail || cachedUser.email || cachedUser["Email Address"] || sessionEmail,
        };

        syncStoredUserProfile(mergedUser);
      }
    }

    creating = false; editingRowId = null;
    updateButtons();
    await loadTable(currentTableKey, tableTitleEl.textContent || "");
  } catch (e) { console.error("SAVE ERROR:", e); alert(`Save failed: ${e.message}`); }
});

// ---------- actions ----------
async function onActionClick(e) {
  e.preventDefault();
  const action = e.target.getAttribute("data-action");
  const tr = e.target.closest("tr");
  const rowid = tr?.getAttribute("data-rowid");
  try {
    if (action === "edit") { creating = false; editingRowId = String(rowid); updateButtons(); renderTable(); return; }
    if (action === "cancelEdit") { editingRowId = null; updateButtons(); renderTable(); return; }
    if (action === "cancelCreate") { creating = false; updateButtons(); renderTable(); return; }
    if (action === "delete") {
      const info = await getDeleteInfo(currentTableKey, rowid);
      if (!info.canDelete) { const msg = formatDeleteWarning(info); alert(msg); highlightLink(e.target, msg); return; }
      if (!confirm("Delete this row?")) return;
      await api(`/admin/${currentTableKey}/${rowid}`, { method: "DELETE" });
      await loadTable(currentTableKey, tableTitleEl?.textContent || "");
      return;
    }
  } catch (err) {
    console.error("ACTION ERROR:", err);
    alert(err?.data ? formatDeleteWarning(err.data) : `Action failed: ${err.message}`);
  }
}

// ---------- boot ----------
(async function boot() {
  updateButtons();
  if (!userEmail) { statusEl && (statusEl.textContent = "No session found. Please sign in first."); return; }
  try {
    statusEl && (statusEl.textContent = "Checking admin access...");
    await loadAdminMeta();
    adminArea && (adminArea.style.display = "block");
    logoutBtn && (logoutBtn.style.display = "inline-block");
    statusEl && (statusEl.textContent = "Admin session active. Select a table above.");
    const promoInput = document.getElementById("promoInput");
    const savePromoBtn = document.getElementById("savePromoBtn");
    if (promoInput && savePromoBtn) {
      promoInput.value = localStorage.getItem("promoBanner") || "";
      savePromoBtn.addEventListener("click", () => {
        localStorage.setItem("promoBanner", promoInput.value);
        savePromoBtn.textContent = "Saved!";
        setTimeout(() => (savePromoBtn.textContent = "Save Banner"), 2000);
      });
    }
  } catch (err) { console.error("BOOT ERROR:", err); statusEl && (statusEl.textContent = `Error: ${err.message}`); }
})();


// =============================================================================
// REPORTS — Monthly Revenue Chart + Most Booked Vehicles
// =============================================================================

(function loadChartJs() {
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
  s.onload = initReports;
  document.head.appendChild(s);
})();

function initReports() {
  buildYearDropdown();
  loadRevenueChart();
  loadMostBooked();
  document.getElementById("revenueYear")?.addEventListener("change", loadRevenueChart);
  document.getElementById("bookedLimit")?.addEventListener("change", loadMostBooked);
}

function buildYearDropdown() {
  const sel = document.getElementById("revenueYear");
  if (!sel) return;
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    const opt = document.createElement("option");
    opt.value = y; opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ── Monthly Revenue Chart ─────────────────────────────────────────────────────
let revenueChartInstance = null;

async function loadRevenueChart() {
  const yearSel  = document.getElementById("revenueYear");
  const canvas   = document.getElementById("revenueChart");
  const summary  = document.getElementById("revenueSummary");
  if (!canvas) return;

  const year = yearSel?.value || new Date().getFullYear();

  try {
    const data = await api(`/admin/reports/monthly-revenue?year=${year}`);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const revenues = Array(12).fill(0);

    (data.rows || []).forEach(row => {
      const m = Number(row.month) - 1;
      if (m >= 0 && m < 12) revenues[m] = Number(row.totalRevenue || 0);
    });

    const total    = revenues.reduce((a, b) => a + b, 0);
    const maxIdx   = revenues.indexOf(Math.max(...revenues));
    const bestMonth = revenues[maxIdx] > 0 ? months[maxIdx] : "—";
    const avgMonthly = revenues.filter(v => v > 0);
    const avg = avgMonthly.length ? avgMonthly.reduce((a, b) => a + b, 0) / avgMonthly.length : 0;

    if (summary) {
      summary.innerHTML = `
        <div class="statCard">
          <div class="statCard-label">Total ${year}</div>
          <div class="statCard-value">$${total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div class="statCard">
          <div class="statCard-label">Best Month</div>
          <div class="statCard-value">${bestMonth}</div>
        </div>
        <div class="statCard">
          <div class="statCard-label">Avg / Active Month</div>
          <div class="statCard-value">$${avg.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>`;
    }

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels: months,
        datasets: [{
          label: "Revenue ($)",
          data: revenues,
          backgroundColor: revenues.map((v, i) => i === maxIdx && v > 0 ? "rgba(34,197,94,0.85)" : v > 0 ? "rgba(79,70,229,0.85)" : "rgba(79,70,229,0.15)"),
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` $${Number(ctx.raw).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#94a3b8", font: { size: 12 } } },
          y: {
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { color: "#94a3b8", font: { size: 12 }, callback: v => `$${Number(v).toLocaleString()}` }
          }
        }
      }
    });
  } catch (err) {
    console.error("Revenue chart error:", err);
    const wrap = document.getElementById("revenueChartWrap");
    if (wrap) wrap.innerHTML = `<div class="muted">Could not load revenue data: ${escapeHtml(err.message)}</div>`;
  }
}

// ── Most Booked Vehicles ──────────────────────────────────────────────────────
async function loadMostBooked() {
  const wrap  = document.getElementById("bookedTableWrap");
  const limit = document.getElementById("bookedLimit")?.value || 10;
  if (!wrap) return;
  wrap.innerHTML = `<div class="muted">Loading…</div>`;

  try {
    const data = await api(`/admin/reports/most-booked?limit=${limit}`);
    const rows = data.rows || [];

    if (!rows.length) { wrap.innerHTML = `<div class="muted">No booking data yet.</div>`; return; }

    const maxCount = Math.max(...rows.map(r => Number(r.bookingCount || 0)));

    let html = `<table>
      <thead><tr>
        <th style="width:48px;">#</th>
        <th>Vehicle</th>
        <th>Type</th>
        <th>City</th>
        <th>Price/Day</th>
        <th>Bookings</th>
        <th>Revenue</th>
      </tr></thead><tbody>`;

    rows.forEach((r, i) => {
      const count  = Number(r.bookingCount || 0);
      const rev    = Number(r.totalRevenue || 0);
      const barPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
      const medal  = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;

      html += `<tr>
        <td class="medal">${medal}</td>
        <td style="font-weight:600;">${escapeHtml(r.manufacturer || "")} ${escapeHtml(r.model || "")}</td>
        <td>${escapeHtml(r.vehicleType || "—")}</td>
        <td>${escapeHtml(r.city || "—")}</td>
        <td>$${Number(r.price || 0).toFixed(2)}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-track"><div class="bar-fill" style="width:${barPct}%;"></div></div>
            <span class="bar-count">${count}</span>
          </div>
        </td>
        <td style="font-weight:600;color:#22c55e;">$${rev.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;
  } catch (err) {
    wrap.innerHTML = `<div class="muted">Error loading data: ${escapeHtml(err.message)}</div>`;
    console.error("Most booked error:", err);
  }
}
