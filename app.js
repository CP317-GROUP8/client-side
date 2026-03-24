const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:10000"
  : "https://server-side-zqaz.onrender.com";

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
  // Also save in the format expected by the rest of the site
  if (profile) {
    localStorage.setItem("userData", JSON.stringify(profile));
    localStorage.setItem("loggedInAt", String(Date.now()));
    localStorage.setItem("isAdmin", String(Number(profile.administrator) === 1 ? 1 : 0));
  }
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

    // ✅ Fixed: use idToken not credential
    const data = await api("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        idToken: response.credential
      })
    });

    const profile = data.user || data.profile || data;
    saveSession(profile);

    const needsLocation = !profile.location || !String(profile.location).trim();
    const isAdmin = Number(profile.administrator) === 1;

    if (needsLocation) {
      hideNav();
      showLocationSetup();
      setStatus("Finish signup by adding your location.");
    } else {
      // ✅ Redirect to home after successful login
      window.location.href = "home.html";
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
    headers: { "X-User-Email": profile.email },
    body: JSON.stringify({ location })
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
  const form  = document.getElementById("locationForm");
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
        await saveLocation(location);
        // ✅ Redirect to home after location saved
        window.location.href = "home.html";
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
      // Already logged in with location — go straight to home
      window.location.href = "home.html";
    }
  }
});