const navGroup = document.getElementById('navGroup');
const searchInput = document.getElementById('searchInput');
const itemsGrid = document.getElementById('itemsGrid');
const pinnedGrid = document.getElementById('pinnedGrid');
const pinnedSection = document.getElementById('pinnedSection');
const sectionTitle = document.getElementById('sectionTitle');
const emptyState = document.getElementById('emptyState');
const content = document.getElementById('content');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');

const detailPanel = document.getElementById('detailPanel');
const detailBack = document.getElementById('detailBack');
const detailClose = document.getElementById('detailClose');
const detailTypeChip = document.getElementById('detailTypeChip');
const detailMeta = document.getElementById('detailMeta');
const detailBody = document.getElementById('detailBody');
const detailCount = document.getElementById('detailCount');
const detailCopy = document.getElementById('detailCopy');
const detailPaste = document.getElementById('detailPaste');
const detailPin = document.getElementById('detailPin');
const detailTrash = document.getElementById('detailTrash');

let currentType = 'all';
let currentSearch = '';
let allActiveItems = [];
let selectedItem = null;

const ICONS = { text: '📝', link: '🔗', image: '🖼️', code: '💻', file: '📄', snippet: '⭐' };

function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function cardIcon(item) {
  if (item.type === 'image') return `<div class="card-icon type-image"><img src="${item.content}" /></div>`;
  return `<div class="card-icon type-${item.type}">${ICONS[item.type] || '📝'}</div>`;
}

function renderCard(item) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = item.id;

  if (item.type === 'image') {
    el.innerHTML = `
      <div class="card-top">
        ${cardIcon(item)}
        <button class="card-pin-btn ${item.pinned ? 'pinned-active' : ''}">📌</button>
      </div>
      <div class="card-image-preview"><img src="${item.content}" /></div>
      <div class="card-meta"><span>${timeAgo(item.created_at)}</span></div>
    `;
  } else {
    const previewClass = item.type === 'code' ? 'card-preview mono' : 'card-preview';
    el.innerHTML = `
      <div class="card-top">
        ${cardIcon(item)}
        <button class="card-pin-btn ${item.pinned ? 'pinned-active' : ''}">📌</button>
      </div>
      <div class="${previewClass}">${escapeHtml(item.preview || '')}</div>
      <div class="card-meta"><span>${timeAgo(item.created_at)}</span>${item.char_count ? `<span>· ${item.char_count} chars</span>` : ''}</div>
    `;
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('.card-pin-btn')) return;
    openDetail(item);
  });
  el.querySelector('.card-pin-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.clipdows.togglePin(item.id);
    refresh();
  });

  return el;
}

async function refresh() {
  const wantsPinnedOnly = currentType === 'pinned';
  const queryType = wantsPinnedOnly ? 'all' : (currentType === 'trash' ? 'all' : currentType);
  const { items, pinned } = await window.clipdows.getItems({ type: queryType, search: currentSearch });

  allActiveItems = items;

  // update counts
  const counts = { all: items.length, pinned: pinned.length };
  ['text', 'link', 'image', 'code', 'file', 'snippet'].forEach((t) => {
    counts[t] = items.filter((i) => i.type === t).length;
  });
  Object.keys(counts).forEach((k) => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.textContent = counts[k];
  });

  itemsGrid.innerHTML = '';
  pinnedGrid.innerHTML = '';

  let listToShow = items;
  if (wantsPinnedOnly) listToShow = pinned;

  const showPinnedSection = currentType === 'all' && pinned.length > 0 && !currentSearch;
  pinnedSection.hidden = !showPinnedSection;
  if (showPinnedSection) {
    pinned.forEach((item) => pinnedGrid.appendChild(renderCard(item)));
  }

  sectionTitle.textContent = currentType === 'all' ? 'Recent Items'
    : currentType === 'pinned' ? 'Pinned Items'
    : currentType === 'trash' ? 'Trash'
    : currentType[0].toUpperCase() + currentType.slice(1);

  if (currentType === 'trash') {
    itemsGrid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = 'Trash is empty';
    emptyState.querySelector('span').textContent = 'Deleted items will appear here.';
    return;
  }

  const gridItems = showPinnedSection ? listToShow.filter((i) => !i.pinned) : listToShow;

  if (gridItems.length === 0) {
    emptyState.hidden = false;
    emptyState.querySelector('p').textContent = 'Nothing here yet';
    emptyState.querySelector('span').textContent = "Copy something on your device — it'll show up instantly.";
  } else {
    emptyState.hidden = true;
    gridItems.forEach((item) => itemsGrid.appendChild(renderCard(item)));
  }
}

// ---- nav ----
navGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  navGroup.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  btn.classList.add('active');
  currentType = btn.dataset.type;
  refresh();
});

// ---- search ----
let searchDebounce;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentSearch = e.target.value.trim();
    refresh();
  }, 150);
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape' && !detailPanel.hidden) closeDetail();
});

// ---- view toggle ----
gridViewBtn.addEventListener('click', () => {
  gridViewBtn.classList.add('active');
  listViewBtn.classList.remove('active');
  content.classList.remove('list-mode');
});
listViewBtn.addEventListener('click', () => {
  listViewBtn.classList.add('active');
  gridViewBtn.classList.remove('active');
  content.classList.add('list-mode');
});

// ---- detail panel ----
function openDetail(item) {
  selectedItem = item;
  detailPanel.hidden = false;
  detailTypeChip.textContent = item.type[0].toUpperCase() + item.type.slice(1);
  detailMeta.textContent = fmtDate(item.created_at);
  detailBody.innerHTML = item.type === 'image'
    ? `<img src="${item.content}" />`
    : escapeHtml(item.content || '');
  detailCount.textContent = item.char_count ? `${item.char_count} characters` : '';
  detailPin.classList.toggle('pinned-active', !!item.pinned);
  detailPin.textContent = item.pinned ? '📌 Unpin' : '📌 Pin';
}
function closeDetail() {
  detailPanel.hidden = true;
  selectedItem = null;
}
detailBack.addEventListener('click', closeDetail);
detailClose.addEventListener('click', closeDetail);
detailCopy.addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.copyOnly(selectedItem.id);
});
detailPaste.addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.pasteItem(selectedItem.id);
});
detailPin.addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.togglePin(selectedItem.id);
  selectedItem.pinned = selectedItem.pinned ? 0 : 1;
  detailPin.classList.toggle('pinned-active', !!selectedItem.pinned);
  detailPin.textContent = selectedItem.pinned ? '📌 Unpin' : '📌 Pin';
  refresh();
});
detailTrash.addEventListener('click', async () => {
  if (!selectedItem) return;
  await window.clipdows.trashItem(selectedItem.id);
  closeDetail();
  refresh();
});

window.clipdows.onItemsUpdated(() => refresh());
refresh();