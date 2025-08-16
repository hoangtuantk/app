document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const dom = {
    textInput: document.getElementById('textInput'),
    findDuplicatesBtn: document.getElementById('findDuplicatesBtn'),
    dollarToggleButton: document.getElementById('dollarToggleButton'),
    clearInputBtn: document.getElementById('clearInputBtn'),
    resultsDiv: document.getElementById('results'),
    copyMessage: document.getElementById('copyMessage'),
    inputLineCountSpan: document.getElementById('inputLineCount'),
    caseSensitiveToggle: document.getElementById('caseSensitiveToggle'),
    ignoreWhitespaceToggle: document.getElementById('ignoreWhitespaceToggle'),
    ignoreSpecialCharsToggle: document.getElementById('ignoreSpecialCharsToggle'),
    casingConflictModal: {
      overlay: document.getElementById('casingConflictModalOverlay'),
      title: document.getElementById('casingConflictModalTitle'),
      list: document.getElementById('conflictLinesList'),
      autoSelectBtn: document.getElementById('autoSelectConflictBtn'),
    },
    infoModal: {
      overlay: document.getElementById('infoModalOverlay'),
      title: document.getElementById('infoModalTitle'),
      body: document.getElementById('infoModalBody'),
      closeBtn: document.getElementById('closeInfoModalBtn'),
    },
    groupingModal: {
      overlay: document.getElementById('groupingModalOverlay'),
      body: document.getElementById('groupingModalBody'),
      closeBtn: document.getElementById('closeGroupingModalBtn'),
      copyBtn: document.getElementById('copyGroupingBtn'),
    },
    infoToggleButtons: {
      case: document.getElementById('infoToggleBtn-case'),
      whitespace: document.getElementById('infoToggleBtn-whitespace'),
      specialchars: document.getElementById('infoToggleBtn-specialchars'),
    }
  };

  // --- Application State ---
  const state = {
    originalUniqueLines: [],
    originalDuplicateLines: [],
    displayedUniqueLines: [],
    displayedDuplicateLines: [],
    sortModes: {
      unique: { sortType: null, sortDirection: 1, chineseCharCountEnabled: true },
      duplicate: { sortType: null, sortDirection: 1, chineseCharCountEnabled: true },
    },
    comparisonOptions: {
      caseSensitive: false,
      ignoreWhitespace: false,
      ignoreSpecialChars: false,
    },
    conflict: {
      groups: [],
      currentIndex: 0,
      resolvedMap: new Map(),
    },
    lastProcessedInputText: null,
  };

  // --- Regular Expressions ---
  const specialCharRegex = /[^\p{L}\p{N}\s]/u;
  const nonAlphaNumericExceptEqualsRegex = /[^A-Za-z0-9\u4e00-\u9fff\u00C0-\u1EF9\s=]/g;

  // --- Initialization ---
  const init = () => {
    document.documentElement.classList.add('dark');
    updateInputLineCount();
    setupEventListeners();
    resetAll();
  };

  // --- Event Listeners Setup ---
  const setupEventListeners = () => {
    dom.textInput.addEventListener('input', updateInputLineCount);
    dom.findDuplicatesBtn.addEventListener('click', handleFindDuplicates);
    dom.clearInputBtn.addEventListener('click', resetAll);
    dom.dollarToggleButton.addEventListener('click', handleToggleDollar);

    dom.caseSensitiveToggle.addEventListener('change', () => handleOptionChange('caseSensitive', dom.caseSensitiveToggle.checked));
    dom.ignoreWhitespaceToggle.addEventListener('change', () => handleOptionChange('ignoreWhitespace', dom.ignoreWhitespaceToggle.checked));
    dom.ignoreSpecialCharsToggle.addEventListener('change', () => handleOptionChange('ignoreSpecialChars', dom.ignoreSpecialCharsToggle.checked));

    dom.infoToggleButtons.case.addEventListener('click', (e) => showInfoModal(e, 'Phân biệt Hoa/thường', 'Khi bật, "Dòng" và "dòng" sẽ được coi là hai chuỗi khác nhau. Khi tắt (mặc định), chúng sẽ được coi là trùng lặp.'));
    dom.infoToggleButtons.whitespace.addEventListener('click', (e) => showInfoModal(e, 'Bỏ qua khoảng trắng', 'Khi bật, các khoảng trắng thừa sẽ bị bỏ qua khi so sánh. Ví dụ, "若水" và "若  水" sẽ được coi là trùng lặp.'));
    dom.infoToggleButtons.specialchars.addEventListener('click', (e) => showInfoModal(e, 'Bỏ qua ký tự đặc biệt', 'Khi bật, các ký tự đặc biệt (dấu câu, v.v.) sẽ bị bỏ qua khi so sánh. Ví dụ: "Dòng-một" và "Dòng một" sẽ được coi là trùng lặp. Ký tự "=" được giữ lại.'));
    dom.infoModal.closeBtn.addEventListener('click', hideInfoModal);
    dom.infoModal.overlay.addEventListener('click', (e) => e.target === dom.infoModal.overlay && hideInfoModal());

    dom.casingConflictModal.autoSelectBtn.addEventListener('click', handleAutoResolveConflicts);

    dom.groupingModal.closeBtn.addEventListener('click', hideGroupingModal);
    dom.groupingModal.overlay.addEventListener('click', (e) => e.target === dom.groupingModal.overlay && hideGroupingModal());
    dom.groupingModal.copyBtn.addEventListener('click', (e) => {
      const textToCopy = e.currentTarget.dataset.copyText;
      if (textToCopy) {
        copyToClipboard(textToCopy);
      }
    });
  };

  // --- Core Logic Handlers ---
  const handleFindDuplicates = () => {
    const inputText = dom.textInput.value;
    if (inputText === state.lastProcessedInputText) return;

    setProcessingState(true);

    setTimeout(() => {
      resetProcessingState();
      const lines = inputText.split('\n').filter(line => line.trim() !== '');

      if (!state.comparisonOptions.caseSensitive) {
        state.conflict.groups = findCasingConflicts(lines);
        if (state.conflict.groups.length > 0) {
          showNextCasingConflict();
          setProcessingState(false);
          return;
        }
      }

      performFinalProcessing(lines);
      state.lastProcessedInputText = inputText;
      setProcessingState(false);
    }, 10);
  };

  const handleOptionChange = (option, value) => {
    state.comparisonOptions[option] = value;
    if (dom.textInput.value.trim() !== '') {
      state.lastProcessedInputText = null;
      handleFindDuplicates();
    }
  };

  const handleToggleDollar = () => {
    const toggle = (line) => line.trim() === '' ? '' : (line.trim().startsWith('$') ? line.replace(/^\s*\$/, '') : '$' + line.trimStart());
    dom.textInput.value = dom.textInput.value.split('\n').map(toggle).join('\n');

    state.displayedUniqueLines.forEach(item => item.original = toggle(item.original));
    state.displayedDuplicateLines.forEach(item => item.original = toggle(item.original));
    renderResults();
  };

  // --- Processing Functions ---
  const performFinalProcessing = (lines) => {
    const lineGroupsMap = new Map();

    lines.forEach(originalLine => {
      const key = cleanTextForComparison(originalLine);
      if (!lineGroupsMap.has(key)) {
        lineGroupsMap.set(key, { originalCounts: new Map() });
      }
      const group = lineGroupsMap.get(key);
      group.originalCounts.set(originalLine, (group.originalCounts.get(originalLine) || 0) + 1);
    });

    state.originalUniqueLines = [];
    state.originalDuplicateLines = [];

    lineGroupsMap.forEach((group, key) => {
      const chosenLine = state.conflict.resolvedMap.has(key)
        ? state.conflict.resolvedMap.get(key)
        : group.originalCounts.keys().next().value;

      state.originalUniqueLines.push(parseLineContent(chosenLine));

      group.originalCounts.forEach((count, originalLine) => {
        if (originalLine === chosenLine) {
          if (count > 1) {
            state.originalDuplicateLines.push({ ...parseLineContent(originalLine), count: count - 1 });
          }
        } else {
          state.originalDuplicateLines.push({ ...parseLineContent(originalLine), count });
        }
      });
    });

    applySortingAndRender();
  };

  const cleanTextForComparison = (text) => {
    let cleanedText = text.startsWith('$') ? text.substring(1) : text;
    if (state.comparisonOptions.ignoreWhitespace) cleanedText = cleanedText.replace(/\s/g, '');
    if (state.comparisonOptions.ignoreSpecialChars) cleanedText = cleanedText.replace(nonAlphaNumericExceptEqualsRegex, '');
    if (!state.comparisonOptions.caseSensitive) cleanedText = cleanedText.toLowerCase();
    return cleanedText;
  };

  const parseLineContent = (line) => {
    const originalLine = line;
    const lineWithoutDollar = originalLine.startsWith('$') ? originalLine.substring(1) : originalLine;
    const parts = lineWithoutDollar.split('=');
    const chinesePart = parts.length > 1 ? parts[0] : lineWithoutDollar;
    const vietnamesePart = parts.length > 1 ? parts.slice(1).join('=') : lineWithoutDollar;
    const chineseCharCount = (chinesePart.match(/[\u4e00-\u9fff]/g) || []).length;

    return {
      original: originalLine,
      chinesePart,
      vietnamesePart,
      chineseCharCount,
      hasSpecialChars: specialCharRegex.test(chinesePart),
      comparisonKey: cleanTextForComparison(originalLine)
    };
  };

  // --- Conflict Resolution ---
  const findCasingConflicts = (lines) => {
    const groups = {};
    lines.forEach(line => {
      const key = cleanTextForComparison(line);
      if (!groups[key]) groups[key] = new Set();
      groups[key].add(line);
    });
    return Object.values(groups).filter(group => group.size > 1).map(set => Array.from(set));
  };

  const showNextCasingConflict = () => {
    if (state.conflict.currentIndex < state.conflict.groups.length) {
      const conflictGroup = state.conflict.groups[state.conflict.currentIndex];
      showCasingConflictModal(conflictGroup);
    } else {
      hideCasingConflictModal();
      performFinalProcessing(dom.textInput.value.split('\n').filter(line => line.trim() !== ''));
    }
  };

  const resolveCurrentConflict = (chosenLine) => {
    const key = cleanTextForComparison(chosenLine);
    state.conflict.resolvedMap.set(key, chosenLine);
    state.conflict.currentIndex++;
    showNextCasingConflict();
  };

  const handleAutoResolveConflicts = () => {
    for (let i = state.conflict.currentIndex; i < state.conflict.groups.length; i++) {
      const group = state.conflict.groups[i];
      const chosenLine = getLineWithMostUppercase(group);
      const key = cleanTextForComparison(chosenLine);
      state.conflict.resolvedMap.set(key, chosenLine);
    }
    state.conflict.currentIndex = state.conflict.groups.length;
    hideCasingConflictModal();
    performFinalProcessing(dom.textInput.value.split('\n').filter(line => line.trim() !== ''));
  };

  const getLineWithMostUppercase = (group) => {
    const vietnameseUppercaseRegex = /[A-ZÀÁẠẢÃĂẰẮẲẶẴÂẦẤẨẬẪĐÈÉẸẺẼÊỀẾỂỆỄÌÍỊỈĨÒÓỌỎÕÔỒỐỔỘỖƠỜỚỞỢỠÙÚỤỦŨƯỪỨỬỰỮỲÝỴỶỸ]/g;
    return group.reduce((best, current) => {
      const bestCount = (parseLineContent(best).vietnamesePart.match(vietnameseUppercaseRegex) || []).length;
      const currentCount = (parseLineContent(current).vietnamesePart.match(vietnameseUppercaseRegex) || []).length;
      return currentCount > bestCount ? current : best;
    });
  };

  // --- Sorting ---
  const applySortingAndRender = () => {
    state.displayedUniqueLines = [...state.originalUniqueLines].sort(createSortComparator('unique'));
    state.displayedDuplicateLines = [...state.originalDuplicateLines].sort(createSortComparator('duplicate'));
    renderResults();
  };

  const createSortComparator = (listType) => (a, b) => {
    const mode = state.sortModes[listType];
    if (mode.chineseCharCountEnabled) {
      const countDiff = a.chineseCharCount - b.chineseCharCount;
      if (countDiff !== 0) return countDiff;
      if (a.hasSpecialChars !== b.hasSpecialChars) return a.hasSpecialChars ? 1 : -1;
    }

    if (mode.sortType) {
      const sensitivity = state.comparisonOptions.caseSensitive ? 'variant' : 'base';
      const valA = mode.sortType === 'chinese' ? a.chinesePart : a.vietnamesePart;
      const valB = mode.sortType === 'chinese' ? b.chinesePart : b.vietnamesePart;
      const locale = mode.sortType === 'chinese' ? 'zh' : 'vi';
      return valA.localeCompare(valB, locale, { sensitivity }) * mode.sortDirection;
    }
    return 0;
  };

  // --- Rendering and UI ---
  const renderResults = () => {
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
                        <span class="copy-text-and-icon cursor-pointer flex items-center text-indigo-500 hover:text-indigo-600 dark:text-green-300 dark:hover:text-green-200 transition-colors mr-2" data-target="${type}DataList">
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
            <div class="px-4 py-2 flex items-center justify-between text-gray-700 dark:text-gray-200">
                <span>Nhóm theo số lượng chữ Hán</span>
                <label class="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" id="chineseCountToggle-${listType}" class="sr-only peer" ${state.sortModes[listType].chineseCharCountEnabled ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
            </div>
            <hr class="border-gray-200 dark:border-gray-600 my-1">
            ${options.map(o => `<button data-action="${o.action}"><span>${o.text}</span></button>`).join('')}
            <hr class="border-gray-200 dark:border-gray-600 my-1">
            <div class="px-4 py-2 flex justify-end">
                <button id="resetSort-${listType}" class="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Hoàn nguyên</button>
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

  const closeAllDropdowns = () => document.querySelectorAll('.sort-dropdown').forEach(d => d.remove());
  document.body.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-menu-icon') && !e.target.closest('.sort-dropdown')) {
      closeAllDropdowns();
    }
  });


  // --- UI Helpers ---
  const updateInputLineCount = () => {
    const count = dom.textInput.value ? dom.textInput.value.split('\n').filter(line => line.trim() !== '').length : 0;
    dom.inputLineCountSpan.textContent = count;
  };

  const setProcessingState = (isProcessing) => {
    dom.findDuplicatesBtn.disabled = isProcessing;
    dom.findDuplicatesBtn.textContent = isProcessing ? 'Đang xử lý...' : 'Tìm & Lọc Trùng Lặp';
  };

  const showCopyMessage = () => {
    dom.copyMessage.classList.add('show');
    setTimeout(() => dom.copyMessage.classList.remove('show'), 1500);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCopyMessage();
    } catch (err) {
      console.error('Không thể sao chép văn bản: ', err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // --- Modal visibility ---
  const showInfoModal = (e, title, body) => {
    e.stopPropagation();
    dom.infoModal.title.textContent = title;
    dom.infoModal.body.innerHTML = `<p>${body}</p>`;
    dom.infoModal.overlay.classList.add('show');
  };
  const hideInfoModal = () => dom.infoModal.overlay.classList.remove('show');

  const showCasingConflictModal = (conflictGroup) => {
    dom.casingConflictModal.title.textContent = `Chọn phiên bản (${state.conflict.currentIndex + 1}/${state.conflict.groups.length})`;
    dom.casingConflictModal.list.innerHTML = '';
    conflictGroup.forEach(line => {
      const li = document.createElement('li');
      li.className = 'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between text-lg';
      li.innerHTML = `<span>${line}</span><button class="select-conflict-btn bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md">Chọn</button>`;
      li.querySelector('button').onclick = () => resolveCurrentConflict(line);
      dom.casingConflictModal.list.appendChild(li);
    });
    dom.casingConflictModal.overlay.classList.add('show');
  };
  const hideCasingConflictModal = () => dom.casingConflictModal.overlay.classList.remove('show');

  const showGroupingModal = () => {
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
  const hideGroupingModal = () => dom.groupingModal.overlay.classList.remove('show');


  // --- Reset Functions ---
  const resetProcessingState = () => {
    state.originalUniqueLines = [];
    state.originalDuplicateLines = [];
    state.conflict.groups = [];
    state.conflict.currentIndex = 0;
    state.conflict.resolvedMap.clear();
  };

  const resetAll = () => {
    dom.textInput.value = '';
    state.lastProcessedInputText = null;
    resetProcessingState();
    applySortingAndRender();
    updateInputLineCount();
  };

  // --- Start the application ---
  init();
});
