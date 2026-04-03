/* ============================================
   আমাদের গল্প — script.js v2
   Password-Protected Admin + Beautiful Gallery
   ============================================ */

// ——— Configuration ———
const CONFIG = {
  cloudName:    "djbtmpqh9",
  uploadPreset: "memories",
  supabaseUrl:  "https://exjkutkqcsoxyjnimlhh.supabase.co",
  supabaseKey:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amt1dGtxY3NveHlqbmltbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDU2NDgsImV4cCI6MjA4NzQyMTY0OH0.blV_tGKnx_Q6LqSqx4-K1ioLCaBgrCLkpuNEeHQJD9s",

  // Admin password hash (sha256)
  adminPasswordHash: "",
};

// On first run, compute and store the correct hash
(async () => {
  const correctHash = await sha256("Areen143");
  CONFIG.adminPasswordHash = correctHash;
})();

// ——— SHA-256 Helper ———
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ——— Init Supabase ———
const db = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ——— DOM References ———
const fileInput         = document.getElementById("fileInput");
const gallery           = document.getElementById("gallery");
const dropZone          = document.getElementById("dropZone");
const progressWrap      = document.getElementById("progressWrap");
const progressBar       = document.getElementById("progressBar");
const progressLabel     = document.getElementById("progressLabel");
const emptyState        = document.getElementById("emptyState");
const adminBadge        = document.getElementById("adminBadge");
const adminLogoutBtn    = document.getElementById("adminLogoutBtn");
const loadingScreen     = document.getElementById("loadingScreen");
const lightbox          = document.getElementById("lightbox");
const lightboxMedia     = document.getElementById("lightboxMedia");
const lightboxClose     = document.getElementById("lightboxClose");
const lightboxCounter   = document.getElementById("lightboxCounter");
const lbPrev            = document.getElementById("lbPrev");
const lbNext            = document.getElementById("lbNext");
const toastContainer    = document.getElementById("toastContainer");
const adminModal        = document.getElementById("adminModal");
const adminModalOverlay = document.getElementById("adminModalOverlay");
const adminModalClose   = document.getElementById("adminModalClose");
const adminPasswordInput= document.getElementById("adminPasswordInput");
const adminLoginBtn     = document.getElementById("adminLoginBtn");
const adminError        = document.getElementById("adminError");
const adminTriggerBtn   = document.getElementById("adminTriggerBtn");
const passToggle        = document.getElementById("passToggle");
const heartsBg          = document.getElementById("heartsBg");

// Stats
const totalCountEl = document.getElementById("totalCount");
const photoCountEl = document.getElementById("photoCount");
const videoCountEl = document.getElementById("videoCount");

// ——— Admin State ———
// Stored in sessionStorage — persists while tab is open
let isAdmin = sessionStorage.getItem("amaderGolpoAdmin") === "1";

// ——— Apply Admin UI on load ———
function applyAdminUI() {
  if (isAdmin) {
    adminTriggerBtn.classList.add("active-admin");
    adminTriggerBtn.title = "Admin Mode Active — ক্লিক করুন লগআউট করতে";
  } else {
    adminTriggerBtn.classList.remove("active-admin");
    adminTriggerBtn.title = "Admin Login";
  }
}
applyAdminUI();

// ——— Admin Modal: Open/Close ———
function openAdminModal() {
  adminModal.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => adminPasswordInput.focus(), 200);
  adminError.textContent = "";
  adminPasswordInput.value = "";
}
function closeAdminModal() {
  adminModal.classList.remove("open");
  document.body.style.overflow = "";
}

adminTriggerBtn.addEventListener("click", () => {
  if (isAdmin) {
    // If already admin, show logout confirmation
    if (confirm("Admin mode থেকে বের হবেন?")) {
      logoutAdmin();
    }
  } else {
    openAdminModal();
  }
});

adminModalClose.addEventListener("click", closeAdminModal);
adminModalOverlay.addEventListener("click", closeAdminModal);

