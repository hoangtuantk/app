import DOMElements from './dom.js';
import { initializeDictionaries } from './dictionary.js';
import { initializeNameList } from './nameList.js';
import { initializeModal } from './modal.js';
import { performTranslation } from './translation.js';

document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        dictionaries: null,
        masterKeySet: new Set(),
    };

    state.dictionaries = await initializeDictionaries(DOMElements.loaderText);
    initializeNameList(state);
    initializeModal(state);
    
    DOMElements.loaderText.textContent = `Sẵn sàng!`;
    setTimeout(() => { DOMElements.loader.style.display = 'none'; }, 500);

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