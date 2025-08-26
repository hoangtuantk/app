import { dom } from './m_dom.js';
import { state } from './m_state.js';
import { getLineWithMostUppercase, copyToClipboard } from './m_utils.js';
import {
  updateInputLineCount,
  setProcessingState,
  renderResults,
  closeAllDropdowns,
  showInfoModal,
  hideInfoModal,
  showCasingConflictModal,
  hideCasingConflictModal,
  hideGroupingModal
} from './m_ui.js';

// Hàm download file
const downloadFile = (content, fileName) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Regular Expressions ---
const specialCharRegex = /[^\p{L}\p{N}\s]/u;
const nonAlphaNumericExceptEqualsRegex = /[^A-Za-z0-9\u4e00-\u9fff\u00C0-\u1EF9\s=]/g;


// --- Core Logic ---

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
    showCasingConflictModal(conflictGroup, resolveCurrentConflict);
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


// --- Sorting ---
export const applySortingAndRender = () => {
  state.displayedUniqueLines = [...state.originalUniqueLines].sort(createSortComparator('unique'));
  state.displayedDuplicateLines = [...state.originalDuplicateLines].sort(createSortComparator('duplicate'));
  renderResults();
};

export const createSortComparator = (listType) => (a, b) => {
  const mode = state.sortModes[listType];

  // Ưu tiên 1: Sắp xếp theo số lượng chữ Hán nếu được bật (direction khác 0)
  if (mode.charCountDirection !== 0) {
    const countDiff = a.chineseCharCount - b.chineseCharCount;
    if (countDiff !== 0) return countDiff * mode.charCountDirection; // Nhân với direction để có xuôi/ngược
    // Ưu tiên phụ: đưa dòng có ký tự đặc biệt xuống dưới
    if (a.hasSpecialChars !== b.hasSpecialChars) return a.hasSpecialChars ? 1 : -1;
  }

  // Ưu tiên 2: Sắp xếp theo A-Z
  if (mode.sortType) {
    const sensitivity = state.comparisonOptions.caseSensitive ? 'variant' : 'base';
    const valA = mode.sortType === 'chinese' ? a.chinesePart : a.vietnamesePart;
    const valB = mode.sortType === 'chinese' ? b.chinesePart : b.vietnamesePart;
    const locale = mode.sortType === 'chinese' ? 'zh' : 'vi';
    return valA.localeCompare(valB, locale, { sensitivity }) * mode.sortDirection;
  }
  return 0;
};

// --- Event Handlers ---
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

