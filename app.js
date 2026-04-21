/* ─── EverythingszDash — app.js ──────────────────────────────────────── */

// Render (and similar hosts) may start this repo with `node app.js`.
// This file is primarily browser code, so when we're in Node we start a tiny
// static server and avoid touching any DOM globals.
const __EVD_IS_NODE__ = typeof window === 'undefined' || typeof document === 'undefined';

if (__EVD_IS_NODE__) {
  const http = require('node:http');
  const fs = require('node:fs');
  const path = require('node:path');
  const { URL } = require('node:url');

  const ROOT_DIR = __dirname;
  const PORT = Number.parseInt(process.env.PORT || '3000', 10);

  const MIME_BY_EXT = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'application/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.svg', 'image/svg+xml'],
    ['.ico', 'image/x-icon'],
    ['.txt', 'text/plain; charset=utf-8'],
    ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ]);

  function safeResolve(urlPathname) {
    const decodedPath = decodeURIComponent(urlPathname);
    const withoutNulls = decodedPath.replaceAll('\0', '');
    const normalized = path.posix.normalize(withoutNulls);

    // Remove leading slash so it stays relative to ROOT_DIR.
    const relative = normalized.replace(/^\/+/, '');

    // Prevent path traversal.
    if (relative.startsWith('..') || relative.includes('/../')) return null;
    return path.join(ROOT_DIR, relative);
  }

  function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXT.get(ext) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  }

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const resolvedPath = safeResolve(requestUrl.pathname);

    if (!resolvedPath) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    let filePath = resolvedPath;
    if (requestUrl.pathname === '/' || requestUrl.pathname === '') {
      filePath = path.join(ROOT_DIR, 'index.html');
    }

    // If it exists and is a directory, try an index.html.
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch {
      // ignore; handled below
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.statusCode = 200;
      sendFile(res, filePath);
      return;
    }

    // SPA-ish fallback: if the path doesn't look like a file, serve index.html.
    if (!path.extname(requestUrl.pathname)) {
      const indexPath = path.join(ROOT_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.statusCode = 200;
        sendFile(res, indexPath);
        return;
      }
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`EverythingszDash listening on port ${PORT}`);
  });
} else {

// ── Accent palette ──────────────────────────────────────────────────────
const ACCENTS = [
  { id: 'purple',  value: 'linear-gradient(135deg,#7c6ffb,#a855f7)' },
  { id: 'pink',    value: 'linear-gradient(135deg,#f472b6,#ec4899)' },
  { id: 'green',   value: 'linear-gradient(135deg,#34d399,#059669)' },
  { id: 'orange',  value: 'linear-gradient(135deg,#fb923c,#f97316)' },
  { id: 'sky',     value: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' },
  { id: 'violet',  value: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
  { id: 'yellow',  value: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
];

// ── State ────────────────────────────────────────────────────────────────
let bookmarks    = loadData('evd_bookmarks', []);
let folders      = loadData('evd_folders', []);
let activeFolderId = 'all';
let searchQuery  = '';

// Modal State
let editingId      = null; // bookmark ID
let selectedAccent = ACCENTS[0].id;
let selectedFolderForBookmark = null;

// Context Menu State
let ctxFolderId = null;
let ctxCardId   = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const grid           = document.getElementById('bookmarkGrid');
const emptyState     = document.getElementById('emptyState');
const searchInput    = document.getElementById('searchInput');

// View + font controls
const viewGridBtn    = document.getElementById('viewGridBtn');
const viewIconsBtn   = document.getElementById('viewIconsBtn');
const viewListBtn    = document.getElementById('viewListBtn');
const fontDecBtn     = document.getElementById('fontDecBtn');
const fontIncBtn     = document.getElementById('fontIncBtn');

// Add site modal
const openModalBtn   = document.getElementById('openModalBtn');
const openModalBtnEmpty = document.getElementById('openModalBtnEmpty');
const modalOverlay   = document.getElementById('modalOverlay');
const closeModalBtn  = document.getElementById('closeModalBtn');
const cancelBtn      = document.getElementById('cancelBtn');
const saveBtn        = document.getElementById('saveBtn');
const modalTitle     = document.getElementById('modalTitle');
const siteUrl        = document.getElementById('siteUrl');
const siteName       = document.getElementById('siteName');
const siteDesc       = document.getElementById('siteDesc');
const folderPicker   = document.getElementById('folderPicker');
const urlHint        = document.getElementById('urlHint');
const colorSwatches  = document.getElementById('colorSwatches');

// Folder UI
const folderBar      = document.getElementById('folderBar');
const newFolderWrap  = document.getElementById('newFolderWrap');
const newFolderBtn   = document.getElementById('newFolderBtn');
const newFolderForm  = document.getElementById('newFolderForm');
const nfEmoji        = document.getElementById('newFolderEmoji');
const nfName         = document.getElementById('newFolderName');
const nfOk           = document.getElementById('newFolderOk');
const nfCancel       = document.getElementById('newFolderCancel');

// Context menus
const folderCtxMenu  = document.getElementById('folderCtxMenu');
const fcRename       = document.getElementById('fcRename');
const fcDelete       = document.getElementById('fcDelete');

const cardCtxMenu    = document.getElementById('cardCtxMenu');
const ccEdit         = document.getElementById('ccEdit');
const ccDelete       = document.getElementById('ccDelete');

// Rename Modal
const renameOverlay  = document.getElementById('renameFolderOverlay');
const closeRenameBtn = document.getElementById('closeRenameFolderBtn');
const cancelRenameBtn= document.getElementById('cancelRenameFolderBtn');
const saveRenameBtn  = document.getElementById('saveRenameFolderBtn');
const rnEmoji        = document.getElementById('renameFolderEmoji');
const rnName         = document.getElementById('renameFolderName');

const toast          = document.getElementById('toast');
const clockTime      = document.getElementById('clockTime');
const clockDate      = document.getElementById('clockDate');
const greeting       = document.getElementById('greeting');


// ── Init ──────────────────────────────────────────────────────────────────
initViewAndFont();
buildSwatches();
updateGreeting();
tickClock();
setInterval(tickClock, 1000);

// Migrate old data if necessary
bookmarks = bookmarks.map(b => {
  if (b.category && !b.folderId) {
    b.folderId = null;
    delete b.category;
  }
  return b;
});
saveData('evd_bookmarks', bookmarks);

renderFolders();
render();

function initViewAndFont() {
  const VIEW_KEY = 'evd_view';
  const FONT_KEY = 'evd_font_px';
  const fontSizes = [12, 13, 14, 15, 16];

  let viewMode = loadData(VIEW_KEY, 'grid');
  if (!['grid', 'icons', 'list'].includes(viewMode)) viewMode = 'grid';

  let fontPx = loadData(FONT_KEY, 14);
  if (typeof fontPx !== 'number' || Number.isNaN(fontPx) || !fontSizes.includes(fontPx)) fontPx = 14;

  const applyFont = (px) => {
    document.documentElement.style.setProperty('--base-font-size', `${px}px`);
    saveData(FONT_KEY, px);
  };

  const applyView = (mode) => {
    document.body.dataset.view = mode;
    saveData(VIEW_KEY, mode);

    if (viewGridBtn) viewGridBtn.classList.toggle('active', mode === 'grid');
    if (viewIconsBtn) viewIconsBtn.classList.toggle('active', mode === 'icons');
    if (viewListBtn) viewListBtn.classList.toggle('active', mode === 'list');
  };

  applyFont(fontPx);
  applyView(viewMode);

  viewGridBtn?.addEventListener('click', () => applyView('grid'));
  viewIconsBtn?.addEventListener('click', () => applyView('icons'));
  viewListBtn?.addEventListener('click', () => applyView('list'));

  fontDecBtn?.addEventListener('click', () => {
    const idx = fontSizes.indexOf(fontPx);
    fontPx = fontSizes[Math.max(0, idx - 1)];
    applyFont(fontPx);
  });
  fontIncBtn?.addEventListener('click', () => {
    const idx = fontSizes.indexOf(fontPx);
    fontPx = fontSizes[Math.min(fontSizes.length - 1, idx + 1)];
    applyFont(fontPx);
  });
}

// ── Storage ───────────────────────────────────────────────────────────────
function loadData(key, defaultVal) {
  try { return JSON.parse(localStorage.getItem(key)) || defaultVal; }
  catch { return defaultVal; }
}
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Clock & Greeting ──────────────────────────────────────────────────────
function updateGreeting() {
  const h = new Date().getHours();
  greeting.textContent =
    h < 12 ? '☀️' :
    h < 17 ? '🌤️' :
    h < 20 ? '🌇' : '🌙';
}

function tickClock() {
  const now  = new Date();
  clockTime.textContent = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  clockDate.textContent = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

// ── Swatches ──────────────────────────────────────────────────────────────
function buildSwatches() {
  colorSwatches.innerHTML = '';
  ACCENTS.forEach(a => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch' + (a.id === selectedAccent ? ' selected' : '');
    btn.style.background = a.value;
    btn.dataset.id = a.id;
    btn.title = a.id;
    btn.addEventListener('click', () => {
      selectedAccent = a.id;
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
    });
    colorSwatches.appendChild(btn);
  });
}
function selectSwatch(id) {
  selectedAccent = id;
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.id === id);
  });
}

// ── Folders Rendering (Header) ────────────────────────────────────────────
function renderFolders() {
  // Clear all folder pills except 'All' and the new folder wrap
  const existingPills = folderBar.querySelectorAll('.folder-pill:not([data-id="all"])');
  existingPills.forEach(p => p.remove());

  // Update 'All' active state
  const allPill = folderBar.querySelector('.folder-pill[data-id="all"]');
  allPill.classList.toggle('active', activeFolderId === 'all');
  if(!allPill.onclick) allPill.onclick = () => { activeFolderId = 'all'; renderFolders(); render(); };

  // Generate custom folder pills
  folders.forEach(f => {
    const pill = document.createElement('button');
    pill.className = 'folder-pill' + (activeFolderId === f.id ? ' active' : '');
    pill.dataset.id = f.id;
    pill.innerHTML = `<span>${f.emoji}</span> ${escapeHTML(f.name)}`;
    
    // Left-click to filter
    pill.addEventListener('click', () => {
      activeFolderId = f.id;
      renderFolders();
      render();
    });

    // Right-click context menu
    pill.addEventListener('contextmenu', e => {
      e.preventDefault();
      showFolderContextMenu(e, f.id);
    });
    
    // Double-click fallback
    pill.addEventListener('dblclick', e => {
      e.preventDefault();
      showFolderContextMenu(e, f.id);
    });

    // Mobile long press fallback
    let pressTimer;
    pill.addEventListener('touchstart', e => {
      pressTimer = setTimeout(() => { showFolderContextMenu(e.touches[0], f.id); }, 600);
    });
    pill.addEventListener('touchend', () => clearTimeout(pressTimer));
    pill.addEventListener('touchmove', () => clearTimeout(pressTimer));

    folderBar.insertBefore(pill, newFolderWrap);
  });
}

// ── New Folder Inline Form ────────────────────────────────────────────────
newFolderBtn.onclick = () => {
  newFolderBtn.style.display = 'none';
  newFolderForm.style.display = 'flex';
  nfName.focus();
};

function closeNewFolderForm() {
  newFolderForm.style.display = 'none';
  newFolderBtn.style.display = 'flex';
  nfEmoji.value = '';
  nfName.value = '';
}

nfCancel.onclick = closeNewFolderForm;

nfName.addEventListener('keydown', e => { if (e.key === 'Enter') nfOk.click(); else if (e.key === 'Escape') closeNewFolderForm(); });
nfEmoji.addEventListener('keydown', e => { if (e.key === 'Enter') nfOk.click(); else if (e.key === 'Escape') closeNewFolderForm(); });

nfOk.onclick = () => {
  const name = nfName.value.trim();
  let emoji = nfEmoji.value.trim() || '📁';
  if (!name) return;

  const newFolder = {
    id: 'f_' + crypto.randomUUID(),
    name,
    emoji,
    createdAt: Date.now()
  };
  
  folders.push(newFolder);
  saveData('evd_folders', folders);
  showToast(`📁 Folder "${name}" created`);
  closeNewFolderForm();
  renderFolders();
  render();
};

// ── Context Menus ─────────────────────────────────────────────────────────
function hideMenus() {
  folderCtxMenu.classList.remove('show');
  cardCtxMenu.classList.remove('show');
  ctxFolderId = null;
  ctxCardId = null;
}

document.addEventListener('click', e => {
  if (!folderCtxMenu.contains(e.target)) folderCtxMenu.classList.remove('show');
  if (!cardCtxMenu.contains(e.target)) cardCtxMenu.classList.remove('show');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideMenus();
});

// Folder Context Menu
function showFolderContextMenu(e, id) {
  hideMenus();
  ctxFolderId = id;
  folderCtxMenu.classList.add('show');
  folderCtxMenu.style.left = Math.min(e.clientX, window.innerWidth - 150) + 'px';
  folderCtxMenu.style.top = Math.min(e.clientY, window.innerHeight - 100) + 'px';
}

fcDelete.onclick = () => {
  if (!ctxFolderId) return;
  const f = folders.find(x => x.id === ctxFolderId);
  if(confirm(`Delete folder "${f.name}"? Bookmarks inside will NOT be deleted, they will just lose their folder assignment.`)) {
    folders = folders.filter(x => x.id !== ctxFolderId);
    bookmarks.forEach(b => { if(b.folderId === ctxFolderId) b.folderId = null; });
    saveData('evd_folders', folders);
    saveData('evd_bookmarks', bookmarks);
    if (activeFolderId === ctxFolderId) activeFolderId = 'all';
    showToast(`🗑️ Folder removed`);
    renderFolders();
    render();
  }
  hideMenus();
};

fcRename.onclick = () => {
  if (!ctxFolderId) return;
  const f = folders.find(x => x.id === ctxFolderId);
  if (!f) return;
  rnEmoji.value = f.emoji;
  rnName.value = f.name;
  renameOverlay.classList.add('show');
  rnName.focus();
  hideMenus();
};

closeRenameBtn.onclick = cancelRenameBtn.onclick = () => renameOverlay.classList.remove('show');

saveRenameBtn.onclick = () => {
  const name = rnName.value.trim();
  const emoji = rnEmoji.value.trim() || '📁';
  if(!name || !ctxFolderId) return;
  
  const f = folders.find(x => x.id === ctxFolderId);
  if (f) {
    f.name = name;
    f.emoji = emoji;
    saveData('evd_folders', folders);
    showToast(`✏️ Folder updated`);
    renderFolders();
    if(activeFolderId === ctxFolderId) render();
  }
  renameOverlay.classList.remove('show');
};

rnName.addEventListener('keydown', e => { if (e.key === 'Enter') saveRenameBtn.click(); });


// Card Context Menu
function showCardContextMenu(e, id) {
  hideMenus();
  ctxCardId = id;
  cardCtxMenu.classList.add('show');
  cardCtxMenu.style.left = Math.min(e.clientX, window.innerWidth - 150) + 'px';
  cardCtxMenu.style.top = Math.min(e.clientY, window.innerHeight - 100) + 'px';
}

ccEdit.onclick = () => {
  if (ctxCardId) openEditModal(ctxCardId);
  hideMenus();
};

ccDelete.onclick = () => {
  if (!ctxCardId) return;
  const bm = bookmarks.find(b => b.id === ctxCardId);
  bookmarks = bookmarks.filter(b => b.id !== ctxCardId);
  saveData('evd_bookmarks', bookmarks);
  showToast(`🗑️ "${bm?.name}" removed`);
  render();
  hideMenus();
};

// ── Rendering Bookmarks ───────────────────────────────────────────────────
function render() {
  let items = bookmarks;

  if (activeFolderId !== 'all') {
    items = items.filter(b => b.folderId === activeFolderId);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      (b.desc || '').toLowerCase().includes(q)
    );
  }

  grid.innerHTML = '';
  
  const emptyTitle = document.getElementById('emptyTitle');
  const emptySubtitle = document.getElementById('emptySubtitle');

  if (items.length === 0) {
    emptyState.style.display = 'flex';
    if(searchQuery) {
      emptyTitle.textContent = "No matches found";
      emptySubtitle.textContent = `Nothing matches "${searchQuery}".`;
    } else if (activeFolderId !== 'all') {
      const f = folders.find(x => x.id === activeFolderId);
      emptyTitle.textContent = f ? `Folder ${f.emoji} ${f.name} is empty` : 'Empty Folder';
      emptySubtitle.innerHTML = 'Click <strong>Add Site</strong> to add bookmarks to this folder.';
    } else {
      emptyTitle.textContent = "No bookmarks yet";
      emptySubtitle.innerHTML = 'Click <strong>Add Site</strong> to add your first bookmark and start building your dashboard.';
    }
  } else {
    emptyState.style.display = 'none';
    items.forEach((bm, i) => {
      grid.appendChild(buildCard(bm, i));
    });
  }
}

