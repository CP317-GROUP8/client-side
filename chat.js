// ─── CP317 Car Rentals — Support Chat Widget ─────────────────────────────────
// Drop this script on any page. It injects the full widget with no extra HTML.
// <script src="chat.js"></script>

(function () {
  // ── Styles ──────────────────────────────────────────────────────────────────
  const css = `
    #cr-chat-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      box-shadow: 0 8px 24px rgba(79,70,229,0.45);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #cr-chat-fab:hover { transform: scale(1.08); box-shadow: 0 12px 30px rgba(79,70,229,0.55); }
    #cr-chat-fab svg { width: 26px; height: 26px; fill: white; }

    #cr-chat-badge {
      position: absolute; top: -4px; right: -4px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #ef4444; color: white;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
      animation: cr-pulse 1.8s infinite;
    }
    @keyframes cr-pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.18); }
    }

    #cr-chat-box {
      position: fixed; bottom: 96px; right: 28px; z-index: 9998;
      width: 360px; max-height: 520px;
      background: var(--surface, #ffffff);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(79,70,229,0.15);
      transform: scale(0.92) translateY(16px);
      opacity: 0; pointer-events: none;
      transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), opacity 0.18s ease;
      font-family: Inter, system-ui, sans-serif;
    }
    #cr-chat-box.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    #cr-chat-header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      padding: 16px 18px;
      display: flex; align-items: center; gap: 12px;
    }
    #cr-chat-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0;
    }
    #cr-chat-header-info { flex: 1; }
    #cr-chat-header-name { color: white; font-weight: 700; font-size: 15px; margin: 0; }
    #cr-chat-header-status {
      color: rgba(255,255,255,0.75); font-size: 12px; margin: 2px 0 0;
      display: flex; align-items: center; gap: 5px;
    }
    #cr-chat-header-status::before {
      content: ''; width: 7px; height: 7px; border-radius: 50%;
      background: #4ade80; display: inline-block;
    }
    #cr-chat-close {
      background: rgba(255,255,255,0.15); border: none; cursor: pointer;
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 16px; transition: background 0.15s;
    }
    #cr-chat-close:hover { background: rgba(255,255,255,0.3); }

    #cr-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: var(--surface, #ffffff);
      max-height: 320px;
    }
    #cr-chat-messages::-webkit-scrollbar { width: 4px; }
    #cr-chat-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

    .cr-msg {
      display: flex; gap: 8px; align-items: flex-end;
    }
    .cr-msg.user { flex-direction: row-reverse; }
    .cr-msg-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: white; font-weight: 700;
    }
    .cr-msg.user .cr-msg-avatar { background: #e2e8f0; color: #64748b; }
    .cr-msg-bubble {
      max-width: 76%; padding: 10px 14px;
      border-radius: 16px; font-size: 13.5px; line-height: 1.5;
      color: #0f172a;
      background: #f1f5f9;
    }
    .cr-msg.user .cr-msg-bubble {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; border-bottom-right-radius: 4px;
    }
    .cr-msg.bot .cr-msg-bubble { border-bottom-left-radius: 4px; }

    .cr-typing {
      display: flex; gap: 4px; padding: 10px 14px;
      background: #f1f5f9; border-radius: 16px; border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .cr-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
      animation: cr-bounce 1.2s infinite;
    }
    .cr-typing span:nth-child(2) { animation-delay: 0.2s; }
    .cr-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes cr-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40%            { transform: translateY(-6px); }
    }

    #cr-quick-replies {
      padding: 8px 16px 4px;
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .cr-qr {
      padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;
      border: 1.5px solid #c7d2fe; background: #eef2ff; color: #4f46e5;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .cr-qr:hover { background: #4f46e5; color: white; border-color: #4f46e5; }

    #cr-chat-input-row {
      display: flex; gap: 8px; padding: 12px 16px;
      border-top: 1px solid #f1f5f9;
      background: var(--surface, #ffffff);
    }
    #cr-chat-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 10px 14px; font-size: 13.5px; outline: none;
      background: #f8fafc; color: #0f172a;
      font-family: Inter, system-ui, sans-serif;
      transition: border-color 0.15s;
    }
    #cr-chat-input:focus { border-color: #a5b4fc; }
    #cr-chat-input::placeholder { color: #94a3b8; }
    #cr-chat-send {
      width: 40px; height: 40px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity 0.15s;
    }
    #cr-chat-send:hover { opacity: 0.88; }
    #cr-chat-send svg { width: 18px; height: 18px; fill: white; }

    @media (max-width: 420px) {
      #cr-chat-box { width: calc(100vw - 32px); right: 16px; bottom: 86px; }
      #cr-chat-fab { right: 16px; bottom: 16px; }
    }
  `;

  // ── Response engine ──────────────────────────────────────────────────────────
  const RESPONSES = [
    {
      match: ["hello", "hi", "hey", "howdy", "hiya", "sup"],
      reply: "Hi there! 👋 Welcome to CP317 Car Rentals. How can I help you today?",
      quick: ["How do I book?", "Browse cars", "Pricing info", "Cancel booking"],
    },
    {
      match: ["cancel", "cancellation", "refund", "undo booking", "cancel booking"],
      reply: "You can cancel a booking from **My Bookings** page. Find the booking you want to cancel and click Cancel. Please note cancellations may affect your total spent balance.",
      quick: ["How do I book?", "Contact support"],
    },
    {
      match: ["book", "reserve", "rent", "how do i book", "how to book"],
      reply: "Booking is easy! Browse our cars, click **View** on any vehicle, pick your pickup and dropoff dates and locations, then click **Book**. You'll be taken to a secure payment page to confirm. 🚗",
      quick: ["Browse cars", "Payment info", "Cancel booking"],
    },
    {
      match: ["pay", "payment", "card", "charge", "cost", "price", "pricing", "how much"],
      reply: "Our pricing varies by vehicle — you can see the daily rate on each car listing. Payment is processed securely on the checkout page. This is a simulated system so no real charges are made. 💳",
      quick: ["Browse cars", "How do I book?"],
    },
    {
      match: ["location", "city", "where", "nearby", "area"],
      reply: "We have vehicles across Ontario! Use the **Search** bar on the home page to filter by city, or visit the **Nearby** page to see cars in your area. 📍",
      quick: ["Browse cars", "How do I book?"],
    },
    {
      match: ["account", "profile", "sign in", "login", "log in", "sign up", "google"],
      reply: "You can sign in using your Google account on the home page. Your profile, bookings, and favourites are all saved to your account. 🔐",
      quick: ["How do I book?", "My bookings"],
    },
    {
      match: ["favourite", "favorites", "saved", "wishlist"],
      reply: "You can save cars by clicking the ❤️ heart icon on any vehicle card. View all your saved cars on the **Favourites** page.",
      quick: ["Browse cars", "How do I book?"],
    },
    {
      match: ["popular", "best", "top", "recommended", "week"],
      reply: "Check out our **Popular** page to see the most booked vehicles this week! We update it regularly based on booking trends. 🏆",
      quick: ["Browse cars", "How do I book?"],
    },
    {
      match: ["suv", "sedan", "truck", "sport", "van", "type", "filter"],
      reply: "You can filter vehicles by type (SUV, Sedan, Truck, Sport) and drivetrain (AWD, FWD, RWD, 4x4) on the **Browse Cars** page. Use the Filter button at the top! 🔍",
      quick: ["Browse cars", "Pricing info"],
    },
    {
      match: ["date", "available", "availability", "when", "pickup", "dropoff"],
      reply: "When searching for cars, enter your pickup and dropoff dates — we'll only show you vehicles available for those dates. You can also see booked dates on any vehicle's detail page. 📅",
      quick: ["Browse cars", "How do I book?"],
    },
    {
      match: ["review", "rating", "feedback", "stars"],
      reply: "After your rental you can leave a review directly on the vehicle's listing page. Click **Reviews** on any car card to read or write a review. ⭐",
      quick: ["Browse cars"],
    },
    {
      match: ["compare", "comparison", "vs", "versus", "difference"],
      reply: "Use the **Compare** button on any car card to add it to a side-by-side comparison. You can compare up to 2 vehicles at once! 🔄",
      quick: ["Browse cars"],
    },
    {
      match: ["help", "support", "contact", "issue", "problem", "question"],
      reply: "I'm here to help! You can ask me anything about bookings, pricing, locations, or how the site works. For urgent issues, please contact us at support@cp317rentals.ca 📧",
      quick: ["How do I book?", "Cancel booking", "Pricing info"],
    },
    {
      match: ["thank", "thanks", "thx", "ty", "great", "awesome", "perfect", "nice"],
      reply: "You're welcome! Is there anything else I can help you with? 😊",
      quick: ["How do I book?", "Browse cars", "Contact support"],
    },
    {
      match: ["bye", "goodbye", "see you", "later", "done", "nothing"],
      reply: "Thanks for chatting! Enjoy your rental. Safe travels! 🚙💨",
      quick: [],
    },
    {
      match: ["browse cars", "browse", "see cars", "view cars", "all cars"],
      reply: "Head to the **Browse Cars** page to see all available vehicles! You can filter by type, drivetrain, and price, or search by make and model. 🚗",
      quick: ["How do I book?", "Pricing info", "Cancel booking"],
    },
    {
      match: ["contact support", "contact us", "email", "reach out", "get help"],
      reply: "Thank you for reaching out! 🙏 One of our administrators will review your enquiry and get back to you shortly. In the meantime, feel free to ask me anything and I'll do my best to assist you.",
      quick: ["How do I book?", "Cancel booking", "Pricing info"],
    },
  ];

  const FALLBACK = {
    reply: "I'm not sure about that one! Try asking about bookings, pricing, locations, or available vehicles. You can also email us at support@cp317rentals.ca 😊",
    quick: ["How do I book?", "Pricing info", "Cancel booking", "Contact support"],
  };

  const INITIAL_QUICK = ["How do I book?", "Browse cars", "Pricing info", "Cancel booking"];

  function getResponse(text) {
    const lower = text.toLowerCase().trim();
    for (const r of RESPONSES) {
      if (r.match.some(k => lower.includes(k))) return r;
    }
    return FALLBACK;
  }

  // ── DOM setup ────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const fab = document.createElement("button");
  fab.id = "cr-chat-fab";
  fab.setAttribute("aria-label", "Open support chat");
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/>
    </svg>
    <div id="cr-chat-badge">1</div>
  `;
  document.body.appendChild(fab);

  const box = document.createElement("div");
  box.id = "cr-chat-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Support chat");
  box.innerHTML = `
    <div id="cr-chat-header">
      <div id="cr-chat-avatar">🚗</div>
      <div id="cr-chat-header-info">
        <p id="cr-chat-header-name">CP317 Support</p>
        <p id="cr-chat-header-status">Online — typically replies instantly</p>
      </div>
      <button id="cr-chat-close" aria-label="Close chat">✕</button>
    </div>
    <div id="cr-chat-messages"></div>
    <div id="cr-quick-replies"></div>
    <div id="cr-chat-input-row">
      <input id="cr-chat-input" type="text" placeholder="Type a message…" maxlength="200" autocomplete="off">
      <button id="cr-chat-send" aria-label="Send message">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  `;
  document.body.appendChild(box);

  const messagesEl     = box.querySelector("#cr-chat-messages");
  const inputEl        = box.querySelector("#cr-chat-input");
  const sendEl         = box.querySelector("#cr-chat-send");
  const closeEl        = box.querySelector("#cr-chat-close");
  const quickRepliesEl = box.querySelector("#cr-quick-replies");
  const badgeEl        = fab.querySelector("#cr-chat-badge");

  let isOpen = false;
  let typingEl = null;

  function getUserInitials() {
    try {
      const data = JSON.parse(localStorage.getItem("userData") || "{}");
      const first = (data.firstName || data["First Name"] || "").trim();
      const last  = (data.lastName  || data["Last Name"]  || "").trim();
      if (first && last) return (first[0] + last[0]).toUpperCase();
      if (first) return first[0].toUpperCase();
    } catch {}
    return "U";
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, sender) {
    const initials = sender === "user" ? getUserInitials() : "🤖";
    const msgEl = document.createElement("div");
    msgEl.className = `cr-msg ${sender}`;
    msgEl.innerHTML = `
      <div class="cr-msg-avatar">${initials}</div>
      <div class="cr-msg-bubble">${text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</div>
    `;
    messagesEl.appendChild(msgEl);
    scrollToBottom();
    return msgEl;
  }

  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "cr-msg bot";
    wrap.innerHTML = `
      <div class="cr-msg-avatar">🤖</div>
      <div class="cr-typing"><span></span><span></span><span></span></div>
    `;
    messagesEl.appendChild(wrap);
    scrollToBottom();
    typingEl = wrap;
  }

  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  function setQuickReplies(items) {
    quickRepliesEl.innerHTML = "";
    items.forEach(label => {
      const btn = document.createElement("button");
      btn.className = "cr-qr";
      btn.textContent = label;
      btn.addEventListener("click", e => {
        e.stopPropagation();
        handleSend(label);
      });
      quickRepliesEl.appendChild(btn);
    });
  }

  function handleSend(text) {
    const msg = (text || inputEl.value).trim();
    if (!msg) return;
    inputEl.value = "";
    quickRepliesEl.innerHTML = "";

    addMessage(msg, "user");

    const delay = 600 + Math.random() * 600;
    showTyping();

    setTimeout(() => {
      hideTyping();
      const { reply, quick } = getResponse(msg);
      addMessage(reply, "bot");
      if (quick && quick.length) setQuickReplies(quick);
    }, delay);
  }

  function openChat() {
    isOpen = true;
    box.classList.add("open");
    badgeEl.style.display = "none";
    inputEl.focus();

    if (messagesEl.children.length === 0) {
      setTimeout(() => {
        showTyping();
        setTimeout(() => {
          hideTyping();
          addMessage("👋 Hi! I'm the CP317 Car Rentals support assistant. How can I help you today?", "bot");
          setQuickReplies(INITIAL_QUICK);
        }, 900);
      }, 300);
    }
  }

  function closeChat() {
    isOpen = false;
    box.classList.remove("open");
  }

  fab.addEventListener("click", () => isOpen ? closeChat() : openChat());
  closeEl.addEventListener("click", closeChat);

  sendEl.addEventListener("click", e => { e.stopPropagation(); handleSend(); });
  inputEl.addEventListener("keydown", e => { if (e.key === "Enter") { e.stopPropagation(); handleSend(); } });

  document.addEventListener("click", e => {
    if (!isOpen) return;
    if (box.contains(e.target)) return;
    if (fab.contains(e.target)) return;
    setTimeout(() => closeChat(), 10);
  });

})();