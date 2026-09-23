const listEl = document.getElementById('list');
const emptyStateEl = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const tabsEl = document.getElementById('tabs');
const closeBtn = document.getElementById('closeBtn');
const expandBtn = document.getElementById('expandBtn');

let currentType = 'all';
let currentSearch = '';
let currentItems = [];
let selectedIndex = 0;

const ICONS = {
  text: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M6 4h9l3 3v13H6V4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 11h6M9 14.5h6M9 7.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M9.5 14.5 14.5 9.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M11 7.5 12.6 5.9a3.3 3.3 0 0 1 4.7 4.7L15.7 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M13 16.5 11.4 18.1a3.3 3.3 0 0 1-4.7-4.7L8.3 12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  image: '',
  code: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M9 8 5 12l4 4M15 8l4 4-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M7 3.5h7l4 4V20a.6.6 0 0 1-.6.6H7A.6.6 0 0 1 6.4 20V4.1A.6.6 0 0 1 7 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V7a1 1 0 0 0 1 1h3.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  snippet: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M12 3.5 14.2 9l5.8.5-4.4 3.8 1.3 5.7L12 16l-5 3 1.3-5.7L4 9.5 9.8 9 12 3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
};

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

function renderIcon(item) {
  if (item.type === 'image') {
    return `<div class="item-icon type-image"><img src="${item.content}" /></div>`;
  }
  return `<div class="item-icon type-${item.type}">${ICONS[item.type] || ICONS.text}</div>`;
}

function renderItems() {
  listEl.querySelectorAll('.item').forEach((el) => el.remove());

  if (currentItems.length === 0) {
    emptyStateEl.hidden = false;
    return;
  }
  emptyStateEl.hidden = true;

  currentItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'item' + (i === selectedIndex ? ' selected' : '');
    el.dataset.id = item.id;

    const previewClass = item.type === 'code' ? 'item-preview mono' : 'item-preview';
    const previewText = item.type === 'image' ? '' : escapeHtml(item.preview || '');

    el.innerHTML = `
      <div class="item-index">${i < 5 ? i + 1 : ''}</div>
      ${renderIcon(item)}
      <div class="item-body">
        <div class="${previewClass}">${previewText}</div>
        <div class="item-meta">
          ${item.pinned ? '<span class="pin-dot">📌</span>' : ''}
          <span>${timeAgo(item.created_at)}</span>
        </div>
      </div>
      <div class="item-hover-actions">
        <button class="pin-btn ${item.pinned ? 'pinned-active' : ''}" title="Pin">📌</button>
        <button class="trash-btn" title="Delete">🗑</button>
      </div>
    `;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.item-hover-actions')) return;
      pasteItem(item.id);
    });
    el.querySelector('.pin-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.clipdows.togglePin(item.id);
      loadItems();
    });
    el.querySelector('.trash-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.clipdows.trashItem(item.id);
      loadItems();
    });
    el.addEventListener('mouseenter', () => {
      selectedIndex = i;
      updateSelection();
    });
    listEl.appendChild(el);
  });
}

function updateSelection() {
  listEl.querySelectorAll('.item').forEach((el, i) => {
    el.classList.toggle('selected', i === selectedIndex);
  });
  const sel = listEl.querySelectorAll('.item')[selectedIndex];
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadItems() {
  const { items } = await window.clipdows.getItems({ type: currentType, search: currentSearch });
  currentItems = items;
  selectedIndex = 0;
  renderItems();
}

async function pasteItem(id) {
  await window.clipdows.pasteItem(id);
}

// ---- tabs ----
tabsEl.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  currentType = tab.dataset.type;
  loadItems();
});

// ---- search ----
let searchDebounce;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentSearch = e.target.value.trim();
    loadItems();
  }, 120);
});

// ---- keyboard ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.clipdows.hidePopup();
    return;
  }
  if (/^[1-5]$/.test(e.key) && document.activeElement !== searchInput) {
    const idx = parseInt(e.key, 10) - 1;
    if (currentItems[idx]) pasteItem(currentItems[idx].id);
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, currentItems.length - 1);
    updateSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection();
  } else if (e.key === 'Enter' && document.activeElement === searchInput) {
    if (currentItems[selectedIndex]) pasteItem(currentItems[selectedIndex].id);
  }
});

closeBtn.addEventListener('click', () => window.clipdows.hidePopup());
expandBtn.addEventListener('click', () => window.clipdows.openDashboard());

// ---- live updates from main process ----
window.clipdows.onItemsUpdated(() => loadItems());
window.clipdows.onShown(() => {
  searchInput.value = '';
  currentSearch = '';
  searchInput.focus();
  loadItems();
});

loadItems();