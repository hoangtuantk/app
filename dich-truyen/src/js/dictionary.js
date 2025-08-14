const HAN_VIET_DICT_NAME = 'ChinesePhienAmWords.txt';
const NAMES_FILES = [
    'Names9.txt', 'Names8.txt', 'Names7.txt', 'Names6.txt',
    'Names5.txt', 'Names4.txt', 'Names3.txt', 'Names2.txt', 'Names.txt'
];

const DICTIONARY_FILES = [
    ...NAMES_FILES.map(name => ({ name, priority: 1 })),
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

const REQUIRED_FILES = [
    'Vietphrase.txt',
    'Babylon.txt',
    'ChinesePhienAmEnglishWords.txt',
    HAN_VIET_DICT_NAME,
    'IgnoredChinesePhrases.txt',
    'LacViet.txt',
    'LuatNhan.txt',
    'Pronouns.txt',
    'ThieuChuu.txt',
];

// --- CÁC HÀM HỖ TRỢ LÀM VIỆC VỚI INDEXEDDB ---
const DB_NAME = 'VietphraseDB';
const STORE_NAME = 'dictionaryStore';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);
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

export async function clearAllDictionaries() {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Không thể xóa dữ liệu.');
        } catch (error) {
            reject(error);
        }
    });
}
// --- KẾT THÚC CÁC HÀM HỖ TRỢ ---


export async function initializeDictionaries() {
    try {
        const db = await openDB();
        const cachedData = await getDataFromDB(db, 'parsed-dictionaries');
        if (cachedData) {
            const dictionaries = new Map();
            cachedData.data.forEach(([name, data]) => {
                dictionaries.set(name, {
                    priority: data.priority,
                    dict: new Map(data.dict)
                });
            });
            console.log('Tải từ điển từ IndexedDB thành công.');
            return dictionaries;
        }
        console.log('Không tìm thấy từ điển đã lưu.');
        return null;
    } catch (error) {
        console.error("Lỗi khởi tạo từ điển:", error);
        return null;
    }
}

export async function loadDictionariesFromServer(logCallback) {
    logCallback('Đang tải từ điển từ server...');
    const dictionaries = new Map();
    try {
        const db = await openDB();
        
        for (const fileInfo of DICTIONARY_FILES) {
            logCallback(`Đang tải file: ${fileInfo.name}`);
            const response = await fetch(`data/${fileInfo.name}`);
            if (response.ok) {
                const content = await response.text();
                dictionaries.set(fileInfo.name, {
                    priority: fileInfo.priority,
                    dict: parseDictionary(content)
                });
                logCallback(`Đã xử lý: ${fileInfo.name}`);
            } else {
                logCallback(`Lỗi: Không thể tải ${fileInfo.name}. Bỏ qua.`);
            }
        }
        
        const storableDicts = Array.from(dictionaries.entries()).map(([name, data]) => {
            return [name, {
                priority: data.priority,
                dict: Array.from(data.dict.entries())
            }];
        });

        await saveDataToDB(db, { id: 'parsed-dictionaries', data: storableDicts });
        logCallback('Đã lưu từ điển vào IndexedDB.');
        
        return dictionaries;
    } catch (error) {
        console.error(error);
        logCallback(`Lỗi: ${error.message}`);
        return null;
    } finally {
        logCallback('Quá trình hoàn tất.');
    }
}

export async function loadDictionariesFromFile(files, logCallback) {
    logCallback('Bắt đầu nhập từ điển từ thiết bị...');
    const dictionaries = new Map();
    const loadedFileNames = new Set();
    const fileReaderPromises = [];

    for (const fileInfo of DICTIONARY_FILES) {
        const file = Array.from(files).find(f => f.name.toLowerCase() === fileInfo.name.toLowerCase());
        if (file) {
            loadedFileNames.add(fileInfo.name);
            const promise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    logCallback(`Đã đọc xong file: ${fileInfo.name}`);
                    dictionaries.set(fileInfo.name, {
                        priority: fileInfo.priority,
                        dict: parseDictionary(e.target.result)
                    });
                    resolve();
                };
                reader.readAsText(file);
            });
            fileReaderPromises.push(promise);
        }
    }
    
    await Promise.all(fileReaderPromises);

    const missingFiles = REQUIRED_FILES.filter(f => !loadedFileNames.has(f));
    if (missingFiles.length > 0) {
        logCallback(`<span class="text-red-500">Lỗi: Thiếu các file bắt buộc: ${missingFiles.join(', ')}</span>`);
        return null;
    }

    const db = await openDB();
    const storableDicts = Array.from(dictionaries.entries()).map(([name, data]) => {
        return [name, {
            priority: data.priority,
            dict: Array.from(data.dict.entries())
        }];
    });

    await saveDataToDB(db, { id: 'parsed-dictionaries', data: storableDicts });
    logCallback('Đã lưu từ điển vào IndexedDB.');
    logCallback('Quá trình hoàn tất.');

    return dictionaries;
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

export function getTranslationFromPrioritizedDicts(word, dictionaries) {
    if (!dictionaries) return null;
    const sortedDicts = [...dictionaries.values()].sort((a, b) => a.priority - b.priority);
    for (const dictInfo of sortedDicts) {
        if (dictInfo.dict.has(word)) return dictInfo.dict.get(word);
    }
    return null;
}

export function getHanViet(word, dictionaries) {
    if (!dictionaries) return null;
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
    if (!masterKeySet) return [text];
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