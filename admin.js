const API_BASE = "https://server-side-zqaz.onrender.com";

// Session duration: must have logged in recently
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

// ---------- Session Guard ----------
function requireSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  const isAdmin = Number(localStorage.getItem("isAdmin") || "0");

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

  if (isAdmin !== 1) {
    window.location.replace("home.html");
    throw new Error("Not an admin");
  }

  return email;
}

const userEmail = requireSession();

// ---------- UI Elements ----------
let currentTableKey = null;
let currentRows = [];
let currentColumns = [];
let editingRowId = null;
let creating = false;

const statusEl = document.getElementById("status");
const adminArea = document.getElementById("adminArea");
const tableLinksEl = document.getElementById("tableLinks");
const tableTitleEl = document.getElementById("tableTitle");
const tableContainerEl = document.getElementById("tableContainer");
const saveBtn = document.getElementById("saveBtn");
const createBtn = document.getElementById("createBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------- Helpers ----------
function normalizeCol(col) {
  return String(col || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// lock these from editing (auto-increment IDs)
function isLockedIdColumn(col) {
  const c = normalizeCol(col);
  return c === "user id" || c === "vehicle id" || c === "sale id";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// keep button state consistent everywhere
function updateButtons() {
  // Create: disabled only while actively creating a new entry, or if no table selected
  createBtn.disabled = !currentTableKey || creating;
  createBtn.title = creating ? "Finish creating the current entry first" : "";

  // Save: enabled only while creating OR editing
  saveBtn.disabled = !(creating || editingRowId !== null);
}

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail, // ✅ A) REQUIRED FOR ADMIN ROUTES
      ...(opts.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  console.log("API RESPONSE:", path, { status: res.status, data });

  if (!res.ok) {
    // normalize error message
    const msg = data.error || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.data = data;
    err.status = res.status;
    throw err;
  }

  return data;
}

// ---------- Delete Dependency Check (Tooltip + Block) ----------
async function getDeleteInfo(tableKey, id) {
  return await api(`/admin/${tableKey}/${id}/can-delete`, { method: "GET" });
}

function formatDeleteWarning(info) {
  if (!info) return "Could not check delete rules.";
  if (info.canDelete) return "OK to delete.";

  const parts = [];
  parts.push(info.reason || "Cannot delete.");

  if (Array.isArray(info.mustDeleteFirst) && info.mustDeleteFirst.length) {
    const pretty = info.mustDeleteFirst
      .map((b) => `${b.tableKey}: [${(b.ids || []).join(", ")}]`)
      .join(" | ");
    parts.push(`Delete these first → ${pretty}`);
  }

  return parts.join(" ");
}

// ---------- Logout ----------
logoutBtn.onclick = () => {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("loggedInAt");
  localStorage.removeItem("isAdmin");
  window.location.href = "index.html";
};

// ---------- Load Meta (table links) ----------
async function loadAdminMeta() {
  const meta = await api("/admin/meta", { method: "GET" });

  tableLinksEl.innerHTML = "";
  meta.forEach((t) => {
    const link = document.createElement("a");
    link.textContent = t.label;
    link.href = "#";
    link.onclick = (e) => {
      e.preventDefault();
      loadTable(t.key, t.label);
    };
    tableLinksEl.appendChild(link);
  });

  // reset view
  currentTableKey = null;
  currentRows = [];
  currentColumns = [];
  editingRowId = null;
  creating = false;

  tableTitleEl.textContent = "Select a table above.";
  tableContainerEl.innerHTML = "";
  statusEl.textContent = "Admin session active.";
  updateButtons();
}

// ---------- Load Table ----------
async function loadTable(key, label) {
  currentTableKey = key;
  creating = false;
  editingRowId = null;

  tableTitleEl.textContent = label;
  statusEl.textContent = "Loading…";

  const data = await api(`/admin/${key}`, { method: "GET" });
  currentRows = Array.isArray(data.rows) ? data.rows : [];
  currentColumns = currentRows[0] ? Object.keys(currentRows[0]) : [];

  statusEl.textContent = `${currentRows.length} row(s) loaded.`;
  updateButtons();
  renderTable();
}

// ---------- Render ----------
function rowHtml(row, cols, pkName) {
  const isNew = row.__new === true;
  const isEditing = !isNew && editingRowId !== null && row[pkName] == editingRowId;

  const rowIdAttr = isNew ? "new" : (pkName ? row[pkName] : "");
  let tr = `<tr data-rowid="${escapeHtml(rowIdAttr)}">`;

  cols.forEach((col) => {
    const val = isNew ? "" : (row[col] ?? "");

    if (isNew || isEditing) {
      // ✅ Lock auto-increment IDs
      if (isLockedIdColumn(col)) {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}" disabled style="background:#f3f3f3;color:#666;"></td>`;
      } else {
        tr += `<td><input data-col="${escapeHtml(col)}" value="${escapeHtml(val)}"></td>`;
      }
    } else {
      tr += `<td>${escapeHtml(val)}</td>`;
    }
  });

  tr += `<td>`;
  if (isNew) {
    tr += `<a href="#" data-action="cancelCreate">cancel</a>`;
  } else if (isEditing) {
    tr += `<a href="#" data-action="cancelEdit">cancel</a>`;
  } else {
    // ✅ Delete will get tooltip + yellow warning on hover
    tr += `<a href="#" data-action="edit">edit</a> | <a href="#" data-action="delete" title="Hover to check delete rules">delete</a>`;
  }
  tr += `</td></tr>`;

  return tr;
}

function guessPkName(rows, columns) {
  const candidates = ["User ID", "Vehicle ID", "Sale ID"];
  const keys = columns?.length ? columns : (rows[0] ? Object.keys(rows[0]) : []);
  return candidates.find((k) => keys.includes(k)) || keys[0] || null;
}

function attachDeleteHoverTooltips() {
  const deleteLinks = document.querySelectorAll('a[data-action="delete"]');

  deleteLinks.forEach((a) => {
    let loaded = false;

    a.addEventListener("mouseenter", async () => {
      if (loaded) return;
      loaded = true;

      try {
        const tr = a.closest("tr");
        const rowId = tr?.getAttribute("data-rowid");
        if (!rowId || rowId === "new") {
          a.title = "Not applicable.";
          return;
        }

        const info = await getDeleteInfo(currentTableKey, rowId);
        a.title = formatDeleteWarning(info);

        // ✅ Yellow warning if NOT deletable
        if (!info.canDelete) {
          a.style.background = "#fef08a"; // yellow
          a.style.borderRadius = "6px";
          a.style.padding = "2px 4px";
        }
      } catch (e) {
        a.title = "Could not check delete rules.";
      }
    });
  });
}

function renderTable() {
  if (!currentTableKey) return;

  if (!currentRows.length && !creating) {
    tableContainerEl.innerHTML = `
      <div class="muted" style="margin-top:10px;">
        This table currently has no rows. Click <b>Create</b> to add a new entry.
      </div>
    `;
    updateButtons();
    return;
  }

  const pkName = guessPkName(currentRows, currentColumns);
  const cols = currentColumns;

  let html = `<table><thead><tr>`;
  cols.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
  html += `<th>Actions</th></tr></thead><tbody>`;

  if (creating) {
    html += rowHtml({ __new: true }, cols, pkName);
  }

  currentRows.forEach((r) => (html += rowHtml(r, cols, pkName)));

  html += `</tbody></table>`;
  tableContainerEl.innerHTML = html;

  // Attach row actions
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", onActionClick);
  });

  // ✅ Hover tooltips for delete
  attachDeleteHoverTooltips();

  updateButtons();
}

// ---------- Create ----------
createBtn.onclick = () => {
  if (!currentTableKey) return;

  if (!currentRows.length) {
    alert("This table is empty. Add at least one row using phpMyAdmin once, or ask to add a schema/meta endpoint so Create works on empty tables.");
    return;
  }

  if (creating) return; // already creating

  creating = true;
  editingRowId = null;

  updateButtons();
  renderTable();
};

// ---------- Save ----------
saveBtn.onclick = async () => {
  try {
    if (!currentTableKey) return;

    const rowSelector = creating
      ? `tr[data-rowid="new"]`
      : `tr[data-rowid="${editingRowId}"]`;

    const tr = document.querySelector(rowSelector);
    if (!tr) return;

    const inputs = [...tr.querySelectorAll("input[data-col]")];
    const payload = {};

    inputs.forEach((inp) => {
      const col = inp.getAttribute("data-col");
      if (isLockedIdColumn(col)) return; // never send auto-increment IDs
      payload[col] = inp.value;
    });

    if (creating) {
      await api(`/admin/${currentTableKey}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } else {
      await api(`/admin/${currentTableKey}/${editingRowId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    }

    creating = false;
    editingRowId = null;

    updateButtons();
    await loadTable(currentTableKey, tableTitleEl.textContent);
  } catch (e) {
    alert(`Save failed: ${e.message}`);
    console.error("SAVE ERROR:", e);
  }
};

// ---------- Actions ----------
async function onActionClick(e) {
  e.preventDefault();

  const action = e.target.getAttribute("data-action");
  const tr = e.target.closest("tr");
  const rowid = tr?.getAttribute("data-rowid");

  if (action === "edit") {
    creating = false;
    editingRowId = Number(rowid);
    updateButtons();
    renderTable();
    return;
  }

  if (action === "cancelEdit") {
    editingRowId = null;
    updateButtons();
    renderTable();
    return;
  }

  if (action === "cancelCreate") {
    creating = false;
    updateButtons();
    renderTable();
    return;
  }

  if (action === "delete") {
    if (!rowid) return;
    if (!confirm("Delete this row?")) return;

    try {
      // ✅ C) BLOCK DELETE if server says you can't
      const info = await getDeleteInfo(currentTableKey, rowid);
      if (!info.canDelete) {
        alert(formatDeleteWarning(info));
        return;
      }

      await api(`/admin/${currentTableKey}/${rowid}`, { method: "DELETE" });
      await loadTable(currentTableKey, tableTitleEl.textContent);
    } catch (err) {
      // if server returns 409, show its guidance
      if (err.status === 409 && err.data) {
        alert(formatDeleteWarning(err.data));
      } else {
        alert(`Delete failed: ${err.message}`);
      }
      console.error("DELETE ERROR:", err);
    }
  }
}

// ---------- Boot ----------
(async function boot() {
  adminArea.style.display = "block";
  logoutBtn.style.display = "inline-block";
  updateButtons();

  try {
    statusEl.textContent = "Loading admin dashboard…";
    await loadAdminMeta();
  } catch (e) {
    console.error("BOOT ERROR:", e);
    statusEl.textContent = `Error: ${e.message}`;
  }
})();