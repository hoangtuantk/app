// Lấy các phần tử từ DOM
const baseInput = document.getElementById('baseInput');
const suffixInput = document.getElementById('suffixInput');
const outputArea = document.getElementById('outputArea');
const generateBtn = document.getElementById('generateBtn');
const dollarBtn = document.getElementById('dollarBtn');
const copyBtn = document.getElementById('copyBtn');
const presetList = document.getElementById('presetList');
const addPresetBtn = document.getElementById('addPresetBtn');
const deleteAllPresetsBtn = document.getElementById('deleteAllPresetsBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const resetPresetsBtn = document.getElementById('resetPresetsBtn');
const exportPresetsBtn = document.getElementById('exportPresetsBtn');
const importPresetsBtn = document.getElementById('importPresetsBtn');
const importFile = document.getElementById('importFile');

// Modal elements
const presetModal = document.getElementById('presetModal');
const modalTitle = document.getElementById('modalTitle');
const presetNameInput = document.getElementById('presetNameInput');
const presetContentInput = document.getElementById('presetContentInput');
const saveModalBtn = document.getElementById('saveModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

// Confirmation modal elements
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const actionConfirmBtn = document.getElementById('actionConfirmBtn');

// Biến toàn cục để lưu trữ presets
let presets = [];
const PRESET_STORAGE_KEY = "user_presets";

// Biến để theo dõi preset đang được chỉnh sửa
let editingPresetId = null;
let confirmAction = null;

const SYSTEM_PRESET_ID_1 = "system-preset-cuutrong";
const systemPresetTemplate1 = {
  id: SYSTEM_PRESET_ID_1,
  name: "Hệ thống cửu trọng",
  content: "一重=nhất trọng\n二重=nhị trọng\n三重=tam trọng\n四重=tứ trọng\n五重=ngũ trọng\n六重=lục trọng\n七重=thất trọng\n八重=bát trọng\n九重=cửu trọng",
  isSystem: true
};
const SYSTEM_PRESET_ID_2 = "system-preset-cuupham";
const systemPresetTemplate2 = {
  id: SYSTEM_PRESET_ID_2,
  name: "Hệ thống cửu phẩm",
  content: "一品=nhất phẩm\n二品=nhị phẩm\n三品=tam phẩm\n四品=tứ phẩm\n五品=ngũ phẩm\n六品=lục phẩm\n七品=thất phẩm\n八品=bát phẩm\n九品=cửu phẩm",
  isSystem: true
};
// --- Local Storage Functions ---
function savePresetsToLocalStorage() {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

function loadPresetsFromLocalStorage() {
  const storedPresets = localStorage.getItem(PRESET_STORAGE_KEY);
  if (storedPresets) {
    try {
      presets = JSON.parse(storedPresets);
      const cuuPhamExists = presets.some(p => p.id === SYSTEM_PRESET_ID_2);
      if (!cuuPhamExists) {
        presets.push(systemPresetTemplate2);
      }
    } catch (e) {
      console.error("Error parsing presets from local storage:", e);
      presets = [];
      presets = [systemPresetTemplate1, systemPresetTemplate2];
    }
  } else {
    presets = [systemPresetTemplate1, systemPresetTemplate2]; // Restore system preset on first load
  }
  renderPresets();
}

function addPreset(name, content) {
  const newPreset = {
    id: Date.now().toString(), // Use timestamp for unique ID
    name,
    content,
    isSystem: false
  };
  presets.push(newPreset);
  savePresetsToLocalStorage();
  renderPresets();
}

function updatePreset(id, newName, newContent) {
  const presetIndex = presets.findIndex(p => p.id === id);
  if (presetIndex !== -1) {
    presets[presetIndex].name = newName;
    presets[presetIndex].content = newContent;
    savePresetsToLocalStorage();
    renderPresets();
  }
}

function deletePreset(id) {
  presets = presets.filter(p => p.id !== id);
  savePresetsToLocalStorage();
  renderPresets();
}

function deleteAllPresets() {
  presets = [];
  savePresetsToLocalStorage();
  renderPresets();
}

function resetPresetsToDefault() {
  presets = [systemPresetTemplate1, systemPresetTemplate2];
  savePresetsToLocalStorage();
  renderPresets();
}

function movePreset(id, direction) {
  const presetIndex = presets.findIndex(p => p.id === id);

  if (presetIndex === -1) return;
  const newIndex = direction === 'up' ? presetIndex - 1 : presetIndex + 1;

  if (newIndex < 0 || newIndex >= presets.length) return;

  const [movedPreset] = presets.splice(presetIndex, 1);
  presets.splice(newIndex, 0, movedPreset);

  savePresetsToLocalStorage();
  renderPresets();
}

function duplicatePreset(id) {
  const presetToDuplicate = presets.find(p => p.id === id);
  if (presetToDuplicate) {
    const newName = `${presetToDuplicate.name} (Bản sao)`;
    const newPreset = {
      id: Date.now().toString(),
      name: newName,
      content: presetToDuplicate.content,
      isSystem: false
    };
    presets.push(newPreset);
    savePresetsToLocalStorage();
    renderPresets();
  }
}

// Export presets to a JSON file
function exportPresets() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "presets.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

// Import presets from a JSON file
function importPresets(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedPresets = JSON.parse(e.target.result);
      if (Array.isArray(importedPresets)) {
        presets = importedPresets;
        savePresetsToLocalStorage();
        renderPresets();
        showTemporaryMessage("Đã nhập thành công các bộ cài sẵn!", "bg-green-500");
      } else {
        showTemporaryMessage("Định dạng file không hợp lệ.", "bg-red-500");
      }
    } catch (error) {
      showTemporaryMessage("Lỗi khi đọc file JSON.", "bg-red-500");
      console.error(error);
    }
  };
  reader.readAsText(file);
}

function renderPresets() {
  const allPresets = [...presets];
  presetList.innerHTML = ''; // Xóa danh sách cũ

  allPresets.forEach((preset, index) => {
    const li = document.createElement('li');
    li.className = 'bg-gray-600 p-3 rounded-lg flex justify-between items-center';

    const presetName = document.createElement('span');
    presetName.className = 'text-white font-medium truncate';
    presetName.textContent = preset.name;
    li.appendChild(presetName);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center space-x-2';

    // Nút Sử dụng
    const applyBtn = document.createElement('button');
    applyBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors text-sm';
    applyBtn.textContent = 'Sử dụng';
    applyBtn.onclick = () => applyPreset(preset.content);
    actionsDiv.appendChild(applyBtn);

    // Nút Chỉnh sửa
    const editBtn = document.createElement('button');
    editBtn.className = 'text-gray-300 hover:text-white';
    editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
    editBtn.onclick = () => showPresetModal('edit', preset.id);
    actionsDiv.appendChild(editBtn);

    // Nút Di chuyển lên/xuống
    const isFirst = index === 0;
    const isLast = index === allPresets.length - 1;

    const moveUpBtn = document.createElement('button');
    moveUpBtn.className = `text-gray-300 hover:text-white ${isFirst ? 'disabled-icon' : ''}`;
    moveUpBtn.disabled = isFirst;
    moveUpBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`;
    moveUpBtn.onclick = () => movePreset(preset.id, 'up');
    actionsDiv.appendChild(moveUpBtn);

    const moveDownBtn = document.createElement('button');
    moveDownBtn.className = `text-gray-300 hover:text-white ${isLast ? 'disabled-icon' : ''}`;
    moveDownBtn.disabled = isLast;
    moveDownBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`;
    moveDownBtn.onclick = () => movePreset(preset.id, 'down');
    actionsDiv.appendChild(moveDownBtn);


    // Nút Nhân bản
    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'text-gray-300 hover:text-white';
    duplicateBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    duplicateBtn.onclick = () => duplicatePreset(preset.id);
    actionsDiv.appendChild(duplicateBtn);

    // Nút Xóa
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-red-400 hover:text-red-500';
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
    deleteBtn.onclick = () => showConfirmModal('delete', preset.id, preset.name);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(actionsDiv);
    presetList.appendChild(li);
  });
}

// --- Core App Logic ---
function applyPreset(content) {
  suffixInput.value = content;
  autoResizeTextareas();
}

function autoResizeTextareas() {
  baseInput.style.height = 'auto';
  suffixInput.style.height = 'auto';
  const baseHeight = baseInput.scrollHeight;
  const suffixHeight = suffixInput.scrollHeight;
  const maxHeight = Math.max(baseHeight, suffixHeight);
  baseInput.style.height = `${maxHeight}px`;
  suffixInput.style.height = `${maxHeight}px`;
}

function clearInputFields() {
  baseInput.value = '';
  suffixInput.value = '';
  autoResizeTextareas();
  outputArea.value = '';
}

/**
 * UPDATED FUNCTION
 * Generates the output based on the base and suffix inputs.
 * It now supports a placeholder '@' to specify the insertion point.
 */
function generateOutput() {
  const baseText = baseInput.value.trim() || baseInput.placeholder.trim();
  const suffixText = suffixInput.value.trim() || suffixInput.placeholder.trim();

  if (!baseText || !suffixText) {
    outputArea.value = "Vui lòng nhập đầy đủ từ gốc và danh sách từ thêm.";
    return;
  }

  const baseParts = baseText.split('=');
  if (baseParts.length !== 2) {
    outputArea.value = "Từ gốc không đúng định dạng. Vui lòng sử dụng 'Từ=Dịch'.";
    return;
  }
  let [basePart1, basePart2] = baseParts;

  const suffixLines = suffixText.split('\n').filter(line => line.trim() !== '');
  let combinedLines = [];

  // Check if the placeholder '@' exists in the base text
  const placeholderExists = basePart1.includes('@') || basePart2.includes('@');

  for (const line of suffixLines) {
    const suffixParts = line.split('=');
    if (suffixParts.length === 2) {
      const [suffixPart1, suffixPart2] = suffixParts;

      let combinedPart1, combinedPart2;

      if (placeholderExists) {
        // New logic: If placeholder exists, replace it.
        // User controls spacing around @ in the base input.
        combinedPart1 = basePart1.replace('@', suffixPart1.trim());
        combinedPart2 = basePart2.replace('@', suffixPart2.trim());
      } else {
        // Original logic: append to the end for backward compatibility.
        combinedPart1 = basePart1.trim() + suffixPart1.trim();
        combinedPart2 = (basePart2.trim() + ' ' + suffixPart2.trim()).trim();
      }
      combinedLines.push(`${combinedPart1}=${combinedPart2}`);
    }
  }
  outputArea.value = combinedLines.join('\n');
}

function toggleDollarSign() {
  const currentOutput = outputArea.value;
  if (!currentOutput) return;
  const lines = currentOutput.split('\n');
  const newLines = lines.map(line => line.startsWith('$') ? line.substring(1) : '$' + line);
  outputArea.value = newLines.join('\n');
}

function copyOutput() {
  const outputText = outputArea.value;
  if (outputText) {
    outputArea.select();
    document.execCommand('copy');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Đã sao chép!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove('copied');
    }, 2000);
  }
}

