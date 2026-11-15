/**
 * SnapLink URL Shortener Frontend Application Logic
 */

// State
let allUrlsCache = [];
let topUrlsCache = [];
let currentSearchTerm = '';
let activeQrInstance = null;
let codePendingDelete = null;
let codePendingEdit = null;

// DOM Elements
const shortenForm = document.getElementById('shorten-form');
const urlInput = document.getElementById('url-input');
const clearUrlBtn = document.getElementById('clear-url-btn');
const pasteUrlBtn = document.getElementById('paste-url-btn');
const toggleAliasBtn = document.getElementById('toggle-alias-btn');
const aliasDrawer = document.getElementById('alias-drawer');
const aliasChevron = document.getElementById('alias-chevron');
const customCodeInput = document.getElementById('custom-code-input');
const shortenSubmitBtn = document.getElementById('shorten-submit-btn');
const shortenErrorBox = document.getElementById('shorten-error-box');
const shortenErrorText = document.getElementById('shorten-error-text');

// Success Card
const shortenSuccessCard = document.getElementById('shorten-success-card');
const successShortLink = document.getElementById('success-short-link');
const successDestLink = document.getElementById('success-dest-link');
const successCopyBtn = document.getElementById('success-copy-btn');
const successCopyText = document.getElementById('success-copy-text');
const successQrBtn = document.getElementById('success-qr-btn');
const successVisitLink = document.getElementById('success-visit-link');

// Metrics Elements
const statTotalLinks = document.getElementById('stat-total-links');
const statTotalClicks = document.getElementById('stat-total-clicks');
const statTopLink = document.getElementById('stat-top-link');
const statAvgClicks = document.getElementById('stat-avg-clicks');
const topLinksContainer = document.getElementById('top-links-container');

// Table & Search
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const linksCountBadge = document.getElementById('links-count-badge');
const linksTableBody = document.getElementById('links-table-body');
const emptyState = document.getElementById('empty-state');
const emptyStateSubtitle = document.getElementById('empty-state-subtitle');

// Modals
const qrModal = document.getElementById('qr-modal');
const modalQrcodeContainer = document.getElementById('modal-qrcode-container');
const modalQrCodeText = document.getElementById('modal-qr-code-text');
const modalQrDestText = document.getElementById('modal-qr-dest-text');
const modalQrDownloadBtn = document.getElementById('modal-qr-download-btn');
const modalQrCopyBtn = document.getElementById('modal-qr-copy-btn');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editModalCode = document.getElementById('edit-modal-code');
const editUrlInput = document.getElementById('edit-url-input');
const editErrorBox = document.getElementById('edit-error-box');
const editSaveBtn = document.getElementById('edit-save-btn');

const deleteModal = document.getElementById('delete-modal');
const deleteModalCode = document.getElementById('delete-modal-code');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const statsModal = document.getElementById('stats-modal');
const statsModalShort = document.getElementById('stats-modal-short');
const statsModalDest = document.getElementById('stats-modal-dest');
const statsModalClicks = document.getElementById('stats-modal-clicks');
const statsModalCreated = document.getElementById('stats-modal-created');

const toastContainer = document.getElementById('toast-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  loadDashboardData();
  refreshIcons();
});

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   THEME TOGGLING (Dark / Light)
   ========================================================================== */

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (savedTheme === 'dark' || prefersDark) {
    document.documentElement.classList.add('dark');
  }
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  refreshIcons();
});

/* ==========================================================================
   DATA FETCHING & REFRESH
   ========================================================================== */

async function loadDashboardData() {
  await Promise.all([fetchLinks(currentSearchTerm), fetchTopUrls()]);
}

async function fetchLinks(search = '') {
  try {
    const url = search ? `/urls?search=${encodeURIComponent(search)}` : '/urls';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load links');
    const data = await res.json();
    
    allUrlsCache = data;
    renderLinksTable(data);
    updateMetrics(data);
  } catch (err) {
    console.error('Error fetching links:', err);
    showToast('Failed to load short links', 'error');
  }
}

async function fetchTopUrls() {
  try {
    const res = await fetch('/top?limit=5');
    if (!res.ok) throw new Error('Failed to load top URLs');
    const data = await res.json();
    topUrlsCache = data;
    renderTopLinks(data);
  } catch (err) {
    console.error('Error fetching top URLs:', err);
  }
}

/* ==========================================================================
   METRICS & LEADERBOARD RENDERING
   ========================================================================== */

