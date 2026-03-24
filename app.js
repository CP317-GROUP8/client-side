const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

// Session duration for "must have logged in recently"
const SESSION_MS = 12 * 60 * 60 * 1000;

function getStatusEl() {
  return document.getElementById("status");
}

function setStatus(message, isError = false) {
  const el = getStatusEl();
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#b91c1c" : "#475569";
}

function showNav(showAdmin = false) {
  const nav = document.getElementById("navArea");
  const adminBtn = document.getElementById("adminBtn");

  if (nav) nav.style.display = "flex";
  if (adminBtn) adminBtn.style.display = showAdmin ? "inline-block" : "none";
}

function hideNav() {
  const nav = document.getElementById("navArea");
  if (nav) nav.style.display = "none";
}

function showLocationSetup() {
  const box = document.getElementById("locationSetup");
  if (box) box.classList.add("open");
}

function hideLocationSetup() {
  const box = document.getElementById("locationSetup");
  if (box) box.classList.remove("open");
}

function saveSession(profile) {
  localStorage.setItem("userProfile", JSON.stringify(profile));
  localStorage.setItem("lastLoginAt", String(Date.now()));
  if (profile?.email) localStorage.setItem("userEmail", profile.email);
}

function getStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem("userProfile") || "null");
  } catch {
    return null;
  }
}

function isSessionFresh() {
  const last = Number(localStorage.getItem("lastLoginAt") || 0);
  return last && Date.now() - last < SESSION_MS;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function handleCredentialResponse(response) {
  try {
    setStatus("Signing you in...");

    const data = await api("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        credential: response.credential
      })
    });

    const profile = data.user || data.profile || data;
    saveSession(profile);

    const displayName = profile.name || profile.fullName || "User";
    const displayEmail = profile.email || "";

    const needsLocation = !profile.location || !String(profile.location).trim();
    const isAdmin = !!profile.isAdmin;

    if (needsLocation) {
      hideNav();
      showLocationSetup();
      setStatus(`Finish signup by adding your location.`);
    } else {
      hideLocationSetup();
      showNav(isAdmin);
      setStatus(`Welcome, ${displayName}${displayEmail ? ` (${displayEmail})` : ""}`);
    }
  } catch (err) {
    setStatus(err.message || "Sign-in failed.", true);
  }
}

window.handleCredentialResponse = handleCredentialResponse;

async function saveLocation(location) {
  const profile = getStoredProfile();
  if (!profile?.email) {
    throw new Error("No signed-in user found.");
  }

  const data = await api("/me/profile", {
    method: "PUT",
    body: JSON.stringify({
      email: profile.email,
      location
    })
  });

  const updated = {
    ...profile,
    ...(data.user || {}),
    location
  };

  saveSession(updated);
  return updated;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("locationForm");
  const input = document.getElementById("locationInput");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const location = input?.value?.trim();
      if (!location) {
        setStatus("Please enter your location.", true);
        return;
      }

      try {
        setStatus("Saving your location...");
        const updated = await saveLocation(location);
        hideLocationSetup();
        showNav(!!updated.isAdmin);
        setStatus(`Welcome, ${updated.name || updated.fullName || "User"} (${updated.email || ""})`);
      } catch (err) {
        setStatus(err.message || "Could not save location.", true);
      }
    });
  }

  const profile = getStoredProfile();
  if (profile && isSessionFresh()) {
    const needsLocation = !profile.location || !String(profile.location).trim();

    if (needsLocation) {
      showLocationSetup();
      hideNav();
      setStatus("Finish signup by adding your location.");
    } else {
      hideLocationSetup();
      showNav(!!profile.isAdmin);
      setStatus(`Welcome, ${profile.name || profile.fullName || "User"} (${profile.email || ""})`);
    }
  }
});