// Password visibility toggle
passToggle.addEventListener("click", () => {
  const isHidden = adminPasswordInput.type === "password";
  adminPasswordInput.type = isHidden ? "text" : "password";
  passToggle.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
});

// Admin login
adminLoginBtn.addEventListener("click", verifyAndLogin);
adminPasswordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") verifyAndLogin();
});

async function verifyAndLogin() {
  const pass = adminPasswordInput.value.trim();
  if (!pass) {
    adminError.textContent = "পাসওয়ার্ড দিতে হবে ⚠️";
    adminPasswordInput.focus();
    return;
  }

  adminLoginBtn.classList.add("loading");
  adminLoginBtn.querySelector("span").textContent = "যাচাই হচ্ছে...";
  adminError.textContent = "";

  try {
    const inputHash = await sha256(pass);
    if (inputHash === CONFIG.adminPasswordHash) {
      // Correct password!
      isAdmin = true;
      sessionStorage.setItem("amaderGolpoAdmin", "1");
      closeAdminModal();
      applyAdminUI();
      // Re-render gallery to show delete buttons
      applyFilter(currentFilter);
      showToast("স্বাগতম Admin! 👑", "success", 3000);
    } else {
      adminError.textContent = "ভুল পাসওয়ার্ড! আবার চেষ্টা করুন ❌";
      adminPasswordInput.value = "";
      adminPasswordInput.focus();
      // Shake animation
      adminLoginBtn.style.animation = "none";
      adminPasswordInput.style.borderColor = "#fca5a5";
      setTimeout(() => {
        adminPasswordInput.style.borderColor = "";
      }, 1500);
    }
  } catch (err) {
    adminError.textContent = "সমস্যা হয়েছে, আবার চেষ্টা করুন";
    console.error(err);
  }

  adminLoginBtn.classList.remove("loading");
  adminLoginBtn.querySelector("span").textContent = "প্রবেশ করুন";
}

function logoutAdmin() {
  isAdmin = false;
  sessionStorage.removeItem("amaderGolpoAdmin");
  applyAdminUI();
  applyFilter(currentFilter);
  showToast("Admin mode বন্ধ হয়েছে", "info");
}

adminLogoutBtn.addEventListener("click", logoutAdmin);

// ——— Floating Hearts Background ———
function spawnHeart() {
  const hearts = ["❤", "♥", "💕", "💗", "💓", "💖"];
  const el = document.createElement("span");
  el.className = "floating-heart";
  el.textContent = hearts[Math.floor(Math.random() * hearts.length)];
  el.style.left = Math.random() * 100 + "vw";
  el.style.fontSize = (Math.random() * 0.7 + 0.5) + "rem";
  el.style.color = `hsl(${Math.random() * 30 + 330}, 70%, ${Math.random() * 20 + 55}%)`;
  const duration = Math.random() * 12 + 10;
  el.style.animationDuration = duration + "s";
  el.style.animationDelay = Math.random() * 3 + "s";
  heartsBg.appendChild(el);
  setTimeout(() => el.remove(), (duration + 3) * 1000);
}
// Spawn hearts gradually
setInterval(spawnHeart, 2800);
setTimeout(() => { for (let i = 0; i < 5; i++) setTimeout(spawnHeart, i * 500); }, 500);

// ——— Toast Notification System ———
function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

// ——— Update Stats ———
function updateStats() {
  const photos = allMemories.filter(m => m.type && m.type.startsWith("image")).length;
  const videos = allMemories.length - photos;
  totalCountEl.textContent = allMemories.length;
  photoCountEl.textContent = photos;
  videoCountEl.textContent = videos;
}

// ——— State ———
let allMemories   = [];
let filtered      = [];
let currentFilter = "all";
let lightboxIndex = 0;

// ——— Apply Filter ———
function applyFilter(filter) {
  currentFilter = filter;
  if (filter === "all")        filtered = [...allMemories];
  else if (filter === "image") filtered = allMemories.filter(m => m.type && m.type.startsWith("image"));
  else if (filter === "video") filtered = allMemories.filter(m => m.type && m.type.startsWith("video"));

  gallery.innerHTML = "";
  if (filtered.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    filtered.forEach((item, idx) => displayMedia(item.url, item.type, item.id, idx));
  }
}

