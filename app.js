const API_BASE = "https://server-side-zqaz.onrender.com";

async function handleCredentialResponse(response) {
  const status = document.getElementById("status");
  status.textContent = "Signing you in...";

  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    status.textContent = `Welcome, ${data.firstName} ${data.lastName}`;
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}