function updateMetrics(links) {
  const totalCount = links.length;
  statTotalLinks.textContent = totalCount.toLocaleString();
  linksCountBadge.textContent = totalCount.toLocaleString();

  const totalClicks = links.reduce((sum, item) => sum + (item.clicks || 0), 0);
  statTotalClicks.textContent = totalClicks.toLocaleString();

  const avgClicks = totalCount > 0 ? (totalClicks / totalCount).toFixed(1) : '0';
  statAvgClicks.textContent = avgClicks;

  if (links.length > 0) {
    const sorted = [...links].sort((a, b) => b.clicks - a.clicks);
    if (sorted[0] && sorted[0].clicks > 0) {
      statTopLink.textContent = `${sorted[0].code} (${sorted[0].clicks} clicks)`;
      statTopLink.title = `${sorted[0].code} -> ${sorted[0].original_url}`;
    } else {
      statTopLink.textContent = 'None yet';
    }
  } else {
    statTopLink.textContent = '—';
  }
}

function renderTopLinks(topList) {
  if (!topList || topList.length === 0) {
    topLinksContainer.innerHTML = `
      <div class="text-center py-6 text-slate-400 text-xs">
        No clicked links yet. Shorten a link and share it to see it ranked here!
      </div>
    `;
    return;
  }

  const maxClicks = Math.max(...topList.map(u => u.clicks), 1);
  const medals = ['🥇', '🥈', '🥉', '4th', '5th'];

  topLinksContainer.innerHTML = topList.map((item, index) => {
    const percent = Math.min(100, Math.round((item.clicks / maxClicks) * 100));
    const fullShortUrl = `${window.location.origin}/${item.code}`;

    return `
      <div class="group relative flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60 transition gap-3">
        <!-- Progress bar background -->
        <div class="absolute inset-0 rounded-xl bg-brand-500/5 dark:bg-brand-500/10 pointer-events-none transition-all" style="width: ${percent}%;"></div>

        <div class="relative flex items-center gap-2.5 min-w-0">
          <span class="text-sm font-semibold w-6 text-center select-none flex-shrink-0">${medals[index] || index + 1}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer" onclick="testShortLink('${item.code}')">
                /${item.code}
              </span>
              <button onclick="copyToClipboard('${fullShortUrl}', 'Short link copied!')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Copy link">
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            </div>
            <p class="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md" title="${escapeHtml(item.original_url)}">
              ${escapeHtml(item.original_url)}
            </p>
          </div>
        </div>

        <div class="relative flex items-center gap-2 flex-shrink-0">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
            ${item.clicks.toLocaleString()} clicks
          </span>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

/* ==========================================================================
   TABLE RENDERING
   ========================================================================== */

function renderLinksTable(links) {
  if (!links || links.length === 0) {
    linksTableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    if (currentSearchTerm) {
      emptyStateSubtitle.textContent = `No links found matching "${currentSearchTerm}".`;
    } else {
      emptyStateSubtitle.textContent = 'There are no short links created yet. Create your first link above!';
    }
    refreshIcons();
    return;
  }

  emptyState.classList.add('hidden');

  linksTableBody.innerHTML = links.map(link => {
    const fullShortUrl = `${window.location.origin}/${link.code}`;
    const formattedDate = formatTimestamp(link.created_at);
    const domain = getDomain(link.original_url);

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group">
        
        <!-- Short link -->
        <td class="py-3 px-4 font-mono font-medium">
          <div class="flex items-center gap-1.5">
            <a href="${fullShortUrl}" target="_blank" class="text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1" title="Open short URL">
              /${link.code}
              <i data-lucide="external-link" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition"></i>
            </a>
            <button onclick="copyToClipboard('${fullShortUrl}', 'Short link copied!')" class="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition" title="Copy short link">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>

        <!-- Destination URL -->
        <td class="py-3 px-4 max-w-xs sm:max-w-md">
          <div class="flex items-center gap-2 truncate">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
              ${escapeHtml(domain)}
            </span>
            <a href="${escapeHtml(link.original_url)}" target="_blank" rel="noopener noreferrer" class="truncate text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition" title="${escapeHtml(link.original_url)}">
              ${escapeHtml(link.original_url)}
            </a>
          </div>
        </td>

        <!-- Clicks count -->
        <td class="py-3 px-4 text-center">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            link.clicks > 0 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }">
            <i data-lucide="mouse-pointer" class="w-3 h-3"></i>
            ${link.clicks.toLocaleString()}
          </span>
        </td>

        <!-- Created At -->
        <td class="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap" title="${link.created_at || ''}">
          ${formattedDate}
        </td>

        <!-- Actions -->
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1">
            <!-- Test link -->
            <button onclick="testShortLink('${link.code}')" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition" title="Test Link (Triggers +1 click)">
              <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
            </button>
            <!-- QR code -->
            <button onclick="openQrModal('${link.code}', '${escapeHtml(link.original_url)}')" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition" title="QR Code">
              <i data-lucide="qr-code" class="w-4 h-4"></i>
            </button>
            <!-- Stats -->
            <button onclick="openStatsModal('${link.code}')" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition" title="Inspect Stats">
              <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
            </button>
            <!-- Edit -->
            <button onclick="openEditModal('${link.code}', '${escapeHtml(link.original_url)}')" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition" title="Edit Destination">
              <i data-lucide="edit" class="w-4 h-4"></i>
            </button>
            <!-- Delete -->
            <button onclick="openDeleteModal('${link.code}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Delete Link">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>

      </tr>
    `;
  }).join('');

  refreshIcons();
}

