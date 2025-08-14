import DOMElements from './dom.js';

// --- HẰNG SỐ VÀ CẤU HÌNH ---
const DB_NAME = 'VietphraseDB';
const DB_VERSION = 2;
const STORE_NAME = 'dictionaryStore';
const HAN_VIET_DICT_NAME = 'ChinesePhienAmWords.txt';

let db;

// --- CÁC HÀM HỖ TRỢ LÀM VIỆC VỚI INDEXEDDB ---
async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject("Lỗi khi mở IndexedDB.");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function saveDataToDB(db, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data);
        request.onerror = () => reject("Không thể lưu dữ liệu vào DB.");
        request.onsuccess = () => resolve();
    });
}

async function getDataFromDB(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onerror = () => reject("Không thể đọc dữ liệu từ DB.");
        request.onsuccess = () => resolve(request.result);
    });
}

// --- LOGIC TẢI DỮ LIỆU TỪ FILE CỤC BỘ VÀ LƯU VÀO DB ---
async function loadLocalAndSave(loaderElement) {
    const dictionaryFiles = [
        { name: 'Names.txt', priority: 2 },
        { name: 'Vietphrase.txt', priority: 3 },
        { name: 'Babylon.txt', priority: 4 },
        { name: 'ChinesePhienAmEnglishWords.txt', priority: 4 },
        { name: HAN_VIET_DICT_NAME, priority: 4 },
        { name: 'IgnoredChinesePhrases.txt', priority: 4 },
        { name: 'LacViet.txt', priority: 4 },
        { name: 'LuatNhan.txt', priority: 4 },
        { name: 'Pronouns.txt', priority: 4 },
        { name: 'ThieuChuu.txt', priority: 4 },
    ];
    
/*  
    for (let i = 2; i >= 2; i--) {
        dictionaryFiles.unshift({ name: `Names${i}.txt`, priority: 1 });
   }
*/
    dictionaryFiles.unshift({ name: 'Names2.txt', priority: 1 });


    loaderElement.textContent = 'Đang tải các file từ điển cục bộ...';
    const dictionaries = new Map();

    for (const fileInfo of dictionaryFiles) {
        try {
            const response = await fetch(`./data/${fileInfo.name}`);
            if (response.ok) {
                const content = await response.text();
                dictionaries.set(fileInfo.name, {
                    priority: fileInfo.priority,
                    dict: parseDictionary(content),
                });
            }
        } catch (error) {
            console.error(`Lỗi khi tải file cục bộ ${fileInfo.name}:`, error);
        }
    }

    // Lưu từ điển đã được tải vào IndexedDB
    await saveDataToDB(db, { id: 'dictionaries', data: Object.fromEntries(dictionaries) });

    return dictionaries;
}

// --- HÀM CHÍNH KHỞI TẠO TỪ ĐIỂN ---
export async function initializeDictionaries(loaderElement) {
    try {
        db = await openDB();
        loaderElement.textContent = 'Kiểm tra bộ nhớ cache...';

        const cachedData = await getDataFromDB(db, 'dictionaries');
        if (cachedData && cachedData.data) {
            loaderElement.textContent = 'Đang tải từ điển từ bộ nhớ cache...';
            const dictionariesMap = new Map(Object.entries(cachedData.data));
            return dictionariesMap;
        }

        // Nếu không có trong cache, tải từ file cục bộ và lưu vào DB
        const dictionaries = await loadLocalAndSave(loaderElement);
        return dictionaries;
    } catch (error) {
        console.error("Lỗi khởi tạo từ điển:", error);
        loaderElement.textContent = `Lỗi: ${error.message}`;
        if (DOMElements && DOMElements.loader) {
            DOMElements.loader.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
        }
        return new Map();
    }
}

// --- CÁC HÀM CÒN LẠI (GIỮ NGUYÊN) ---
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

export function getTranslationFromPrioritizedDicts(word, dictionaries) {
    const sortedDicts = [...dictionaries.values()].sort((a, b) => a.priority - b.priority);
    for (const dictInfo of sortedDicts) {
        if (dictInfo.dict.has(word)) return dictInfo.dict.get(word);
    }
    return null;
}

export function getHanViet(word, dictionaries) {
    const hanVietDict = dictionaries.get(HAN_VIET_DICT_NAME)?.dict;
    if (!word || !hanVietDict) {
        return null;
    }
    const getSingleCharHanViet = (char) => {
        if (hanVietDict.has(char)) {
            return hanVietDict.get(char).split('/')[0].split(';')[0].trim();
        }
        return char;
    };
    const tokens = word.match(/[\u4e00-\u9fa5]+|[^\u4e00-\u9fa5]+/g) || [];
    const translatedTokens = tokens.map(token => {
        if (/[\u4e00-\u9fa5]/.test(token)) {
            return [...token].map(getSingleCharHanViet).join(' ');
        } else {
            return token;
        }
    });
    return translatedTokens.join(' ');
}

export function segmentText(text, masterKeySet) {
    const segments = [];
    let currentIndex = 0;
    const textLength = text.length;
    const maxLen = 10;

    while (currentIndex < textLength) {
        if (!/[\u4e00-\u9fa5]/.test(text[currentIndex])) {
            let nonChineseBlock = '';
            let i = currentIndex;
            while (i < textLength && !/[\u4e00-\u9fa5]/.test(text[i])) {
                nonChineseBlock += text[i];
                i++;
            }
            segments.push(nonChineseBlock);
            currentIndex += nonChineseBlock.length;
            continue;
        }

        let foundWord = null;
        for (let len = Math.min(maxLen, textLength - currentIndex); len > 0; len--) {
            const potentialWord = text.substr(currentIndex, len);
            if (masterKeySet.has(potentialWord)) {
                foundWord = potentialWord;
                break;
            }
        }
        
        if (foundWord) {
            segments.push(foundWord);
            currentIndex += foundWord.length;
        } else {
            segments.push(text[currentIndex]);
            currentIndex++;
        }
    }
    return segments;
}

export function translateWord(word, dictionaries, nameDict, tempDict) {
    let meaningsStr = tempDict.get(word) || nameDict.get(word) || getTranslationFromPrioritizedDicts(word, dictionaries) || word;
    if (meaningsStr === word && !getTranslationFromPrioritizedDicts(word, dictionaries)) {
         return { best: word, all: [word], found: false };
    }
    const allMeaningsFlat = meaningsStr.split(';').flatMap(m => m.split('/')).map(m => m.trim()).filter(Boolean);
    const bestMeaning = allMeaningsFlat[0] || word;
    return { best: bestMeaning, all: allMeaningsFlat, found: true };
}