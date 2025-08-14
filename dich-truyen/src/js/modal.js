import DOMElements from './dom.js';
import { getHanViet, translateWord, segmentText } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary, saveNameDictionaryToStorage, renderNameList, buildMasterKeySet } from './nameList.js';
import { synthesizeCompoundTranslation, performTranslation, formatVietphraseMeanings } from './translation.js';

let selectionState = {
    spans: [],
    startIndex: -1,
    endIndex: -1,
    originalText: '',
};
let isPanelVisible = false;

function applyCase(caseType) {
    const input = DOMElements.customMeaningInput;
    let text = input.value;
    if (!text) return;
    switch (caseType) {
        case 'cap': text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
        case 'upper': text = text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); break;
        case 'cap2':
            const words2 = text.split(' ');
            text = words2.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') + (words2.length > 2 ? ' ' + words2.slice(2).join(' ') : '');
            break;
        case 'lowerLast':
            const words = text.split(' ');
            if (words.length > 1) {
                text = words.slice(0, -1).join(' ') + ' ' + words[words.length - 1].toLowerCase();
            }
            break;
        case 'hanviet-upper':
            text = text.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            break;
        case 'hanviet-lower':
            text = text.toLowerCase();
            break;
    }
    input.value = text;
}

function groupSimilarMeanings(meanings, state) {
    // Nếu mảng rỗng, trả về chuỗi rỗng.
    if (meanings.length === 0) {
        return '';
    }

    // Nếu chỉ có một nghĩa, trả về nghĩa đó trực tiếp.
    if (meanings.length === 1) {
        return meanings[0];
    }
    
    // Nếu có nhiều hơn một nghĩa, nối chúng bằng dấu '/' và bao quanh bằng ngoặc đơn.
    return `(${meanings.join('/')})`;
}


function closeOldModal() {
    DOMElements.editModal.style.display = 'none';
}