/* ==========================================================================
   SHORTEN FORM SUBMISSION
   ========================================================================== */

shortenForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  let originalUrl = urlInput.value.trim();
  if (!originalUrl) return;

  // Auto-prepend https:// if protocol missing
  if (!/^https?:\/\//i.test(originalUrl)) {
    originalUrl = 'https://' + originalUrl;
  }

  const customCode = customCodeInput.value.trim() || null;

  // UI loading state
  shortenSubmitBtn.disabled = true;
  shortenSubmitBtn.classList.add('opacity-75');
  const originalBtnContent = shortenSubmitBtn.innerHTML;
  shortenSubmitBtn.innerHTML = `
    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    <span>Creating link...</span>
  `;

  try {
    const res = await fetch('/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: originalUrl,
        custom_code: customCode
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.detail || 'Failed to shorten URL';
      showError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }

    // Success!
    const fullShortUrl = `${window.location.origin}/${data.code}`;
    
    // Update success card
    successShortLink.href = fullShortUrl;
    successShortLink.textContent = fullShortUrl;
    successDestLink.textContent = originalUrl;
    successVisitLink.href = fullShortUrl;
    
    successQrBtn.onclick = () => openQrModal(data.code, originalUrl);
    successCopyBtn.onclick = () => copyToClipboard(fullShortUrl, 'Link copied to clipboard!');

    shortenSuccessCard.classList.remove('hidden');

    // Confetti effect
    if (window.confetti) {
      window.confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    showToast('Short URL generated successfully!', 'success');

    // Reset input
    urlInput.value = '';
    customCodeInput.value = '';
    clearUrlBtn.classList.add('hidden');

    // Refresh Dashboard Data
    await loadDashboardData();

  } catch (err) {
    console.error('Shorten error:', err);
    showError('An unexpected network error occurred');
    showToast('Network error while creating link', 'error');
  } finally {
    shortenSubmitBtn.disabled = false;
    shortenSubmitBtn.classList.remove('opacity-75');
    shortenSubmitBtn.innerHTML = originalBtnContent;
    refreshIcons();
  }
});

function showError(msg) {
  shortenErrorText.textContent = msg;
  shortenErrorBox.classList.remove('hidden');
}

function hideError() {
  shortenErrorBox.classList.add('hidden');
}

/* ==========================================================================
   INPUT UTILITIES (Clear, Paste, Alias Toggle)
   ========================================================================== */

urlInput.addEventListener('input', () => {
  if (urlInput.value.trim()) {
    clearUrlBtn.classList.remove('hidden');
  } else {
    clearUrlBtn.classList.add('hidden');
  }
});

clearUrlBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearUrlBtn.classList.add('hidden');
  urlInput.focus();
});

pasteUrlBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text.trim();
      clearUrlBtn.classList.remove('hidden');
      urlInput.focus();
      showToast('Pasted from clipboard', 'info');
    }
  } catch (err) {
    showToast('Clipboard access was blocked by browser', 'error');
  }
});

toggleAliasBtn.addEventListener('click', () => {
  const isHidden = aliasDrawer.classList.contains('hidden');
  if (isHidden) {
    aliasDrawer.classList.remove('hidden');
    aliasChevron.classList.add('rotate-90');
    customCodeInput.focus();
  } else {
    aliasDrawer.classList.add('hidden');
    aliasChevron.classList.remove('rotate-90');
  }
});

/* ==========================================================================
   SEARCH & FILTER
   ========================================================================== */

let debounceTimer = null;
searchInput.addEventListener('input', (e) => {
  const value = e.target.value.trim();
  currentSearchTerm = value;

  if (value) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchLinks(currentSearchTerm);
  }, 250);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  currentSearchTerm = '';
  clearSearchBtn.classList.add('hidden');
  fetchLinks('');
});

