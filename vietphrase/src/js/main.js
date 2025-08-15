import DOMElements from './dom.js';
import { initializeDictionaries, clearAllDictionaries, loadDictionariesFromFile, loadDictionariesFromServer } from './dictionary.js';
import { customAlert, customConfirm } from './dialog.js';
import { initializeNameList, buildMasterKeySet } from './nameList.js';
import { initializeModal } from './modal.js';
import { performTranslation } from './translation.js';

function appendLog(message, type) {
    const li = document.createElement('li');
    let icon = '';

    if (type === 'loading') {
        icon = '<div class="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-accent-color spinner-icon"></div>';
    } else if (type === 'success') {
        icon = '<span>✅</span>';
    } else if (type === 'error') {
        icon = '<span>❌</span>';
    } else {
        icon = '<span>ℹ️</span>';
    }

    li.innerHTML = `${icon}<span>${message}</span>`;
    li.classList.add(`log-${type}`);
    DOMElements.logList.appendChild(li);

    DOMElements.logList.scrollTop = DOMElements.logList.scrollHeight;
    return li;
}


function updateLog(li, message, type) {
    let icon = '';
    if (type === 'success') {
        icon = '<span>✅</span>';
    } else if (type === 'error') {
        icon = '<span>❌</span>';
    } else {
        icon = '<span>ℹ️</span>';
    }

    li.innerHTML = `${icon}<span>${message}</span>`;
    li.classList.remove('log-loading');
    li.classList.add(`log-${type}`);
}


document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        dictionaries: null,
        masterKeySet: new Set(),
        lastTranslatedText: '',
    };

    let isImporting = false;
    let importHasFinished = false;

    DOMElements.loader.style.display = 'none';

    const updateState = (newDicts) => {
        state.dictionaries = newDicts;
        if (newDicts) {
            initializeNameList(state);
            initializeModal(state);
            DOMElements.translateBtn.disabled = false;
            DOMElements.modeToggle.disabled = false;
        }
    };

    const db = await initializeDictionaries();
    if (db) {
        updateState(db);
    }
  
     DOMElements.importLocalBtn.addEventListener('click', () => {
        if (isImporting) return;
        importHasFinished = false; 
        DOMElements.logModal.classList.remove('hidden');
        DOMElements.logList.innerHTML = '';
        DOMElements.fileImporter.click();
    });
    
    DOMElements.fileImporter.addEventListener('change', async (e) => {
        if (isImporting) return;
        isImporting = true;
        DOMElements.importLocalBtn.disabled = true;
        DOMElements.importServerBtn.disabled = true;
        
        const files = e.target.files;
        if (files.length > 0) {
            const logHandler = { append: appendLog, update: updateLog };
            const newDicts = await loadDictionariesFromFile(files, logHandler);
            if (newDicts) {
                updateState(newDicts);
                importHasFinished = true;
            }
        }
        e.target.value = null;

        isImporting = false;
        DOMElements.importLocalBtn.disabled = false;
        DOMElements.importServerBtn.disabled = false;
    });

    DOMElements.importServerBtn.addEventListener('click', async () => {
        if (isImporting) return;
        importHasFinished = false;
        isImporting = true;
        DOMElements.importLocalBtn.disabled = true;
        DOMElements.importServerBtn.disabled = true;

        DOMElements.logModal.classList.remove('hidden');
        DOMElements.logList.innerHTML = '';
        const logHandler = { append: appendLog, update: updateLog };
        const newDicts = await loadDictionariesFromServer(logHandler);
        if (newDicts) {
            updateState(newDicts);
            importHasFinished = true;
        }
        
        isImporting = false;
        DOMElements.importLocalBtn.disabled = false;
        DOMElements.importServerBtn.disabled = false;      
    });

    DOMElements.clearDbBtn.addEventListener('click', async () => {
        if (await customConfirm('Bạn có chắc muốn xóa toàn bộ từ điển đã lưu? Hành động này không thể hoàn tác.')) {
            await clearAllDictionaries();
            await customAlert('Đã xóa dữ liệu từ điển. Vui lòng nhập lại từ điển.');
            location.reload(); 
        }
    });

        function closeLogModal() {
            DOMElements.logModal.classList.add('hidden');
            DOMElements.logList.innerHTML = '';
        }

        DOMElements.closeLogModalBtn.addEventListener('click', closeLogModal);
        DOMElements.logModal.addEventListener('click', (e) => {
            if (e.target === DOMElements.logModal) {
                closeLogModal();
            }
        });

    DOMElements.closeLogModalBtn.addEventListener('click', closeLogModal);
    DOMElements.logModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.logModal) {
            closeLogModal();
        }
    });
    
    DOMElements.translateBtn.addEventListener('click', () => {
        if (!state.dictionaries || state.dictionaries.size === 0) {
            customAlert('Vui lòng tải Từ Điển trước khi dịch.');
        } else {
            performTranslation(state);
        }
    });
    DOMElements.clearBtn.addEventListener('click', () => {
        DOMElements.inputText.value = '';
    });

    DOMElements.copyBtn.addEventListener('click', () => {
        const outputPanel = DOMElements.outputPanel;
        if (outputPanel.textContent.trim().length === 0 || outputPanel.textContent.trim() === 'Kết quả sẽ hiện ở đây...') {
            return;
        }

        const range = document.createRange();
        range.selectNodeContents(outputPanel);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            document.execCommand('copy');
            const originalText = DOMElements.copyBtn.textContent;
            DOMElements.copyBtn.textContent = 'Đã sao chép!';
            DOMElements.copyBtn.disabled = true;
            setTimeout(() => {
                DOMElements.copyBtn.textContent = originalText;
                DOMElements.copyBtn.disabled = false;
            }, 300);
        } catch (err) {
            console.error('Không thể sao chép tự động:', err);
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