import DOMElements from './dom.js';

export let nameDictionary = new Map();
export let temporaryNameDictionary = new Map();

export function initializeNameList(state) {
    loadNameDictionaryFromStorage();
    renderNameList();
    buildMasterKeySet(state);

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

        if (DOMElements.inputText.value.trim()) {
            document.getElementById('translate-btn').click();
        }
    });

    DOMElements.nameListDeleteBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn xóa toàn bộ Bảng Thuật Ngữ? Hành động này không thể hoàn tác.')) {
            nameDictionary.clear();
            saveNameDictionaryToStorage();
            renderNameList();
            buildMasterKeySet(state);
            if (DOMElements.inputText.value.trim()) {
                document.getElementById('translate-btn').click();
            }
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
        if (parts.length === 2) {
            const key = parts[0].trim();
            const value = parts[1].trim();
            if (key) dictionary.set(key, value);
        }
    });
    return dictionary;
}

export function renderNameList() {
    if (nameDictionary.size === 0) {
        DOMElements.nameListTextarea.value = '';
        return;
    }
    const sortedNames = [...nameDictionary.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
    state.masterKeySet = new Set([...nameDictionary.keys()]);
    state.dictionaries.forEach(d => {
        d.dict.forEach((_, key) => state.masterKeySet.add(key));
    });
    console.log(`Master key set rebuilt with ${state.masterKeySet.size} unique keys.`);
}