function requireLogin() {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    window.location.href = "index.html";
    return null;
  }
  return JSON.parse(userStr);
}

const user = requireLogin();
if (user) {
  document.getElementById("hello").textContent = `Hi, ${user.firstName || "User"}`;
}

function goToCars(withParams) {
  const where = document.getElementById("whereInput").value.trim();
  const pickup = document.getElementById("pickupInput").value;
  const dropoff = document.getElementById("dropoffInput").value;

  const params = new URLSearchParams();
  if (withParams) {
    if (where) params.set("where", where);
    if (pickup) params.set("pickup", pickup);
    if (dropoff) params.set("dropoff", dropoff);
  }

  const qs = params.toString();
  window.location.href = qs ? `cars.html?${qs}` : "cars.html";
}

document.getElementById("searchBtn").addEventListener("click", () => goToCars(true));
document.getElementById("browseBtn").addEventListener("click", () => goToCars(false));

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

document.getElementById("iconHome").addEventListener("click", () => {
  window.location.href = "home.html";
});

document.getElementById("iconCars").addEventListener("click", () => {
  goToCars(false);
});

document.getElementById("iconProfile").addEventListener("click", () => {
  alert("Profile page coming in Sprint 2");
});

document.getElementById("iconHelp").addEventListener("click", () => {
  alert("Help page coming in Sprint 2");
});


