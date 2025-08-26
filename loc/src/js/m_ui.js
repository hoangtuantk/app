import { dom } from './m_dom.js';
import { state } from './m_state.js';
import { copyToClipboard } from './m_utils.js';
import { applySortingAndRender, createSortComparator } from './main.js';

// --- UI Helpers ---
export const updateInputLineCount = () => {
  const count = dom.textInput.value ? dom.textInput.value.split('\n').filter(line => line.trim() !== '').length : 0;
  dom.inputLineCountSpan.textContent = count;
};

export const setProcessingState = (isProcessing) => {
  dom.findDuplicatesBtn.disabled = isProcessing;
  dom.findDuplicatesBtn.textContent = isProcessing ? 'Đang xử lý...' : 'Tìm & Lọc Trùng Lặp';
};

// --- Rendering ---
export const renderResults = () => {
  dom.resultsDiv.innerHTML = `
    ${createResultSectionHTML('unique', 'Dữ liệu duy nhất', state.displayedUniqueLines)}
    ${createResultSectionHTML('duplicate', 'Dữ liệu bị lọc', state.displayedDuplicateLines)}
  `;
  attachDynamicEventListeners();
};

const createResultSectionHTML = (type, title, data) => {
  const count = (type === 'duplicate') ? data.reduce((sum, item) => sum + item.count, 0) : data.length;
  const itemsHtml = data.length > 0
    ? data.map(item => `<li class="data-font ${type === 'unique' ? 'unique-item' : 'duplicate-item'}">${item.original}${type === 'duplicate' ? ` (đã lọc ${item.count} lần)` : ''}</li>`).join('')
    : `<li>Không có dữ liệu.</li>`;

  return `
    <div class="result-section" id="${type}DataSection">
      <h3>
        <span>${title} (${count}):</span>
        <span class="flex items-center relative">
          <span class="copy-text-and-icon cursor-pointer flex items-center" data-target="${type}DataList">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002 2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10"></path></svg>
            <span class="ml-1 text-sm font-medium">Sao chép</span>
          </span>
          ${type === 'unique' ? `
          <button title="Hiển thị các nhóm có tiếng Trung trùng lặp" class="show-grouping-modal-btn text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
          </button>
          ` : ''}
          <svg class="sort-menu-icon w-6 h-6 ml-2" data-list-type="${type}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><title>Tùy chọn sắp xếp</title><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01.293.707V19a1 1 0 01-1 1H4a1 1 0 01-1-1V7.293a1 1 0 01.293-.707L3 4zm0 0h.01M16 12h-3V9h-2v3H8l4 4 4-4z"></path></svg>
        </span>
      </h3>
      <ul id="${type}DataList" class="mt-2">${itemsHtml}</ul>
    </div>`;
};

// --- Dynamic Event Listeners for Results ---
const attachDynamicEventListeners = () => {
  document.querySelectorAll('.copy-text-and-icon').forEach(icon => {
    icon.onclick = (e) => {
      const listId = e.currentTarget.dataset.target;
      const list = document.getElementById(listId);
      if (list) {
        const text = Array.from(list.children).map(li => li.textContent.replace(/\s\(.*\)$/, '')).join('\n');
        copyToClipboard(text);
      }
    };
  });
  document.querySelectorAll('.sort-menu-icon').forEach(icon => {
    icon.onclick = (e) => showSortDropdown(e);
  });
  const groupingBtn = document.querySelector('.show-grouping-modal-btn');
  if (groupingBtn) {
    groupingBtn.onclick = showGroupingModal;
  }
};