// --- Custom Modal Functions ---
function showPresetModal(mode, presetId = null) {
  presetModal.classList.add('show');
  editingPresetId = presetId;

  if (mode === 'add') {
    modalTitle.textContent = "Thêm bộ cài sẵn mới";
    presetNameInput.value = "";
    presetContentInput.value = "";
  } else if (mode === 'edit') {
    const presetToEdit = presets.find(p => p.id === presetId);
    if (presetToEdit) {
      modalTitle.textContent = "Chỉnh sửa bộ cài sẵn";
      presetNameInput.value = presetToEdit.name;
      presetContentInput.value = presetToEdit.content;
    }
  }
}

function hidePresetModal() {
  presetModal.classList.remove('show');
  editingPresetId = null;
}

function handleSavePreset() {
  const name = presetNameInput.value.trim();
  const content = presetContentInput.value.trim();

  if (!name || !content) {
    // Using a simple message box instead of alert()
    showTemporaryMessage("Vui lòng nhập tên và nội dung cho bộ cài sẵn.", "bg-red-500");
    return;
  }

  if (editingPresetId) {
    updatePreset(editingPresetId, name, content);
  } else {
    addPreset(name, content);
  }

  hidePresetModal();
}

function showConfirmModal(action, id = null, name = '') {
  confirmModal.classList.add('show');
  confirmAction = { action, id };
  if (action === 'delete') {
    confirmMessage.textContent = `Bạn có chắc chắn muốn xóa bộ cài sẵn "${name}" không?`;
    actionConfirmBtn.textContent = 'Xóa';
    actionConfirmBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    actionConfirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
  } else if (action === 'deleteAll') {
    confirmMessage.textContent = `Bạn có chắc chắn muốn xóa tất cả các bộ cài sẵn không?`;
    actionConfirmBtn.textContent = 'Xóa tất cả';
    actionConfirmBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    actionConfirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
  } else if (action === 'resetPresets') {
    confirmMessage.textContent = `Bạn có chắc chắn muốn đặt lại danh sách bộ cài sẵn về mặc định không? Các bộ cài sẵn hiện tại sẽ bị xóa.`;
    actionConfirmBtn.textContent = 'Đặt lại';
    actionConfirmBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
    actionConfirmBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
  }
}

