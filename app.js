const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

// Session duration for "must have logged in recently"
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

function getStatusEl() {
  return document.getElementById("status");
}

function getNavArea() {
  return document.getElementById("navArea");
}

function getAdminBtn() {
  return document.getElementById("adminBtn");
}

function getLocationSetup() {
  return document.getElementById("locationSetup");
}

function getLocationInput() {
  return document.getElementById("locationInput");
}

function getSaveLocationBtn() {
  return document.getElementById("saveLocationBtn");
}

function normalizeLocation(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function hasSavedLocation(userData) {
  return Boolean(normalizeLocation(userData?.location || userData?.Location));
}

function setLocationSetupOpen(isOpen) {
  const locationSetup = getLocationSetup();
  const navArea = getNavArea();
  if (!locationSetup || !navArea) return;

  locationSetup.classList.toggle("open", isOpen);
  navArea.style.display = isOpen ? "none" : "block";
}

function updateNavVisibility(userData) {
  const navArea = getNavArea();
  const adminBtn = getAdminBtn();
  if (!navArea || !adminBtn) return;

  const adminVal = Number(userData?.administrator || userData?.Administrator || localStorage.getItem("isAdmin") || 0);
  navArea.style.display = hasSavedLocation(userData) ? "block" : "none";
  adminBtn.style.display = adminVal === 1 ? "inline-block" : "none";
}

async function fetchProfile(email) {
  const res = await fetch(`${API_BASE}/me/profile`, {
    headers: { "X-User-Email": email },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load profile");
  return data.user || null;
}

async function saveSignupLocation(location) {
  const email = localStorage.getItem("userEmail");
  if (!email) throw new Error("Missing user session");

  const res = await fetch(`${API_BASE}/me/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": email,
    },
    body: JSON.stringify({ location }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not save location");
  return data.user || null;
}

function showLocationOnboarding(userData) {
  const statusEl = getStatusEl();
  const locationInput = getLocationInput();
  setLocationSetupOpen(true);
  if (locationInput) locationInput.value = normalizeLocation(userData?.location || userData?.Location);
  if (statusEl) statusEl.textContent = "Finish signup by adding your location.";
}

function finalizeSignedInState(userData) {
  const statusEl = getStatusEl();
  const firstName = userData?.firstName || userData?.["First Name"] || "";
  const lastName = userData?.lastName || userData?.["Last Name"] || "";
  const email = userData?.email || localStorage.getItem("userEmail") || "";

  if (statusEl) {
    statusEl.textContent = firstName || lastName
      ? `Welcome, ${firstName} ${lastName} (${email})`
      : `Session active (${email})`;
  }

  if (userData) {
    localStorage.setItem("userData", JSON.stringify(userData));
    if (userData.email) localStorage.setItem("userEmail", userData.email);
    if (userData.administrator !== undefined) {
      localStorage.setItem("isAdmin", String(Number(userData.administrator) === 1 ? 1 : 0));
    }
  }

  setLocationSetupOpen(false);
  updateNavVisibility(userData);
}

async function resolvePostLoginState(userData) {
  if (!hasSavedLocation(userData)) {
    showLocationOnboarding(userData);
    return;
  }
  finalizeSignedInState(userData);
}

function setSession({ email, administrator, userData }) {
  localStorage.setItem("userEmail", email);
  localStorage.setItem("isAdmin", String(Number(administrator) === 1 ? 1 : 0));
  localStorage.setItem("loggedInAt", String(Date.now()));
  if (userData) localStorage.setItem("userData", JSON.stringify(userData)); // ← NEW
}

function clearSession() {
  localStorage.removeItem("userEmail");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("loggedInAt");
  localStorage.removeItem("userData"); // ← NEW
}

function hasValidSession() {
  const email = localStorage.getItem("userEmail");
  const loggedInAt = Number(localStorage.getItem("loggedInAt") || "0");
  if (!email || !loggedInAt) return false;
  if (Date.now() - loggedInAt > SESSION_MS) return false;
  return true;
}

// Called by Google Identity Services
async function handleCredentialResponse(response) {
  const statusEl = getStatusEl();
  statusEl.textContent = "Signing you in...";

  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");

    // Backend returns: { userId, firstName, lastName, email, administrator, totalSpent }
    const email = data.email || "";
    const firstName = data.firstName || "";
    const lastName = data.lastName || "";
    const adminVal = Number(data.administrator || 0);

    setSession({ email, administrator: adminVal, userData: data }); // ← passes full user

    await resolvePostLoginState({
      ...data,
      firstName,
      lastName,
      email,
      administrator: adminVal,
    });
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    clearSession();
    setLocationSetupOpen(false);
  }
}

window.handleCredentialResponse = handleCredentialResponse;

// On page load: if already logged in, show nav immediately
(async function boot() {
  const statusEl = getStatusEl();
  const navArea = getNavArea();
  if (hasValidSession()) {
    const email = localStorage.getItem("userEmail");
    const cachedUser = JSON.parse(localStorage.getItem("userData") || "null");

    statusEl.textContent = `Checking profile for ${email}...`;
    try {
      const profile = await fetchProfile(email);
      const mergedUser = { ...cachedUser, ...profile };
      localStorage.setItem("userData", JSON.stringify(mergedUser));
      await resolvePostLoginState(mergedUser);
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      clearSession();
      setLocationSetupOpen(false);
      navArea.style.display = "none";
    }
  } else {
    // If session expired, clear it
    clearSession();
    navArea.style.display = "none";
    setLocationSetupOpen(false);
  }
})();

const locationForm = document.getElementById("locationForm");
if (locationForm) {
  locationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const statusEl = getStatusEl();
    const saveBtn = getSaveLocationBtn();
    const locationInput = getLocationInput();
    const location = normalizeLocation(locationInput?.value);

    if (!location) {
      statusEl.textContent = "Enter your location to complete signup.";
      locationInput?.focus();
      return;
    }

    try {
      if (saveBtn) saveBtn.disabled = true;
      statusEl.textContent = "Saving your location...";
      const user = await saveSignupLocation(location);
      finalizeSignedInState(user);
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}