// --- Initialization ---
const setupEventListeners = () => {
  dom.textInput.addEventListener('input', updateInputLineCount);
  dom.findDuplicatesBtn.addEventListener('click', handleFindDuplicates);
  dom.clearInputBtn.addEventListener('click', resetAll);
  dom.dollarToggleButton.addEventListener('click', handleToggleDollar);

  // START: Thêm Event Listeners cho Modal Nhập File
  let selectedFile = null;
  // Mặc định nhóm xuôi
  let importCharCountDirection = 1;
  let importSortType = { type: null, direction: 1 };
  // Mặc định không sắp xếp

  const fileWorker = new Worker(new URL('./m_file_worker.js', import.meta.url), { type: 'module' });

  // THAY THẾ TOÀN BỘ HÀM fileWorker.onmessage CŨ BẰNG HÀM MỚI NÀY
  fileWorker.onmessage = (event) => {
    const { type, data, message, value } = event.data;

    switch (type) {
      case 'progress':
        dom.importFileModal.progressBar.style.width = `${value}%`;
        dom.importFileModal.progressPercentage.textContent = `${value}%`;
        break;

      case 'status':
        dom.importFileModal.progressLabel.textContent = message;
        break;

      case 'result':
        const { uniqueData, duplicateData, groupedData } = data;

        downloadFile(uniqueData, `Dữ liệu duy nhất (${uniqueData ? uniqueData.split('\n').length : 0}).txt`);
        setTimeout(() => {
          if (duplicateData) {
            downloadFile(duplicateData, `Dữ liệu bị lọc.txt`);
          }
        }, 500);
        setTimeout(() => {
          if (groupedData) {
            downloadFile(groupedData, `Các nhóm có tiếng Trung trùng lặp.txt`);
          }
        }, 1000);

        // Ẩn thanh tiến trình và bật lại nút
        setTimeout(() => {
          dom.importFileModal.progressContainer.classList.add('hidden');
          dom.importFileModal.processBtn.disabled = false;
          dom.importFileModal.processBtn.textContent = 'Xử lý & Tải về';
          dom.importFileModal.spinner.classList.add('hidden');
        }, 1500); // Đợi thêm chút nữa rồi mới ẩn
        break;
    }
  };

  fileWorker.onerror = (error) => {
    console.error('Lỗi từ Worker:', error);
    alert('Đã có lỗi xảy ra trong quá trình xử lý file. Vui lòng kiểm tra console.');
    dom.importFileModal.spinner.classList.add('hidden');
    dom.importFileModal.processBtn.disabled = false;
    dom.importFileModal.processBtn.textContent = 'Xử lý & Tải về';
  };


  const openImportModal = () => dom.importFileModal.overlay.classList.add('show');
  const closeImportModal = () => {
    dom.importFileModal.overlay.classList.remove('show');
    // Reset khi đóng
    selectedFile = null;
    dom.importFileModal.fileInfo.textContent = '';
    dom.importFileModal.processBtn.disabled = true;
    dom.importFileModal.fileInput.value = '';
    dom.importFileModal.progressContainer.classList.add('hidden');
  };

  const handleFileSelect = (file) => {
    if (file) {
      selectedFile = file;
      dom.importFileModal.fileInfo.textContent = `Đã chọn file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      dom.importFileModal.processBtn.disabled = false;
    }
  };

  dom.importFileBtn.addEventListener('click', openImportModal);
  dom.importFileModal.closeBtn.addEventListener('click', closeImportModal);
  dom.importFileModal.overlay.addEventListener('click', (e) => {
    if (e.target === dom.importFileModal.overlay) {
      closeImportModal();
    }
  });

  // Drag and drop events
  dom.importFileModal.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.importFileModal.dropZone.classList.add('drag-over');
  });
  dom.importFileModal.dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dom.importFileModal.dropZone.classList.remove('drag-over');
  });
  dom.importFileModal.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.importFileModal.dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });
  dom.importFileModal.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Sort options
  // Listener cho các nút nhóm theo số lượng Hán tự trong modal
  const charCountButtons = dom.importFileModal.charCountContainer.querySelectorAll('.sort-option-btn');
  charCountButtons.forEach(button => {
    button.addEventListener('click', () => {
      charCountButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      importCharCountDirection = parseInt(button.dataset.direction, 10);
    });
  });

  // Listener cho các nút sắp xếp
  const sortButtons = dom.importFileModal.sortOptionsContainer.querySelectorAll('.sort-option-btn');
  sortButtons.forEach(button => {
    button.addEventListener('click', () => {
      const isActive = button.classList.contains('active');
      sortButtons.forEach(btn => btn.classList.remove('active'));

      if (isActive) {
        // Nếu click lại nút đang active, hủy sắp xếp
        importSortType = { type: null, direction: 1 };
      } else {
        // Nếu click nút mới
        button.classList.add('active');
        const sortValue = button.dataset.sort;
        const [type, dir] = sortValue.split('-');
        importSortType = { type, direction: dir === 'asc' ? 1 : -1 };
      }
    });
  });

  // Process file
  dom.importFileModal.processBtn.addEventListener('click', () => {
    if (!selectedFile) return;

    dom.importFileModal.spinner.classList.remove('hidden');
    dom.importFileModal.processBtn.disabled = true;
    dom.importFileModal.processBtn.textContent = 'Đang xử lý...';

    // Reset và hiển thị thanh tiến trình
    dom.importFileModal.progressContainer.classList.remove('hidden');
    dom.importFileModal.progressBar.style.width = '0%';
    dom.importFileModal.progressPercentage.textContent = '0%';
    dom.importFileModal.progressLabel.textContent = 'Đang đọc file...';

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target.result;
      const currentComparisonOptions = {
        caseSensitive: dom.caseSensitiveToggle.checked,
        ignoreWhitespace: dom.ignoreWhitespaceToggle.checked,
        ignoreSpecialChars: dom.ignoreSpecialCharsToggle.checked,
      };

      // Gửi dữ liệu cho worker
      fileWorker.postMessage({
        fileContent,
        comparisonOptions: currentComparisonOptions,
        sortOptions: {
          charCountDirection: importCharCountDirection,
          sortType: importSortType
        }
      });
    };
    reader.onerror = () => {
      alert('Không thể đọc file!');
      dom.importFileModal.spinner.classList.add('hidden');
      dom.importFileModal.processBtn.disabled = false;
      dom.importFileModal.processBtn.textContent = 'Xử lý & Tải về';
    };
    reader.readAsText(selectedFile);
  });

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

  document.body.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-menu-icon') && !e.target.closest('.sort-dropdown')) {
      closeAllDropdowns();
    }
  });
};

const init = () => {
  document.documentElement.classList.add('dark');
  updateInputLineCount();
  setupEventListeners();
  resetAll();
};

// --- Start the application ---
document.addEventListener('DOMContentLoaded', init);