import DOMElements from './dom.js';
import { getHanViet, translateWord, segmentText } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary, saveNameDictionaryToStorage, renderNameList, buildMasterKeySet } from './nameList.js';
import { synthesizeCompoundTranslation, performTranslation } from './translation.js';

let selectionState = {
    spans: [],
    startIndex: -1,
    endIndex: -1,
    originalText: '',
};
let isPanelVisible = false;

function updateTranslationInPlace(newText) {
    const { spans, startIndex, endIndex, originalText } = selectionState;
    if (startIndex === -1 || !spans.length) return;

    const newSpan = document.createElement('span');
    newSpan.className = 'word';
    newSpan.textContent = newText;
    newSpan.dataset.original = originalText;

    const spansToReplace = spans.slice(startIndex, endIndex + 1);
    if (spansToReplace.length === 0) return;
    const parent = spansToReplace[0].parentNode;
    parent.insertBefore(newSpan, spansToReplace[0]);
    spansToReplace.forEach(span => span.remove());

    const allCurrentSpans = Array.from(DOMElements.outputPanel.querySelectorAll('.word'));
    const newIndex = allCurrentSpans.indexOf(newSpan);

    selectionState.spans = allCurrentSpans;
    selectionState.startIndex = newIndex;
    selectionState.endIndex = newIndex;
    selectionState.originalText = newSpan.dataset.original;
}


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
    if (meanings.length <= 1) return meanings.join(' / ');
    const segments = segmentText(meanings.join(''), state.masterKeySet);
    const vpParts = segments.map(segment => {
        if (!/[\u4e00-\u9fa5]/.test(segment)) {
            return segment;
        }
        const translation = translateWord(segment, state.dictionaries, nameDictionary, temporaryNameDictionary);
        const meanings = translation.all;
        if (meanings.length > 1) {
            return `(${meanings.join('/')})`;
        } 
        else if (meanings.length === 1) {
            return meanings[0];
        } else {
            return segment;
        }
    });
    return vpParts.join(' ');
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

    const panel = DOMElements.quickEditPanel;
    const rect = range.getBoundingClientRect();

    panel.style.visibility = 'hidden';
    panel.classList.remove('hidden');
    const panelWidth = panel.offsetWidth;
    const viewportWidth = window.innerWidth;

    let leftPosition = window.scrollX + rect.left;
    if (leftPosition + panelWidth > viewportWidth) {
        leftPosition = window.scrollX + rect.right - panelWidth;
    }

    if (leftPosition < 0) {
        leftPosition = 5;
    }

    panel.style.left = `${leftPosition}px`;
    panel.style.top = `${window.scrollY + rect.bottom + 5}px`;

    panel.style.visibility = 'visible';
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
    
    const segments = segmentText(text, state.masterKeySet);
    const vietphraseParts = segments.map(segment => {
        if (!/[\u4e00-\u9fa5]/.test(segment)) {
            return segment;
        }

        const translation = translateWord(segment, state.dictionaries, nameDictionary, temporaryNameDictionary);

        if (translation.found && translation.all.length > 1) {
            return `(${translation.all.join('/')})`;
        } else if (translation.found) {
           
             return translation.best;
        } else {
            return segment;
        }
    });
    DOMElements.qInputVp.value = vietphraseParts.join(' ');

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
    selectionState.startIndex = newStart;
    selectionState.endIndex = newEnd;
    selectionState.originalText = spans.slice(newStart, newEnd + 1).map(s => s.dataset.original).join('');
    
    const newRange = document.createRange();
    newRange.setStartBefore(spans[newStart]);
    newRange.setEndAfter(spans[newEnd]);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    populateQuickEditPanel(selectionState.originalText, state);
}

function populateOldModal(text, state) {
    const originalWordInput = document.getElementById('original-word-input');
    originalWordInput.value = text;
    updateOldModalFields(text, state);
}