// ——— Load All Memories from DB ———
async function loadMemories() {
  const { data, error } = await db
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });

  loadingScreen.classList.add("hidden");

  if (error) {
    showToast("স্মৃতি লোড করতে সমস্যা হয়েছে 😔", "error");
    gallery.innerHTML = "";
    return;
  }

  allMemories = data || [];
  updateStats();
  applyFilter(currentFilter);
}

// ——— Display a Single Media Card ———
function displayMedia(url, type, id, index = 0) {
  const isImage = type && type.startsWith("image");

  const container = document.createElement("div");
  container.className = "media-container";
  container.style.animationDelay = `${Math.min(index * 0.055, 0.45)}s`;
  container.dataset.id = id;

  const overlay = document.createElement("div");
  overlay.className = "media-overlay";

  if (!isImage) {
    const badge = document.createElement("div");
    badge.className = "video-badge";
    badge.textContent = "▶ Video";
    container.appendChild(badge);
  }

  let media;
  if (isImage) {
    media = document.createElement("img");
    media.src = url;
    media.alt = "Our beautiful memory";
    media.loading = "lazy";
    media.decoding = "async";
  } else {
    media = document.createElement("video");
    media.src = url;
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
  }

  if (isImage) {
    media.style.cursor = "zoom-in";
    media.addEventListener("click", (e) => {
      e.stopPropagation();
      openLightbox(id);
    });
  }

  // Button Group
  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group";

  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> সেভ`;
  saveBtn.onclick = (e) => {
    e.stopPropagation();
    downloadMedia(url, id, type);
  };
  btnGroup.appendChild(saveBtn);

  // Delete button — only for admins
  if (isAdmin) {
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg> মুছুন`;
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("এই স্মৃতিটি চিরতরে মুছে ফেলবেন?")) return;
      const { error } = await db.from("memories").delete().eq("id", id);
      if (!error) {
        container.style.transition = "all 0.38s var(--transition)";
        container.style.opacity = "0";
        container.style.transform = "scale(0.88)";
        setTimeout(() => {
          container.remove();
          allMemories = allMemories.filter(m => m.id !== id);
          filtered    = filtered.filter(m => m.id !== id);
          updateStats();
          if (filtered.length === 0) emptyState.style.display = "block";
        }, 400);
        showToast("স্মৃতিটি মুছে ফেলা হয়েছে 🗑️", "info");
      } else {
        showToast("মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "error");
      }
    };
    btnGroup.appendChild(delBtn);
  }

  container.appendChild(media);
  container.appendChild(overlay);
  container.appendChild(btnGroup);
  gallery.appendChild(container);
}