// --- Sorting Dropdown ---
const showSortDropdown = (event) => {
  event.stopPropagation();
  closeAllDropdowns();
  const listType = event.currentTarget.dataset.listType;
  const parentSpan = event.currentTarget.closest('span');
  const dropdown = document.createElement('div');
  dropdown.className = 'sort-dropdown';

  const options = [
    { text: 'Xếp theo tiếng Trung (A-Z)', action: 'chinese-asc' },
    { text: 'Xếp theo tiếng Trung (Z-A)', action: 'chinese-desc' },
    { text: 'Xếp theo tiếng Việt (A-Z)', action: 'vietnamese-asc' },
    { text: 'Xếp theo tiếng Việt (Z-A)', action: 'vietnamese-desc' }
  ];

  dropdown.innerHTML = `
      <div class="px-4 py-2 flex items-center justify-between">
          <span>Nhóm theo số lượng chữ Hán</span>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
              <input type="checkbox" id="chineseCountToggle-${listType}" class="sr-only peer" ${state.sortModes[listType].chineseCharCountEnabled ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
          </label>
      </div>
      <hr class="border-gray-200 dark:border-gray-600 my-1">
      ${options.map(o => `<button data-action="${o.action}"><span>${o.text}</span></button>`).join('')}
      <hr class="border-gray-200 dark:border-gray-600 my-1">
      <div class="px-4 py-2 flex justify-end">
          <button id="resetSort-${listType}" class="text-sm">Hoàn nguyên</button>
      </div>
  `;

  parentSpan.appendChild(dropdown);

  dropdown.querySelector(`#chineseCountToggle-${listType}`).onchange = (e) => {
    state.sortModes[listType].chineseCharCountEnabled = e.target.checked;
    applySortingAndRender();
  };
  dropdown.querySelectorAll('button[data-action]').forEach(btn => {
    btn.onclick = () => {
      const [type, dir] = btn.dataset.action.split('-');
      state.sortModes[listType].sortType = type;
      state.sortModes[listType].sortDirection = dir === 'asc' ? 1 : -1;
      applySortingAndRender();
    };
  });
  dropdown.querySelector(`#resetSort-${listType}`).onclick = () => {
    state.sortModes[listType].sortType = null;
    applySortingAndRender();
  };

  setTimeout(() => dropdown.classList.add('show'), 10);
};

export const closeAllDropdowns = () => document.querySelectorAll('.sort-dropdown').forEach(d => d.remove());

// --- Modal visibility ---
export const showInfoModal = (e, title, body) => {
  e.stopPropagation();
  dom.infoModal.title.textContent = title;
  dom.infoModal.body.innerHTML = `<p>${body}</p>`;
  dom.infoModal.overlay.classList.add('show');
};
export const hideInfoModal = () => dom.infoModal.overlay.classList.remove('show');

export const showCasingConflictModal = (conflictGroup, onResolve) => {
  dom.casingConflictModal.title.textContent = `Chọn phiên bản (${state.conflict.currentIndex + 1}/${state.conflict.groups.length})`;
  dom.casingConflictModal.list.innerHTML = '';
  conflictGroup.forEach(line => {
    const li = document.createElement('li');
    li.className = 'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between text-lg';
    li.innerHTML = `<span>${line}</span><button class="select-conflict-btn bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md">Chọn</button>`;
    li.querySelector('button').onclick = () => onResolve(line);
    dom.casingConflictModal.list.appendChild(li);
  });
  dom.casingConflictModal.overlay.classList.add('show');
};
export const hideCasingConflictModal = () => dom.casingConflictModal.overlay.classList.remove('show');

export const showGroupingModal = () => {
  const groups = new Map();
  state.displayedUniqueLines.forEach(item => {
    const key = item.chinesePart;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item.original);
  });

  let contentHtml = '';
  let copyText = '';
  let foundGroups = false;
  const linesForCopy = [];

  groups.forEach((lines) => {
    if (lines.length > 1) {
      foundGroups = true;
      if (contentHtml !== '') {
        contentHtml += '<hr class="my-4 border-gray-300 dark:border-gray-600">';
      }
      contentHtml += lines.map(line => `<p class="data-font py-1">${line}</p>`).join('');
      linesForCopy.push(lines.join('\n'));
    }
  });

  if (!foundGroups) {
    contentHtml = '<p>Không tìm thấy nhóm nào có phần tiếng Trung trùng nhau trong danh sách dữ liệu duy nhất.</p>';
    dom.groupingModal.copyBtn.style.display = 'none';
  } else {
    copyText = linesForCopy.join('\n\n');
    dom.groupingModal.copyBtn.dataset.copyText = copyText;
    dom.groupingModal.copyBtn.style.display = 'flex';
  }

  dom.groupingModal.body.innerHTML = contentHtml;
  dom.groupingModal.overlay.classList.add('show');
};
export const hideGroupingModal = () => dom.groupingModal.overlay.classList.remove('show');