function openOldModal(state) {
    const text = selectionState.originalText;
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

            if (targetSpan && selection.isCollapsed) {
                const range = document.createRange();
     
                range.selectNode(targetSpan);
                selection.removeAllRanges();
                selection.addRange(range);
                showQuickEditPanel(selection, state);
                return;
             }

            
            if (isPanelVisible) {
                hideQuickEditPanel();
            }

        }, 50);  
    });

    DOMElements.qExpandLeftBtn.addEventListener('click', () => expandQuickSelection('left', state));
    DOMElements.qExpandRightBtn.addEventListener('click', () => expandQuickSelection('right', state));
    DOMElements.qAddNameBtn.addEventListener('click', () => openOldModal(state));

    const originalWordInput = document.getElementById('original-word-input');
    originalWordInput.addEventListener('input', () => {
        const newText = originalWordInput.value;
        updateOldModalFields(newText, state);
    });
    DOMElements.qSearchBtn.addEventListener('click', () => {
        const text = DOMElements.qInputZw.value.trim();
        if(text) window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
    });
    DOMElements.qCopyBtn.addEventListener('click', () => {
        const text = DOMElements.qInputZw.value.trim();
        if(text) navigator.clipboard.writeText(text);
    });
    const hanvietInput = document.getElementById('hanviet-input');
    hanvietInput.addEventListener('click', () => {
        const hanvietValue = hanvietInput.value;
        if (hanvietValue && hanvietValue !== 'Không tìm thấy Hán Việt.') {
            DOMElements.customMeaningInput.value = hanvietValue;
        }
    });

    document.querySelectorAll('.q-temp-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetInputId = e.target.dataset.target;
            const text = document.getElementById(targetInputId).value;
            if (text && selectionState.originalText) {
                temporaryNameDictionary.set(selectionState.originalText, text);
                updateTranslationInPlace(text); // THAY ĐỔI
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
                updateTranslationInPlace(vnText); // THAY ĐỔI
                hideQuickEditPanel();
            }
        });
    });
    DOMElements.editModal.addEventListener('click', (e) => {
        if (e.target === DOMElements.editModal) closeOldModal();
    });
    DOMElements.expandLeftBtn.addEventListener('click', () => expandOldModalSelection('left', state));
    DOMElements.expandRightBtn.addEventListener('click', () => expandOldModalSelection('right', state));

    DOMElements.addToNameListBtn.addEventListener('click', () => {
        const cn = document.getElementById('original-word-input').value.trim();
        const vn = DOMElements.customMeaningInput.value.trim();
        if (cn && vn) {
            nameDictionary.set(cn, vn);
            saveNameDictionaryToStorage();
            renderNameList();
            buildMasterKeySet(state);
            updateTranslationInPlace(vn); // THAY ĐỔI
            closeOldModal();
        }
    });

    DOMElements.addTempBtn.addEventListener('click', () => {
        const cn = document.getElementById('original-word-input').value.trim();
        const vn = DOMElements.customMeaningInput.value.trim();
        if (cn && vn) {
            temporaryNameDictionary.set(cn, vn);
            updateTranslationInPlace(vn); // THAY ĐỔI
            closeOldModal();
        }
    });

    document.querySelectorAll('.case-btn').forEach(btn => {
        btn.addEventListener('click', (e) => applyCase(e.target.dataset.case));

        btn.addEventListener('dblclick', () => {
            applyCase(btn.dataset.case); 
            const cn = document.getElementById('original-word-input').value.trim();
            const vn = DOMElements.customMeaningInput.value.trim();
            if (cn && vn) {
                nameDictionary.set(cn, vn);
                saveNameDictionaryToStorage();
                renderNameList();
                buildMasterKeySet(state);
                updateTranslationInPlace(vn);
                closeOldModal();

                const addButton = DOMElements.addToNameListBtn;
                const originalText = addButton.textContent;
                addButton.textContent = 'Đã lưu!';
                addButton.disabled = true;
                setTimeout(() => {
                    addButton.textContent = originalText;
                    addButton.disabled = false;
                }, 1500);
            }
        });
    });
}

function updateOldModalFields(text, state) {
    const hanvietInput = document.getElementById('hanviet-input');
    const vietphraseSelect = document.getElementById('vietphrase-select');
    const customMeaningInput = DOMElements.customMeaningInput;

    if (!text) {
        hanvietInput.value = '';
        vietphraseSelect.innerHTML = '<option>Nhập Tiếng Trung để xem gợi ý</option>';
        customMeaningInput.value = '';
        return;
    }
    
    const baseHanViet = getHanViet(text, state.dictionaries);
    hanvietInput.value = baseHanViet ? baseHanViet.toLowerCase() : 'Không tìm thấy Hán Việt.';
    const finalTranslation = translateWord(text, state.dictionaries, nameDictionary, temporaryNameDictionary);
    let allMeanings = finalTranslation.found ? [...new Set(finalTranslation.all)] : [];
    if (text.length > 1) {
        const synthesized = synthesizeCompoundTranslation(text, state);
        synthesized.forEach(m => { if (!allMeanings.includes(m)) allMeanings.push(m); });
    }

    vietphraseSelect.innerHTML = '';
    if (allMeanings.length > 0) {
        allMeanings.forEach(meaning => {
            const option = document.createElement('option');
            option.value = meaning;
            option.textContent = meaning;
            vietphraseSelect.appendChild(option);
        });
        customMeaningInput.value = allMeanings[0];
    } else {
        const option = document.createElement('option');
        option.textContent = 'Không tìm thấy Vietphrase';
        option.disabled = true;
        vietphraseSelect.appendChild(option);
        customMeaningInput.value = text;
    }

    vietphraseSelect.onchange = () => {
        customMeaningInput.value = vietphraseSelect.value;
    };
}