// ——— Download Media ———
async function downloadMedia(url, id, type) {
  showToast("ডাউনলোড শুরু হচ্ছে... ⬇️", "info");
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const ext  = type && type.startsWith("image") ? "jpg" : "mp4";
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = `amader_golpo_${id}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast("সেভ হয়ে গেছে! ✅", "success");
  } catch {
    window.open(url, "_blank");
    showToast("নতুন ট্যাবে ওপেন হয়েছে", "info");
  }
}

// ——— Lightbox System ———
function getFilteredImages() {
  return filtered.filter(m => m.type && m.type.startsWith("image"));
}
function openLightbox(id) {
  const images = getFilteredImages();
  const idx    = images.findIndex(m => m.id === id);
  if (idx === -1) return;
  lightboxIndex = idx;
  renderLightboxSlide();
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
  lightboxMedia.innerHTML = "";
}
function renderLightboxSlide() {
  const images = getFilteredImages();
  if (!images.length) return;
  const item = images[lightboxIndex];
  lightboxMedia.innerHTML = "";
  const img = document.createElement("img");
  img.src = item.url;
  img.alt = "Memory";
  lightboxMedia.appendChild(img);
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${images.length}`;
  lbPrev.style.display = images.length > 1 ? "flex" : "none";
  lbNext.style.display = images.length > 1 ? "flex" : "none";
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.querySelector(".lightbox-overlay").addEventListener("click", closeLightbox);
lbPrev.addEventListener("click", () => {
  lightboxIndex = (lightboxIndex - 1 + getFilteredImages().length) % getFilteredImages().length;
  renderLightboxSlide();
});
lbNext.addEventListener("click", () => {
  lightboxIndex = (lightboxIndex + 1) % getFilteredImages().length;
  renderLightboxSlide();
});
document.addEventListener("keydown", (e) => {
  if (adminModal.classList.contains("open")) return;
  if (!lightbox.classList.contains("active")) return;
  if (e.key === "Escape")      closeLightbox();
  if (e.key === "ArrowLeft")   lbPrev.click();
  if (e.key === "ArrowRight")  lbNext.click();
});

// Touch swipe for lightbox
let lbTouchX = null;
lightbox.addEventListener("touchstart", e => { lbTouchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener("touchend", e => {
  if (lbTouchX === null) return;
  const diff = lbTouchX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 45) diff > 0 ? lbNext.click() : lbPrev.click();
  lbTouchX = null;
});

// ——— Upload Flow ———
async function handleUpload(files) {
  if (!files || files.length === 0) return;
  const fileArr = Array.from(files);

  progressWrap.style.display = "block";
  progressBar.style.width    = "0%";
  progressLabel.textContent  = `0 / ${fileArr.length} আপলোড হচ্ছে...`;

  let completed = 0;

  for (const file of fileArr) {
    if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
      showToast(`${file.name} সাপোর্টেড নয়`, "error");
      completed++;
      continue;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CONFIG.uploadPreset);

    try {
      showToast(`আপলোড হচ্ছে... 📤`, "info", 2000);
      const res        = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await res.json();

      if (!uploadData.secure_url) {
        showToast(`আপলোড ব্যর্থ হয়েছে`, "error");
        completed++;
        continue;
      }

      const { data: inserted, error: insertError } = await db
        .from("memories")
        .insert([{ url: uploadData.secure_url, type: file.type }])
        .select();

      if (!insertError && inserted) {
        const newItem = inserted[0];
        allMemories.unshift(newItem);
        if (
          currentFilter === "all" ||
          (currentFilter === "image" && file.type.startsWith("image")) ||
          (currentFilter === "video" && file.type.startsWith("video"))
        ) {
          filtered.unshift(newItem);
          emptyState.style.display = "none";
          displayMedia(newItem.url, newItem.type, newItem.id, 0);
          const cards = gallery.querySelectorAll(".media-container");
          if (cards.length > 1) gallery.prepend(cards[cards.length - 1]);
        }
        updateStats();
        showToast("স্মৃতি যোগ হয়েছে! ❤️", "success");
      } else {
        showToast("ডেটাবেস সংরক্ষণে সমস্যা", "error");
      }
    } catch (err) {
      showToast(`নেটওয়ার্ক সমস্যা`, "error");
      console.error(err);
    }

    completed++;
    const pct = Math.round((completed / fileArr.length) * 100);
    progressBar.style.width   = pct + "%";
    progressLabel.textContent = `${completed} / ${fileArr.length} সম্পন্ন`;
  }

  setTimeout(() => {
    progressWrap.style.display = "none";
    progressBar.style.width    = "0%";
  }, 1200);

  fileInput.value = "";
}

fileInput.addEventListener("change", () => handleUpload(fileInput.files));

// ——— Drag & Drop ———
dropZone.addEventListener("dragover",  (e) => { e.preventDefault(); dropZone.classList.add("dragging"); });
dropZone.addEventListener("dragleave", ()  => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop",      (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragging");
  handleUpload(e.dataTransfer.files);
});

// ——— Filter Buttons ———
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilter(btn.dataset.filter);
  });
});

// ——— Boot ———
loadMemories();