function buildCard(bm, index) {
  const accentObj = ACCENTS.find(a => a.id === bm.accent) || ACCENTS[0];
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = bm.id;
  card.style.animationDelay = `${index * 0.04}s`;

  card.innerHTML = `
    <div class="card-accent-bar" style="background: ${accentObj.value}"></div>
    <button class="card-more-btn" title="Options">⋯</button>
    <div class="card-header">
      ${getFaviconImgOrFallback(bm.url, bm.name, accentObj.value)}
      <div class="card-name">${escapeHTML(bm.name)}</div>
    </div>
    ${bm.desc ? `<div class="card-desc">${escapeHTML(bm.desc)}</div>` : ''}
    <div class="card-footer">
      <div class="card-url">${getDomain(bm.url)}</div>
      <div class="card-arrow">↗</div>
    </div>
  `;

  // Attach events
  card.querySelector('.card-more-btn').addEventListener('click', e => {
    e.stopPropagation();
    showCardContextMenu(e, bm.id);
  });

  card.addEventListener('click', () => window.open(bm.url, '_blank', 'noopener,noreferrer'));
  card.addEventListener('contextmenu', e => {
    e.preventDefault();
    showCardContextMenu(e, bm.id);
  });

  return card;
}

// ── Bookmark Modal ────────────────────────────────────────────────────────
function buildFolderPickerOptions() {
  folderPicker.innerHTML = '';
  if (folders.length === 0) return;

  const noneOpt = document.createElement('div');
  noneOpt.className = 'folder-option' + (!selectedFolderForBookmark ? ' selected' : '');
  noneOpt.textContent = 'None';
  noneOpt.onclick = () => {
    selectedFolderForBookmark = null;
    buildFolderPickerOptions();
  };
  folderPicker.appendChild(noneOpt);

  folders.forEach(f => {
    const opt = document.createElement('div');
    opt.className = 'folder-option' + (selectedFolderForBookmark === f.id ? ' selected' : '');
    opt.innerHTML = `<span>${f.emoji}</span> ${escapeHTML(f.name)}`;
    opt.onclick = () => {
      selectedFolderForBookmark = f.id;
      buildFolderPickerOptions();
    };
    folderPicker.appendChild(opt);
  });
}

