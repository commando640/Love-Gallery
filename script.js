/* ============================================
   আমাদের গল্প — script.js
   Full-Featured Romantic Gallery App
   ============================================ */

// ——— Configuration ———
const CONFIG = {
  cloudName:    "djbtmpqh9",
  uploadPreset: "memories",
  supabaseUrl:  "https://exjkutkqcsoxyjnimlhh.supabase.co",
  supabaseKey:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amt1dGtxY3NveHlqbmltbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDU2NDgsImV4cCI6MjA4NzQyMTY0OH0.blV_tGKnx_Q6LqSqx4-K1ioLCaBgrCLkpuNEeHQJD9s",
};

// ——— Init Supabase ———
const db = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// ——— DOM References ———
const fileInput       = document.getElementById("fileInput");
const gallery         = document.getElementById("gallery");
const dropZone        = document.getElementById("dropZone");
const progressWrap    = document.getElementById("progressWrap");
const progressBar     = document.getElementById("progressBar");
const progressLabel   = document.getElementById("progressLabel");
const emptyState      = document.getElementById("emptyState");
const adminBadge      = document.getElementById("adminBadge");
const loadingScreen   = document.getElementById("loadingScreen");
const lightbox        = document.getElementById("lightbox");
const lightboxMedia   = document.getElementById("lightboxMedia");
const lightboxClose   = document.getElementById("lightboxClose");
const lightboxCounter = document.getElementById("lightboxCounter");
const lbPrev          = document.getElementById("lbPrev");
const lbNext          = document.getElementById("lbNext");
const toastContainer  = document.getElementById("toastContainer");

// Stats
const totalCountEl = document.getElementById("totalCount");
const photoCountEl = document.getElementById("photoCount");
const videoCountEl = document.getElementById("videoCount");

// ——— State ———
const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";
let allMemories   = [];     // full dataset from DB
let filtered      = [];     // currently shown
let currentFilter = "all";
let lightboxIndex = 0;

// ——— Toast Notification System ———
function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("out");
    toast.addEventListener("animationend", () => toast.remove());
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

// ——— Apply Filter ———
function applyFilter(filter) {
  currentFilter = filter;
  if (filter === "all")   filtered = [...allMemories];
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

  // Hide loading screen
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
  container.style.animationDelay = `${Math.min(index * 0.06, 0.5)}s`;
  container.dataset.id = id;

  // Overlay for hover effect
  const overlay = document.createElement("div");
  overlay.className = "media-overlay";

  // Video badge
  if (!isImage) {
    const badge = document.createElement("div");
    badge.className = "video-badge";
    badge.textContent = "▶ Video";
    container.appendChild(badge);
  }

  // Media element
  let media;
  if (isImage) {
    media = document.createElement("img");
    media.src = url;
    media.alt = "Our beautiful memory";
    media.loading = "lazy";
  } else {
    media = document.createElement("video");
    media.src = url;
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
  }

  // Lightbox click (only for images)
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

  // Save Button
  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save`;
  saveBtn.onclick = (e) => {
    e.stopPropagation();
    downloadMedia(url, id, type);
  };
  btnGroup.appendChild(saveBtn);

  // Delete Button (admin only)
  if (isAdmin) {
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg> Delete`;
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("এই স্মৃতিটি মুছে ফেলবেন? এটি ফিরিয়ে আনা যাবে না।")) return;
      const { error } = await db.from("memories").delete().eq("id", id);
      if (!error) {
        container.style.transition = "all 0.4s";
        container.style.opacity   = "0";
        container.style.transform = "scale(0.9)";
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
  if (images.length === 0) return;
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
  const images = getFilteredImages();
  lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
  renderLightboxSlide();
});
lbNext.addEventListener("click", () => {
  const images = getFilteredImages();
  lightboxIndex = (lightboxIndex + 1) % images.length;
  renderLightboxSlide();
});
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("active")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft")  lbPrev.click();
  if (e.key === "ArrowRight") lbNext.click();
});

// Touch swipe for lightbox
let lbTouchStartX = null;
lightbox.addEventListener("touchstart", e => { lbTouchStartX = e.touches[0].clientX; });
lightbox.addEventListener("touchend", e => {
  if (lbTouchStartX === null) return;
  const diff = lbTouchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) diff > 0 ? lbNext.click() : lbPrev.click();
  lbTouchStartX = null;
});

// ——— Upload Flow ———
async function handleUpload(files) {
  if (!files || files.length === 0) return;
  const fileArr = Array.from(files);

  progressWrap.style.display = "block";
  progressBar.style.width     = "0%";
  progressLabel.textContent   = `0 / ${fileArr.length} আপলোড হচ্ছে...`;

  let completed = 0;

  for (let file of fileArr) {
    // Validate file type
    if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
      showToast(`${file.name} সাপোর্টেড নয়`, "error");
      completed++;
      continue;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CONFIG.uploadPreset);

    try {
      showToast(`আপলোড হচ্ছে: ${file.name} 📤`, "info", 2000);

      const res        = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await res.json();

      if (!uploadData.secure_url) {
        showToast(`${file.name} আপলোড ব্যর্থ হয়েছে`, "error");
        completed++;
        continue;
      }

      // Save to Supabase
      const { data: inserted, error: insertError } = await db
        .from("memories")
        .insert([{ url: uploadData.secure_url, type: file.type }])
        .select();

      if (!insertError && inserted) {
        const newItem = inserted[0];
        allMemories.unshift(newItem);

        if (currentFilter === "all" ||
           (currentFilter === "image" && file.type.startsWith("image")) ||
           (currentFilter === "video" && file.type.startsWith("video"))) {
          filtered.unshift(newItem);
          emptyState.style.display = "none";
          displayMedia(newItem.url, newItem.type, newItem.id, 0);
          // Prepend: move last appended to front
          const cards = gallery.querySelectorAll(".media-container");
          if (cards.length > 0) gallery.prepend(cards[cards.length - 1]);
        }

        updateStats();
        showToast("স্মৃতি যোগ হয়েছে! ❤️", "success");
      } else {
        showToast("ডেটাবেস সংরক্ষণে সমস্যা", "error");
      }
    } catch (err) {
      showToast(`নেটওয়ার্ক সমস্যা: ${file.name}`, "error");
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
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", (e) => {
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

// ——— Admin Mode ———
if (isAdmin) {
  adminBadge.style.display = "flex";
  document.title = "👑 Admin — আমাদের গল্প";
  showToast("Admin mode চালু আছে 👑", "info", 4000);
}

// ——— Boot ———
loadMemories();