refreshBtn.addEventListener('click', async () => {
  refreshIcon.classList.add('animate-spin');
  await loadDashboardData();
  setTimeout(() => {
    refreshIcon.classList.remove('animate-spin');
    showToast('Links refreshed', 'info');
  }, 400);
});

/* ==========================================================================
   MODAL CONTROLS & ACTIONS
   ========================================================================== */

function setupEventListeners() {
  // Close modals on X or Cancel click
  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Close modals on background click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Close modal on Escape key & search shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement !== urlInput && document.activeElement !== customCodeInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

function openModal(modal) {
  closeAllModals();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

/* --- QR Code Modal --- */
function openQrModal(code, destinationUrl) {
  const fullShortUrl = `${window.location.origin}/${code}`;
  
  modalQrCodeText.textContent = fullShortUrl;
  modalQrDestText.textContent = destinationUrl;

  modalQrcodeContainer.innerHTML = '';
  
  // Generate QR code
  if (window.QRCode) {
    activeQrInstance = new QRCode(modalQrcodeContainer, {
      text: fullShortUrl,
      width: 180,
      height: 180,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  modalQrDownloadBtn.onclick = () => downloadQrCode(code);
  modalQrCopyBtn.onclick = () => copyToClipboard(fullShortUrl, 'Short link copied!');

  openModal(qrModal);
  refreshIcons();
}

function downloadQrCode(code) {
  const img = modalQrcodeContainer.querySelector('img');
  if (img && img.src) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `snaplink-qr-${code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR Code downloaded', 'success');
  } else {
    showToast('Failed to download QR image', 'error');
  }
}

/* --- Edit Destination Modal --- */
function openEditModal(code, currentDest) {
  codePendingEdit = code;
  editModalCode.textContent = `${window.location.origin}/${code}`;
  editUrlInput.value = currentDest;
  editErrorBox.classList.add('hidden');
  
  openModal(editModal);
  editUrlInput.focus();
  refreshIcons();
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!codePendingEdit) return;

  let newUrl = editUrlInput.value.trim();
  if (!/^https?:\/\//i.test(newUrl)) {
    newUrl = 'https://' + newUrl;
  }

  editSaveBtn.disabled = true;
  editSaveBtn.textContent = 'Saving...';

  try {
    const res = await fetch(`/urls/${encodeURIComponent(codePendingEdit)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl })
    });

    const data = await res.json();
    if (!res.ok) {
      editErrorBox.textContent = data.detail || 'Failed to update URL';
      editErrorBox.classList.remove('hidden');
      return;
    }

    closeAllModals();
    showToast(`Updated destination for /${codePendingEdit}`, 'success');
    await loadDashboardData();
  } catch (err) {
    editErrorBox.textContent = 'An error occurred while updating destination';
    editErrorBox.classList.remove('hidden');
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = 'Save Changes';
  }
});

/* --- Delete Confirmation Modal --- */
function openDeleteModal(code) {
  codePendingDelete = code;
  deleteModalCode.textContent = `/${code}`;
  openModal(deleteModal);
  refreshIcons();
}

confirmDeleteBtn.addEventListener('click', async () => {
  if (!codePendingDelete) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`/urls/${encodeURIComponent(codePendingDelete)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || 'Failed to delete URL');
    }

    closeAllModals();
    showToast(`Deleted /${codePendingDelete}`, 'success');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete Link';
    codePendingDelete = null;
  }
});

/* --- Stats Modal --- */
async function openStatsModal(code) {
  try {
    const res = await fetch(`/stats/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('Short code not found');
    const data = await res.json();

    const fullShortUrl = `${window.location.origin}/${data.code}`;
    statsModalShort.href = fullShortUrl;
    statsModalShort.textContent = fullShortUrl;
    
    statsModalDest.href = data.original_url;
    statsModalDest.textContent = data.original_url;

    statsModalClicks.textContent = (data.clicks || 0).toLocaleString();
    statsModalCreated.textContent = data.created_at || 'Just now';

    openModal(statsModal);
    refreshIcons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   HELPERS & UTILITIES
   ========================================================================== */

function testShortLink(code) {
  const url = `${window.location.origin}/${code}`;
  window.open(url, '_blank');
  // Refresh data after brief delay to show incremented click count
  setTimeout(() => loadDashboardData(), 800);
}

function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(successMsg, 'success');
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
  document.body.removeChild(textArea);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-enter pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-medium border ${
    type === 'success' 
      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
      : type === 'error'
      ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
      : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-700'
  }`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
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

function getDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

function formatTimestamp(ts) {
  if (!ts) return 'Recent';
  try {
    const date = new Date(ts.replace(' ', 'T') + 'Z');
    if (isNaN(date.getTime())) return ts;

    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return ts;
  }
}