function openAddModal() {
  editingId = null;
  modalTitle.textContent = 'Add Bookmark';
  saveBtn.textContent = 'Save Bookmark';
  siteUrl.value  = '';
  siteName.value = '';
  siteDesc.value = '';
  selectedFolderForBookmark = null; // Always default to "None" (which puts it in All)
  
  urlHint.textContent = '';
  siteUrl.classList.remove('error');
  
  selectSwatch(ACCENTS[0].id);
  buildFolderPickerOptions();
  showModal();
  setTimeout(() => siteUrl.focus(), 250);
}

function openEditModal(id) {
  const bm = bookmarks.find(b => b.id === id);
  if (!bm) return;
  editingId = id;
  modalTitle.textContent = 'Edit Bookmark';
  saveBtn.textContent = 'Update Bookmark';
  siteUrl.value  = bm.url;
  siteName.value = bm.name;
  siteDesc.value = bm.desc || '';
  selectedFolderForBookmark = bm.folderId || null;
  
  urlHint.textContent = '';
  siteUrl.classList.remove('error');
  
  selectSwatch(bm.accent || ACCENTS[0].id);
  buildFolderPickerOptions();
  showModal();
  setTimeout(() => siteName.focus(), 250);
}

function showModal() {
  modalOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('show');
  document.body.style.overflow = '';
  editingId = null;
}