function hideConfirmModal() {
  confirmModal.classList.remove('show');
  confirmAction = null;
}

function showTemporaryMessage(message, bgColor) {
  const messageBox = document.createElement('div');
  messageBox.className = `fixed bottom-4 left-1/2 -translate-x-1/2 p-4 rounded-lg text-white font-bold transition-opacity duration-300 ${bgColor}`;
  messageBox.textContent = message;
  document.body.appendChild(messageBox);
  setTimeout(() => {
    messageBox.remove();
  }, 3000);
}

// --- Event Listeners and Initial Load ---
generateBtn.addEventListener('click', generateOutput);
dollarBtn.addEventListener('click', toggleDollarSign);
copyBtn.addEventListener('click', copyOutput);
baseInput.addEventListener('input', autoResizeTextareas);
suffixInput.addEventListener('input', autoResizeTextareas);
clearInputBtn.addEventListener('click', clearInputFields);


addPresetBtn.addEventListener('click', () => showPresetModal('add'));
deleteAllPresetsBtn.addEventListener('click', () => showConfirmModal('deleteAll'));
resetPresetsBtn.addEventListener('click', () => showConfirmModal('resetPresets'));
exportPresetsBtn.addEventListener('click', exportPresets);
importPresetsBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importPresets);
saveModalBtn.addEventListener('click', handleSavePreset);
cancelModalBtn.addEventListener('click', hidePresetModal);

actionConfirmBtn.addEventListener('click', () => {
  if (confirmAction) {
    if (confirmAction.action === 'delete') {
      deletePreset(confirmAction.id);
    } else if (confirmAction.action === 'deleteAll') {
      deleteAllPresets();
    } else if (confirmAction.action === 'resetPresets') {
      resetPresetsToDefault();
    }
  }
  hideConfirmModal();
});

cancelConfirmBtn.addEventListener('click', hideConfirmModal);

window.addEventListener('load', () => {
  loadPresetsFromLocalStorage();
  autoResizeTextareas();
});