function showQuickEditPanel(selection, state) {
    const range = selection.getRangeAt(0);
    const allSpans = Array.from(DOMElements.outputPanel.querySelectorAll('.word'));
    const selectedSpans = allSpans.filter(span => selection.containsNode(span, true) && span.textContent.trim() !== '');

    if (selectedSpans.length === 0) {
        if (isPanelVisible) hideQuickEditPanel();
        return;
    }

    selectionState.startIndex = allSpans.indexOf(selectedSpans[0]);
    selectionState.endIndex = allSpans.indexOf(selectedSpans[selectedSpans.length - 1]);
    selectionState.spans = allSpans;
    selectionState.originalText = selectedSpans.map(s => s.dataset.original).join('');

    populateQuickEditPanel(selectionState.originalText, state);

    const rect = range.getBoundingClientRect();
    const panel = DOMElements.quickEditPanel;

    // Hiển thị panel trước để có kích thước chính xác
    panel.classList.remove('hidden');
    
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = window.scrollX + rect.left;
    let top = window.scrollY + rect.bottom + 5;

    // Điều chỉnh vị trí ngang
    if (left + panelWidth > window.scrollX + viewportWidth) {
        left = window.scrollX + viewportWidth - panelWidth - 10; // Giữ 10px lề
    }
    if (left < window.scrollX) {
        left = window.scrollX + 10; // Giữ 10px lề
    }
    
    // Điều chỉnh vị trí dọc
    if (top + panelHeight > window.scrollY + viewportHeight) {
        // Nếu không đủ chỗ ở dưới, hiển thị ở trên
        top = window.scrollY + rect.top - panelHeight - 5;
    }
    if (top < window.scrollY) {
         top = window.scrollY + 10; // Đẩy xuống nếu nó vẫn ở quá cao
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    isPanelVisible = true;
}

function populateQuickEditPanel(text, state) {
    DOMElements.qInputZw.value = text;
    const hanViet = getHanViet(text, state.dictionaries);
    if (hanViet && !/^[0-9a-zA-Z\s.,;:!?()]+$/.test(hanViet)) {
        DOMElements.qInputHv.value = hanViet.toLowerCase();
        DOMElements.qInputHV.value = hanViet.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
        DOMElements.qInputHv.value = '';
        DOMElements.qInputHV.value = '';
    }
    
    const translation = translateWord(text, state.dictionaries, nameDictionary, temporaryNameDictionary);
    let allMeanings = translation.found ? [...translation.all] : [];
    
    if (text.length > 1) {
        const synthesized = synthesizeCompoundTranslation(text, state);
        if (synthesized.length > 0) {
            // Khi có từ ghép, chúng ta sẽ định dạng từng từ riêng lẻ rồi nối lại.
            const formattedMeanings = synthesized.map(meanings => formatVietphraseMeanings(meanings));
            DOMElements.qInputVp.value = formattedMeanings.join(' ');
            DOMElements.qInputTc.value = ''; // Xóa giá trị cũ
            return;
        }
    }
    
    // Nếu không có từ ghép, hoặc từ chỉ có một nghĩa, sử dụng logic ban đầu.
    DOMElements.qInputVp.value = formatVietphraseMeanings(allMeanings);
    DOMElements.qInputTc.value = '';
}


function hideQuickEditPanel() {
    if (isPanelVisible) {
        DOMElements.quickEditPanel.classList.add('hidden');
        isPanelVisible = false;
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }
}


function expandQuickSelection(direction, state) {
    const { spans, startIndex, endIndex } = selectionState;
    let newStart = startIndex, newEnd = endIndex;
    if (direction === 'left' && startIndex > 0) newStart--;
    else if (direction === 'right' && endIndex < spans.length - 1) newEnd++;
    else return;

    const newRange = document.createRange();
    newRange.setStartBefore(spans[newStart]);
    newRange.setEndAfter(spans[newEnd]);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    showQuickEditPanel(selection, state);
}


function populateOldModal(text, state) {
    DOMElements.originalWordEl.textContent = text;
    const hanVietContainer = DOMElements.hanvietOptionsContainer;
    hanVietContainer.innerHTML = '';
    const baseHanViet = getHanViet(text, state.dictionaries);
    if (baseHanViet && !/^[0-9a-zA-Z\s.,;:!?()]+$/.test(baseHanViet)) {
        const hanVietUpper = baseHanViet.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const hanVietLower = baseHanViet.toLowerCase();
        [hanVietUpper, hanVietLower].forEach(hv => {
            const btn = document.createElement('button');
            btn.className = 'meaning-option p-2 rounded cursor-pointer text-sm';
            btn.textContent = hv;
            btn.onclick = () => { DOMElements.customMeaningInput.value = hv; };
            hanVietContainer.appendChild(btn);
        });
    } else {
        hanVietContainer.innerHTML = `<p class="text-sm italic">Không tìm thấy Hán Việt.</p>`;
    }
    
    const finalTranslation = translateWord(text, state.dictionaries, nameDictionary, temporaryNameDictionary);
    let allMeanings = finalTranslation.found ? [...finalTranslation.all] : [];
    if (text.length > 1) {
        const synthesized = synthesizeCompoundTranslation(text, state);
        synthesized.forEach(m => { if (!allMeanings.includes(m)) allMeanings.push(m); });
    }

    DOMElements.meaningsContainer.innerHTML = '';
    if (allMeanings.length > 0) {
        allMeanings.forEach(meaning => {
            const div = document.createElement('div');
            div.className = 'meaning-option p-2 rounded cursor-pointer';
            div.textContent = meaning;
            div.onclick = () => { DOMElements.customMeaningInput.value = meaning; };
            DOMElements.meaningsContainer.appendChild(div);
        });
        DOMElements.customMeaningInput.value = allMeanings[0];
    } else {
        DOMElements.meaningsContainer.innerHTML = `<p class="text-sm italic text-center p-2">Không tìm thấy.</p>`;
        DOMElements.customMeaningInput.value = text;
    }
}

function openOldModal(state) {
    const text = selectionState.originalText;
    DOMElements.originalWordEl.textContent = text;
    
    populateOldModal(text, state);

    hideQuickEditPanel();
    DOMElements.editModal.style.display = 'flex';
}

function expandOldModalSelection(direction, state) {
    const { spans, startIndex, endIndex } = selectionState;
    let newStartIdx = startIndex, newEndIdx = endIndex;
    if (direction === 'left' && startIndex > 0) newStartIdx--;
    else if (direction === 'right' && endIndex < spans.length - 1) newEndIdx++;
    else return;

    selectionState.startIndex = newStartIdx;
    selectionState.endIndex = newEndIdx;
    selectionState.originalText = selectionState.spans.slice(newStartIdx, newEndIdx + 1).map(s => s.dataset.original).join('');
    
    populateOldModal(selectionState.originalText, state);
}

export function initializeModal(state) {
    document.addEventListener('pointerup', (e) => {
        const outputPanel = DOMElements.outputPanel;
        const quickEditPanel = DOMElements.quickEditPanel;

        if (!outputPanel.contains(e.target) || quickEditPanel.contains(e.target)) {
            return;
        }

        setTimeout(() => {
            const selection = window.getSelection();
            const targetSpan = e.target.closest('.word');

            // Logic mới: Chỉ hiển thị panel nếu nhấp vào một từ và không có lựa chọn nào.
            if (targetSpan && selection.isCollapsed) {
                // Tạo một lựa chọn mới chỉ chứa từ được nhấp vào
                const range = document.createRange();
                range.selectNode(targetSpan);
                selection.removeAllRanges();
                selection.addRange(range);
                showQuickEditPanel(selection, state);
                return;
            }

            // Ẩn panel nếu có lựa chọn nhưng không phải do nhấp chuột đơn
            // Hoặc nhấp chuột ra ngoài panel
            if (isPanelVisible) {
                hideQuickEditPanel();
            }

        }, 50);  
    });

    DOMElements.qExpandLeftBtn.addEventListener('click', () => expandQuickSelection('left', state));
    DOMElements.qExpandRightBtn.addEventListener('click', () => expandQuickSelection('right', state));
    DOMElements.qAddNameBtn.addEventListener('click', () => openOldModal(state));

    DOMElements.qSearchBtn.addEventListener('click', () => {
        const text = DOMElements.qInputZw.value.trim();
        if(text) window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
    });
    DOMElements.qCopyBtn.addEventListener('click', () => {
        const text = DOMElements.qInputZw.value.trim();
        if(text) navigator.clipboard.writeText(text);
    });

    document.querySelectorAll('.q-temp-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetInputId = e.target.dataset.target;
            const text = document.getElementById(targetInputId).value;
            if (text && selectionState.originalText) {
                temporaryNameDictionary.set(selectionState.originalText, text);
                performTranslation(state);
                hideQuickEditPanel();
            }
        });
    });

    document.querySelectorAll('.q-perm-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const zwText = DOMElements.qInputZw.value.trim();
            const targetInputId = e.target.dataset.target;
            const vnText = document.getElementById(targetInputId).value.trim();
            if (zwText && vnText) {
                nameDictionary.set(zwText, vnText);
                saveNameDictionaryToStorage();
                renderNameList();
                buildMasterKeySet(state);
                performTranslation(state);
                hideQuickEditPanel();
            }
        });
    });

    DOMElements.cancelEditBtn.addEventListener('click', closeOldModal);
    DOMElements.editModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.editModal) closeOldModal();
    });
    DOMElements.expandLeftBtn.addEventListener('click', () => expandOldModalSelection('left', state));
    DOMElements.expandRightBtn.addEventListener('click', () => expandOldModalSelection('right', state));

    DOMElements.addToNameListBtn.addEventListener('click', () => {
        const cn = DOMElements.originalWordEl.textContent;
        const vn = DOMElements.customMeaningInput.value.trim();
        if (cn && vn) { nameDictionary.set(cn, vn); saveNameDictionaryToStorage(); renderNameList(); buildMasterKeySet(state); closeOldModal(); performTranslation(state); }
    });
    DOMElements.addTempBtn.addEventListener('click', () => {
        const cn = DOMElements.originalWordEl.textContent;
        const vn = DOMElements.customMeaningInput.value.trim();
        if (cn && vn) { temporaryNameDictionary.set(cn, vn); closeOldModal(); performTranslation(state); }
    });
    document.querySelectorAll('.case-btn').forEach(btn => {
        btn.addEventListener('click', (e) => applyCase(e.target.dataset.case));
    });
}