openModalBtn.onclick = openAddModal;
openModalBtnEmpty.onclick = openAddModal;
closeModalBtn.onclick = closeModal;
cancelBtn.onclick = closeModal;
modalOverlay.onmousedown = e => { if (e.target === modalOverlay) closeModal(); };

// Auto-fill name
siteUrl.addEventListener('blur', () => {
  const raw = siteUrl.value.trim();
  if (!raw) return;
  const url = normalizeUrl(raw);
  if (isValidUrl(url) && !siteName.value.trim()) {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      const parts  = domain.split('.');
      siteName.value = capitalize(parts[0]);
    } catch {}
  }
  urlHint.textContent = '';
  siteUrl.classList.remove('error');
});

// Save bookmark
saveBtn.addEventListener('click', () => {
  const rawUrl = siteUrl.value.trim();
  const name   = siteName.value.trim();

  if (!rawUrl) {
    siteUrl.classList.add('error');
    urlHint.textContent = '⚠ Please enter a URL.';
    siteUrl.focus();
    return;
  }

  const url = normalizeUrl(rawUrl);
  if (!isValidUrl(url)) {
    siteUrl.classList.add('error');
    urlHint.textContent = '⚠ Not a valid URL. Try https://example.com';
    siteUrl.focus();
    return;
  }

  const finalName = name || capitalize(getDomain(url).replace(/^www\./, '').split('.')[0]) || url;

  if (editingId) {
    // Update
    const idx = bookmarks.findIndex(b => b.id === editingId);
    if (idx !== -1) {
      bookmarks[idx] = {
        ...bookmarks[idx],
        url,
        name: finalName,
        desc: siteDesc.value.trim(),
        folderId: selectedFolderForBookmark,
        accent: selectedAccent,
        updatedAt: Date.now(),
      };
    }
    showToast(`✅ "${finalName}" updated`);
  } else {
    // Add
    const bm = {
      id:        'b_' + crypto.randomUUID(),
      url,
      name:      finalName,
      desc:      siteDesc.value.trim(),
      folderId:  selectedFolderForBookmark,
      accent:    selectedAccent,
      createdAt: Date.now(),
    };
    bookmarks.unshift(bm);
    showToast(`✨ "${finalName}" added!`);
  }

  saveData('evd_bookmarks', bookmarks);
  closeModal();
  render();
});

