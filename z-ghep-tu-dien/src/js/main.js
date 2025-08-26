import { dom } from './m_dom.js';
import { loadHanVietData, processText } from './m_processor.js';
import { processLargeFile, downloadFile } from './m_fileHandler.js';

// --- State ---
let hanVietMap = new Map();

// --- Initialization ---
async function initialize() {
  hanVietMap = await loadHanVietData('data/HanViet.txt');
  setupEventListeners();
  updateFooterYear();
  console.log("Ứng dụng đã sẵn sàng!");
}

// --- UI Logic ---
function updateFooterYear() {
  dom.currentYear.textContent = new Date().getFullYear();
}

function processInputText() {
  const result = processText(dom.inputText.value, hanVietMap);
  dom.outputText.value = result;
}

// --- Event Setup ---
function setupEventListeners() {
  // Input/Output listeners
  dom.inputText.addEventListener('input', processInputText);

  dom.btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      dom.inputText.value = text;
      processInputText();
    } catch (err) {
      alert('Không thể dán nội dung. Trình duyệt của bạn có thể không hỗ trợ.');
    }
  });

  dom.btnClear.addEventListener('click', () => {
    dom.inputText.value = '';
    dom.outputText.value = '';
  });

  dom.btnCopy.addEventListener('click', () => {
    if (!dom.outputText.value) return;
    navigator.clipboard.writeText(dom.outputText.value)
      .then(() => alert('Đã sao chép vào clipboard!'))
      .catch(() => alert('Sao chép thất bại.'));
  });

  // Modal listeners
  dom.btnOpenModal.addEventListener('click', () => dom.modal.style.display = 'flex');
  dom.btnCloseModal.addEventListener('click', () => dom.modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === dom.modal) {
      dom.modal.style.display = 'none';
    }
  });

  // File handling listeners
  dom.btnSelectFile.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });

  // Drag and Drop listeners
  dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropZone.classList.add('drag-over');
  });
  dom.dropZone.addEventListener('dragleave', () => {
    dom.dropZone.classList.remove('drag-over');
  });
  dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  });
}

// --- File Processing Logic ---
async function handleFile(file) {
  if (hanVietMap.size === 0) {
    alert("Dữ liệu Hán Việt chưa được tải xong. Vui lòng thử lại sau giây lát.");
    return;
  }

  // Reset and show progress UI
  dom.progressContainer.style.display = 'block';
  dom.progressFilename.textContent = `Đang xử lý: ${file.name}`;
  updateProgress(0);

  try {
    const processedContent = await processLargeFile(file, hanVietMap, updateProgress);
    downloadFile(processedContent, file.name);
  } catch (error) {
    console.error("Lỗi khi xử lý file:", error);
    alert("Đã xảy ra lỗi khi xử lý file. Vui lòng kiểm tra console.");
  } finally {
    // Hide modal and reset UI after a short delay
    setTimeout(() => {
      dom.modal.style.display = 'none';
      dom.progressContainer.style.display = 'none';
      dom.fileInput.value = ''; // Reset input for next selection
    }, 1000);
  }
}

function updateProgress(percentage) {
  dom.progressBarFill.style.width = `${percentage}%`;
  dom.progressPercent.textContent = `${Math.round(percentage)}%`;
}

// --- Start the application ---
initialize();