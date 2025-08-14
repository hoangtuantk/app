import DOMElements from './dom.js';
import { initializeDictionaries, clearAllDictionaries, loadDictionariesFromFile, loadDictionariesFromServer } from './dictionary.js';
import { initializeNameList, buildMasterKeySet } from './nameList.js';
import { initializeModal } from './modal.js';
import { performTranslation } from './translation.js';

document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        dictionaries: null,
        masterKeySet: new Set(),
    };

    // Vô hiệu hóa loader ban đầu
    DOMElements.loader.style.display = 'none';

    // Cập nhật state sau khi có từ điển mới
    const updateState = (newDicts) => {
        state.dictionaries = newDicts;
        initializeNameList(state);
        initializeModal(state);
        // Bật các nút chức năng sau khi có từ điển
        DOMElements.translateBtn.disabled = false;
        DOMElements.modeToggle.disabled = false;
    };

    // Load từ điển đã có sẵn trong IndexedDB (nếu có)
    const db = await initializeDictionaries();
    if (db) {
        updateState(db);
    }

    // Kết nối các nút mới
    DOMElements.importLocalBtn.addEventListener('click', () => {
        DOMElements.logModal.classList.remove('hidden');
        DOMElements.fileImporter.click();
    });
    
    DOMElements.fileImporter.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            const newDicts = await loadDictionariesFromFile(files, (log) => DOMElements.logList.innerHTML += `<li>${log}</li>`);
            updateState(newDicts);
        }
        e.target.value = null; // Reset input file
    });

    DOMElements.importServerBtn.addEventListener('click', async () => {
        DOMElements.logModal.classList.remove('hidden');
        DOMElements.logList.innerHTML = ''; // Clear previous logs
        const newDicts = await loadDictionariesFromServer((log) => DOMElements.logList.innerHTML += `<li>${log}</li>`);
        updateState(newDicts);
    });

    DOMElements.clearDbBtn.addEventListener('click', async () => {
        if (confirm('Bạn có chắc muốn xóa toàn bộ từ điển đã lưu? Hành động này không thể hoàn tác.')) {
            await clearAllDictionaries();
            alert('Đã xóa dữ liệu từ điển. Vui lòng nhập lại từ điển.');
            // Reset trạng thái
            state.dictionaries = null;
            state.masterKeySet = new Set();
            DOMElements.outputPanel.textContent = 'Kết quả sẽ hiện ở đây...';
            // Vô hiệu hóa các nút chức năng
            DOMElements.translateBtn.disabled = true;
            DOMElements.modeToggle.disabled = true;
        }
    });

    DOMElements.closeLogModalBtn.addEventListener('click', () => {
        DOMElements.logModal.classList.add('hidden');
        DOMElements.logList.innerHTML = '';
    });

    // Kích hoạt nút dịch để bắt đầu quá trình dịch
    DOMElements.translateBtn.addEventListener('click', () => performTranslation(state));
    
    DOMElements.clearBtn.addEventListener('click', () => {
        DOMElements.inputText.value = '';
        DOMElements.outputPanel.textContent = 'Kết quả sẽ hiện ở đây...';
    });




    // Trong phần xử lý sự kiện click của nút copyBtn
    DOMElements.copyBtn.addEventListener('click', () => {
        const outputPanel = DOMElements.outputPanel;
        if (outputPanel.textContent.trim().length === 0 || outputPanel.textContent.trim() === 'Kết quả sẽ hiện ở đây...') {
            return;
        }

        // Tạo một phạm vi chọn mới
        const range = document.createRange();
        range.selectNodeContents(outputPanel);
        
        // Xóa các lựa chọn hiện có
        const selection = window.getSelection();
        selection.removeAllRanges();
        
        // Thêm phạm vi mới
        selection.addRange(range);

        try {
            // Thực hiện sao chép
            document.execCommand('copy');
            
            // Thông báo sao chép thành công
            const originalText = DOMElements.copyBtn.textContent;
            DOMElements.copyBtn.textContent = 'Đã sao chép!';
            DOMElements.copyBtn.disabled = true;
            
            setTimeout(() => {
                DOMElements.copyBtn.textContent = originalText;
                DOMElements.copyBtn.disabled = false;
            }, 300);
        } catch (err) {
            console.error('Không thể sao chép tự động:', err);
            outputPanel.focus();
            document.execCommand('selectAll');
        }

    });
    
    DOMElements.modeToggle.addEventListener('change', () => performTranslation(state));

    let currentFontSize = parseInt(localStorage.getItem('translatorFontSize') || '18');
    const baseFontSize = 18;

    const updateFontSize = () => {
        DOMElements.outputPanel.style.fontSize = `${currentFontSize}px`;
        const percent = Math.round((currentFontSize / baseFontSize) * 100);
        DOMElements.fontSizeLabel.textContent = `${percent}%`;
        localStorage.setItem('translatorFontSize', currentFontSize);
    };

    DOMElements.increaseFontBtn.addEventListener('click', () => {
        currentFontSize += 1;
        updateFontSize();
    });

    DOMElements.decreaseFontBtn.addEventListener('click', () => {
        if (currentFontSize > 8) {
            currentFontSize -= 1;
            updateFontSize();
        }
    });

    updateFontSize();
});