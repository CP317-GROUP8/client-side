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

// ---------- Safe DOM helpers ----------
function $(id) {
  const el = document.getElementById(id);
  if (!el) console.error(`admin.js: Missing element with id="${id}" in admin.html`);
  return el;
}
function safeShow(el, display = "block") {
  if (el) el.style.display = display;
}
function safeHide(el) {
  if (el) el.style.display = "none";
}
function safeSetText(el, txt) {
  if (el) el.textContent = txt;
}

// ---------- UI Elements (safe) ----------
const statusEl = $("status");
const adminArea = $("adminArea");
const tableLinksEl = $("tableLinks");
const tableTitleEl = $("tableTitle");
const tableContainerEl = $("tableContainer");
const saveBtn = $("saveBtn");
const createBtn = $("createBtn");
const logoutBtn = $("logoutBtn");

// ---------- State ----------
let currentTableKey = null;
let currentRows = [];
let currentColumns = [];
let editingRowId = null;
let creating = false;

// ---------- Helpers ----------
function normalizeCol(col) {
  return String(col || "").trim().toLowerCase().replace(/\s+/g, " ");
}
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
function updateButtons() {
  if (createBtn) {
    createBtn.disabled = !currentTableKey || creating;
    createBtn.title = creating ? "Finish creating the current entry first" : "";
  }
  if (saveBtn) {
    saveBtn.disabled = !(creating || editingRowId !== null);
  }
}

// ---------- API ----------
async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
      ...(opts.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  console.log("API RESPONSE:", path, { status: res.status, data });

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---------- Delete dependency check ----------
async function getDeleteInfo(tableKey, id) {
  return await api(`/admin/${tableKey}/${id}/can-delete`, { method: "GET" });
}

function formatDeleteWarning(info, fallbackId = null) {
  if (!info) return "Could not check delete rules.";
  if (info.canDelete) return "OK to delete.";

  const parts = [];
  parts.push(info.reason || "Cannot delete.");

  if (Array.isArray(info.mustDeleteFirst) && info.mustDeleteFirst.length) {
    const pretty = info.mustDeleteFirst
      .map((b) => `${b.tableKey}: [${(b.ids || []).join(", ")}]`)
      .join(" | ");
    parts.push(`Delete these first → ${pretty}`);
  } else if (fallbackId) {
    parts.push(`(Tip) Hover the delete link for ID ${fallbackId} to see what must be deleted first.`);
  }

  return parts.join(" ");
}

// ---------- Logout ----------
if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loggedInAt");
    localStorage.removeItem("isAdmin");
    window.location.href = "index.html";
  };
}

// ---------- Load admin meta ----------
async function loadAdminMeta() {
  const meta = await api("/admin/meta", { method: "GET" });

  if (tableLinksEl) tableLinksEl.innerHTML = "";
  meta.forEach((t) => {
    if (!tableLinksEl) return;
    const link = document.createElement("a");
    link.textContent = t.label;
    link.href = "#";
    link.onclick = (e) => {
      e.preventDefault();
      loadTable(t.key, t.label);
    };
    tableLinksEl.appendChild(link);
  });

  currentTableKey = null;
  currentRows = [];
  currentColumns = [];
  editingRowId = null;
  creating = false;

  safeSetText(tableTitleEl, "Select a table above.");
  if (tableContainerEl) tableContainerEl.innerHTML = "";
  safeSetText(statusEl, "Admin session active.");
  updateButtons();
}

// ---------- Load table ----------
async function loadTable(key, label) {
  currentTableKey = key;
  creating = false;
  editingRowId = null;

  safeSetText(tableTitleEl, label);
  safeSetText(statusEl, "Loading…");

  const data = await api(`/admin/${key}`, { method: "GET" });

  currentRows = Array.isArray(data.rows) ? data.rows : [];
  currentColumns = currentRows[0] ? Object.keys(currentRows[0]) : [];

  safeSetText(statusEl, `${currentRows.length} row(s) loaded.`);
  updateButtons();
  renderTable();
}

// ---------- Render ----------
function guessPkName(rows, columns) {
  const candidates = ["User ID", "Vehicle ID", "Sale ID"];
  const keys = columns?.length ? columns : (rows[0] ? Object.keys(rows[0]) : []);
  return candidates.find((k) => keys.includes(k)) || keys[0] || null;
}

