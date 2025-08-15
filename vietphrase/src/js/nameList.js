import DOMElements from './dom.js';
import { customConfirm } from './dialog.js';
import { performTranslation } from './translation.js';

export let nameDictionary = new Map();
export let temporaryNameDictionary = new Map();

function renderSortedNameList(sortType = 'newest') {
    if (nameDictionary.size === 0) {
        DOMElements.nameListTextarea.value = '';
        return;
    }

    let sortedEntries;
    const entries = Array.from(nameDictionary.entries());

    switch (sortType) {
        case 'oldest':
            sortedEntries = entries.reverse();
            break;
        case 'vn-az':
            sortedEntries = entries.sort((a, b) => a[1].localeCompare(b[1], 'vi'));
            break;
        case 'vn-za':
            sortedEntries = entries.sort((a, b) => b[1].localeCompare(a[1], 'vi'));
            break;
        case 'cn-az':
            sortedEntries = entries.sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'));
            break;
        case 'cn-za':
            sortedEntries = entries.sort((a, b) => b[0].localeCompare(a[0], 'zh-CN'));
            break;
        case 'newest':
        default:
            sortedEntries = entries;
            break;
    }

    const text = sortedEntries.map(([cn, vn]) => `${cn}=${vn}`).join('\n');
    DOMElements.nameListTextarea.value = text;
}


export function initializeNameList(state) {
    loadNameDictionaryFromStorage();
    renderNameList();
    buildMasterKeySet(state);

    const sortBtn = document.getElementById('name-list-sort-btn');
    const sortDropdown = document.getElementById('name-list-sort-dropdown');

    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('hidden');
    });

    document.querySelectorAll('.sort-option').forEach(button => {
        button.addEventListener('click', () => {
            const sortType = button.dataset.sort;
            renderSortedNameList(sortType);
            sortDropdown.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!sortBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
            sortDropdown.classList.add('hidden');
        }
    });

    DOMElements.nameListSaveBtn.addEventListener('click', () => {
        const text = DOMElements.nameListTextarea.value;
        nameDictionary = parseDictionary(text);
        saveNameDictionaryToStorage();
        buildMasterKeySet(state);

        const originalText = DOMElements.nameListSaveBtn.textContent;
        DOMElements.nameListSaveBtn.textContent = 'Đã lưu!';
        DOMElements.nameListSaveBtn.disabled = true;
        setTimeout(() => {
            DOMElements.nameListSaveBtn.textContent = originalText;
    
             DOMElements.nameListSaveBtn.disabled = false;
        }, 1500);
        performTranslation(state, { forceText: state.lastTranslatedText });
    });
    DOMElements.nameListDeleteBtn.addEventListener('click', async () => {
        if (await customConfirm('Bạn có chắc muốn xóa toàn bộ Bảng Thuật Ngữ? Hành động này không thể hoàn tác.')) {
            nameDictionary.clear();
            saveNameDictionaryToStorage();
            renderNameList();
            buildMasterKeySet(state);
            performTranslation(state, { forceText: state.lastTranslatedText });
        }
 
    });

    DOMElements.nameListExportBtn.addEventListener('click', () => {
        const text = DOMElements.nameListTextarea.value;
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'NameList.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    });
    DOMElements.nameListImportBtn.addEventListener('click', () => DOMElements.nameListFileInput.click());
    DOMElements.nameListFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                DOMElements.nameListTextarea.value = event.target.result;
                DOMElements.nameListSaveBtn.click();
      
            };
            reader.readAsText(file);
        }
    });
}

function parseDictionary(text) {
    const dictionary = new Map();
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if (line.startsWith('#') || line.trim() === '') return;
        const parts = line.split('=');
        if (parts.length >= 2) {
            let key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key.startsWith('$')) {
                // Nếu có, loại bỏ ký tự '$' ở đầu đi
                key = key.substring(1).trim();
            }

            if (key) {
                dictionary.set(key, value);
            }
        }
    });
    return dictionary;
}

export function renderNameList() {
    if (nameDictionary.size === 0) {
        DOMElements.nameListTextarea.value = '';
        return;
    }
    const sortedNames = [...nameDictionary.entries()];
    const text = sortedNames.map(([cn, vn]) => `${cn}=${vn}`).join('\n');
    DOMElements.nameListTextarea.value = text;
}

export function saveNameDictionaryToStorage() {
    localStorage.setItem('nameDictionary', JSON.stringify(Array.from(nameDictionary.entries())));
}

function loadNameDictionaryFromStorage() {
    const stored = localStorage.getItem('nameDictionary');
    if (stored) nameDictionary = new Map(JSON.parse(stored));
}

export function buildMasterKeySet(state) {

    if (!state || !state.dictionaries) {
        console.warn("buildMasterKeySet được gọi nhưng từ điển chưa sẵn sàng.");
        state.masterKeySet = new Set([...nameDictionary.keys()]);
        return;
    }
    state.masterKeySet = new Set([...nameDictionary.keys()]);
    state.dictionaries.forEach(d => {
        d.dict.forEach((_, key) => state.masterKeySet.add(key));
    });
    console.log(`Master key set rebuilt with ${state.masterKeySet.size} unique keys.`);
}