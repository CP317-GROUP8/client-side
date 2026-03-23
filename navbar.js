(function() {
  function injectNav() {
    if (document.getElementById("globalNav")) return;

    const style = document.createElement("style");
    style.textContent = `
      .global-nav {
        position: sticky;
        top: 0;
        z-index: 9999;
        background: var(--surface, rgba(255,255,255,0.85));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border, rgba(148,163,184,0.2));
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 40px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        font-family: Inter, system-ui, sans-serif;
      }
      .nav-brand {
        font-weight: 700;
        font-size: 20px;
        color: var(--ink, #0d1117);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-right: 20px;
      }
      .nav-links {
        display: flex;
        gap: 24px;
        align-items: center;
        flex: 1;
      }
      .nav-link {
        color: var(--ink2, #4b5563);
        text-decoration: none;
        font-weight: 500;
        font-size: 15px;
        transition: color 0.15s;
      }
      .nav-link:hover, .nav-link.active {
        color: var(--accent, #4f46e5);
      }
      .nav-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .nav-btn {
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s;
        border: 1px solid transparent;
        display: inline-block;
      }
      .nav-btn-primary {
        background: var(--accent, #4f46e5);
        color: white;
      }
      .nav-btn-primary:hover {
        filter: brightness(0.95);
      }
      .nav-btn-secondary {
        background: var(--surface, white);
        color: var(--ink, #0d1117);
        border-color: var(--border, #ccc);
      }
      .nav-btn-secondary:hover {
        background: var(--surface2, #f4f6f9);
      }
      .nav-dm-toggle {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .nav-dm-toggle:hover {
        background: var(--surface2, #f4f6f9);
      }
      @media (max-width: 900px) {
        .global-nav { flex-direction: column; gap: 12px; padding: 12px 20px; }
        .nav-links { flex-wrap: wrap; justify-content: center; gap: 16px; }
      }
    `;
    document.head.appendChild(style);

    const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
    const userEmail = localStorage.getItem("userEmail");
    const loggedInAt = localStorage.getItem("loggedInAt");
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    
    const isLoggedIn = (userEmail && loggedInAt) || isPreview;
    
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const linkSuffix = isPreview ? "?preview=1" : "";
    
    const nav = document.createElement("nav");
    nav.id = "globalNav";
    nav.className = "global-nav";
    
    nav.innerHTML = `
      <a href="home.html${linkSuffix}" class="nav-brand">
        <span style="font-size: 24px;">🚗</span> Car Rental
      </a>
      <div class="nav-links">
        <a href="home.html${linkSuffix}" class="nav-link ${currentPath==='home.html'?'active':''}">Home</a>
        <a href="cars.html${linkSuffix}" class="nav-link ${currentPath==='cars.html'?'active':''}">Browse Cars</a>
        <a href="nearby.html${linkSuffix}" class="nav-link ${currentPath==='nearby.html'?'active':''}">Nearby</a>
        <a href="popular.html${linkSuffix}" class="nav-link ${currentPath==='popular.html'?'active':''}">Popular</a>
        <a href="Favourites.html${linkSuffix}" class="nav-link ${currentPath==='Favourites.html'?'active':''}">Favourites</a>
        ${isLoggedIn ? `<a href="my-bookings.html${linkSuffix}" class="nav-link ${currentPath==='my-bookings.html'?'active':''}">My Bookings</a>` : ''}
        ${isAdmin ? `<a href="admin.html${linkSuffix}" class="nav-link ${currentPath==='admin.html'?'active':''}">Admin Board</a>` : ''}
      </div>
      <div class="nav-right">
        <button class="nav-dm-toggle dm-toggle" title="Toggle Dark Mode">🌙</button>
        ${isLoggedIn 
          ? `<a href="account.html${linkSuffix}" class="nav-btn nav-btn-secondary">My Account</a>
             <button id="navLogoutBtn" class="nav-btn nav-btn-secondary">Logout</button>`
          : `<a href="index.html" class="nav-btn nav-btn-primary">Sign In</a>`
        }
      </div>
    `;

    document.body.insertBefore(nav, document.body.firstChild);

    const logoutBtn = document.getElementById("navLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("loggedInAt");
        localStorage.removeItem("isAdmin");
        window.location.href = "index.html";
      });
    }

    if (typeof window.toggleDarkMode === "function") {
      const btn = nav.querySelector(".nav-dm-toggle");
      btn.addEventListener("click", window.toggleDarkMode);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectNav);
  } else {
    injectNav();
  }
})();