function rowHtml(row, cols, pkName) {
  const isNew = row.__new === true;
  const isEditing = !isNew && editingRowId !== null && row[pkName] == editingRowId;

  const rowIdAttr = isNew ? "new" : (pkName ? row[pkName] : "");
  let tr = `<tr data-rowid="${escapeHtml(rowIdAttr)}">`;

  cols.forEach((col) => {
    const val = isNew ? "" : (row[col] ?? "");
    if (isNew || isEditing) {
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
    tr += `<a href="#" data-action="edit">edit</a> | <a href="#" data-action="delete" title="Hover to see delete rules">delete</a>`;
  }
  tr += `</td></tr>`;
  return tr;
}

function attachDeleteHoverTooltips() {
  const deleteLinks = document.querySelectorAll('a[data-action="delete"]');
  deleteLinks.forEach((a) => {
    let checked = false;

    a.style.background = "transparent";
    a.style.padding = "";
    a.style.borderRadius = "";

    a.addEventListener("mouseenter", async () => {
      if (checked && !window.event?.shiftKey) return;
      checked = true;

      try {
        const tr = a.closest("tr");
        const rowId = tr?.getAttribute("data-rowid");
        if (!rowId || rowId === "new") {
          a.title = "Not applicable.";
          return;
        }

        const info = await getDeleteInfo(currentTableKey, rowId);
        a.title = formatDeleteWarning(info, rowId);

        if (!info.canDelete) {
          a.style.background = "#fef08a";
          a.style.borderRadius = "6px";
          a.style.padding = "2px 4px";
        }
      } catch {
        a.title = "Could not check delete rules.";
      }
    });
  });
}

function renderTable() {
  if (!currentTableKey || !tableContainerEl) return;

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

  if (creating) html += rowHtml({ __new: true }, cols, pkName);
  currentRows.forEach((r) => (html += rowHtml(r, cols, pkName)));

  html += `</tbody></table>`;
  tableContainerEl.innerHTML = html;

  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", onActionClick);
  });

  attachDeleteHoverTooltips();
  updateButtons();
}

// ---------- Create ----------
if (createBtn) {
  createBtn.onclick = () => {
    if (!currentTableKey) return;

    if (!currentRows.length) {
      alert("This table is empty. Add at least one row using phpMyAdmin once, or ask to add a schema/meta endpoint so Create works on empty tables.");
      return;
    }

    if (creating) return;

    creating = true;
    editingRowId = null;

    updateButtons();
    renderTable();
  };
}

// ---------- Save ----------
if (saveBtn) {
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
        if (isLockedIdColumn(col)) return;
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
      await loadTable(currentTableKey, tableTitleEl?.textContent || "");
    } catch (e) {
      alert(`Save failed: ${e.message}`);
      console.error("SAVE ERROR:", e);
    }
  };
}

// ---------- Actions ----------
async function onActionClick(e) {
  e.preventDefault();

  const action = e.target.getAttribute("data-action");
  const tr = e.target.closest("tr");
  const rowid = tr?.getAttribute("data-rowid");

  try {
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

      const info = await getDeleteInfo(currentTableKey, rowid);
      if (!info.canDelete) {
        alert(formatDeleteWarning(info, rowid));
        return;
      }

      if (!confirm("Delete this row?")) return;

      await api(`/admin/${currentTableKey}/${rowid}`, { method: "DELETE" });
      await loadTable(currentTableKey, tableTitleEl?.textContent || "");
    }
  } catch (err) {
    console.error("ACTION ERROR:", err);
    if (err.status === 409) {
      alert(err?.data?.error || err.message || "Cannot delete due to references. Hover delete for details.");
      return;
    }
    alert(`Error: ${err.message || "Request failed"}`);
  }
}

// ---------- Boot ----------
(async function boot() {
  updateButtons();

  // If admin.html is missing required elements, stop here.
  const required = ["status", "adminArea", "tableLinks", "tableTitle", "tableContainer", "saveBtn", "createBtn", "logoutBtn"];
  const missing = required.filter((id) => !document.getElementById(id));
  if (missing.length) {
    console.error("admin.js: admin.html is missing these IDs:", missing);
    alert("admin.html is missing required elements. Open DevTools Console to see missing IDs.");
    return;
  }

  safeShow(adminArea, "block");
  safeShow(logoutBtn, "inline-block");

  try {
    safeSetText(statusEl, "Loading admin dashboard…");
    await loadAdminMeta();
  } catch (e) {
    console.error("BOOT ERROR:", e);
    safeSetText(statusEl, `Error: ${e.message}`);
  }
})();