[siteUrl, siteName, siteDesc].forEach(inp => {
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
});

// ── Search ────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  render();
});

// ── Auto Favicon & Utils ──────────────────────────────────────────────────
function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function getFaviconImgOrFallback(url, name, gradient) {
  const domain = getDomain(url);
  if (!domain) {
    return `<div class="card-favicon-fallback" style="background: ${gradient}">${escapeHTML(name.charAt(0).toUpperCase())}</div>`;
  }
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  return `<img class="card-favicon" src="${faviconUrl}" alt="${escapeHTML(name)}" 
    onerror="this.outerHTML='<div class=&quot;card-favicon-fallback&quot; style=&quot;background: ${gradient}&quot;>${escapeHTML(name.charAt(0).toUpperCase())}</div>'">`;
}

function normalizeUrl(raw) {
  if (!raw) return raw;
  if (!/^https?:\/\//i.test(raw)) return 'https://' + raw;
  return raw;
}
function isValidUrl(str) {
  try { return Boolean(new URL(str)); } catch { return false; }
}
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ── Shortcuts ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    if (!modalOverlay.classList.contains('show')) openAddModal();
  }
});

let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── PWA & Share Target Integration ────────────────────────────────────────
// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

// Parse Share Target parameters
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Did Android share a link to us?
  if (urlParams.get('share_target') || urlParams.get('url') || urlParams.get('title') || urlParams.get('text')) {
    
    // Sometimes apps put the URL in 'text', sometimes in 'url'
    let sharedUrl = urlParams.get('url') || '';
    let sharedTitle = urlParams.get('title') || '';
    let sharedText = urlParams.get('text') || '';

    // If 'url' is empty but 'text' has a URL, extract it
    if (!sharedUrl && sharedText) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = sharedText.match(urlRegex);
      if (matches && matches.length > 0) {
        sharedUrl = matches[0];
      }
    }
    
    // If we have a URL, open the pre-filled modal!
    if (sharedUrl) {
      openAddModal();
      siteUrl.value = sharedUrl;
      if (sharedTitle) siteName.value = sharedTitle;
      
      // Clean up the address bar so refreshing doesn't trigger this again
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('📥 Link received! Review and click Save.');
    }
  }
});

}
