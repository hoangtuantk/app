const HAN_VIET_DICT_NAME = 'PhienAm';
const NAMES_FILES = [
    'Names2.txt', 'Name2.txt'
];

const DICTIONARY_FILES = [
    ...NAMES_FILES.map(name => ({ id: name, names: [name], priority: 1})),
    { 
        id: 'Names', 
        names: ['Names.txt','Name.txt'], 
        priority: 1
    },
    {   id: 'LuatNhan',
        names: ['LuatNhan.txt', 'Luat Nhan.txt'],
        priority: 2,
        style: 'LuatNhan-Style'
    },
    {   id: 'Pronouns',
        names: [
            'Pronouns.txt',
            'DaiTu', 'DaiTuNhanXung', 'Dai Tu', 'Dai Tu Nhan Xung',
            'Pronouns-Dai Tu Nhan Xung.txt'
        ],
         priority: 3
    },
    { 
        id: 'Vietphrase', 
        names: ['Vietphrase.txt', 'Vietphrase-custom.txt', 'VP.txt'], 
        priority: 3
    },
    {   id: 'PhienAm',
        names: [
            'ChinesePhienAmWords.txt',
            'PhienAm.txt', 'Phien Am.txt',
            'HanViet.txt', 'HV.txt', 'Han Viet.txt', 'H V.txt',
            'ChinesePhienAmWords-Han Viet.txt'
        ],
        priority: 3
    },
    { 
        id: 'LacViet', 
        names: ['LacViet.txt', 'Lac Viet.txt', 'LV.txt'],
        priority: 4,
        style: 'LacViet-Style'
    },
    { 
        id: 'Blacklist', 
        names: ['IgnoredChinesePhrases.txt', 'IgnoreList.txt', 'Blacklist.txt'], 
        priority: 4,
        style: 'Blacklist-Style'
    },
    { 
        id: 'Babylon', //English file
        names: ['Babylon.txt', 'babylon-vn.txt'], 
        priority: 5
    },
];

const REQUIRED_FILES = [
    'Vietphrase',
    HAN_VIET_DICT_NAME,
    'LacViet',
    'LuatNhan',
    'Names',
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

export async function loadDictionariesFromServer(logHandler) {
    const dictionaries = new Map();
    try {
        const db = await openDB();

        for (const fileInfo of DICTIONARY_FILES) {
            const possibleNames = Array.isArray(fileInfo.names) ? fileInfo.names : [fileInfo.name];
            const dictionaryId = fileInfo.id || fileInfo.name;
            let response = null;
            let foundName = null;

            // Lặp qua các tên có thể có và thử tải file đầu tiên tồn tại
            for (const pName of possibleNames) {
                if (!pName) continue;
                try {
                    const res = await fetch(`data/${pName}`);
                    if (res.ok) {
                        response = res;
                        foundName = pName;
                        break;
                    }
                } catch (e) {
                    // Bỏ qua lỗi mạng và thử tên tiếp theo
                }
            }

            const loadingLi = logHandler.append(`Đang xử lý ${dictionaryId} từ server...`, 'loading');
            if (response && response.ok) {
                const content = await response.text();
                dictionaries.set(dictionaryId, {
                    priority: fileInfo.priority,
                    dict: parseDictionary(content, fileInfo.style)
                });
                logHandler.update(loadingLi, `Đã xử lý xong: ${foundName} (dưới dạng ${dictionaryId})`, 'success');
            } else {
                logHandler.update(loadingLi, `Lỗi: Không thể tải từ điển ${dictionaryId} từ server.`, 'error');
            }
        }

        const storableDicts = Array.from(dictionaries.entries()).map(([name, data]) => {
            return [name, {
                priority: data.priority,
                dict: Array.from(data.dict.entries())
            }];
        });

        const savingLi = logHandler.append('Đang lưu từ điển vào IndexedDB...', 'loading');
        await saveDataToDB(db, { id: 'parsed-dictionaries', data: storableDicts });
        logHandler.update(savingLi, 'Đã lưu từ điển vào IndexedDB.', 'success');

        return dictionaries;
    } catch (error) {
        console.error(error);
        logHandler.append(`Lỗi: ${error.message}`, 'error');
        return null;
    } finally {
        logHandler.append('Quá trình hoàn tất.', 'info');
    }
}

export async function loadDictionariesFromFile(files, logHandler) {
    const dictionaries = new Map();
    const foundDictionaryTypes = new Set();
    const usedActualFileNames = new Set();
    const fileReaderPromises = [];

    for (const fileInfo of DICTIONARY_FILES) {
        // Lấy ra danh sách tên có thể có và ID của từ điển từ cấu trúc mới
        const possibleNames = Array.isArray(fileInfo.names) ? fileInfo.names : [fileInfo.name];
        const dictionaryId = fileInfo.id || fileInfo.name;
        let file = null;

        // Tìm file đầu tiên khớp với một trong các tên có thể có
        for (const pName of possibleNames) {
            if (!pName) continue; // Bỏ qua nếu tên không hợp lệ
            const potentialFile = Array.from(files).find(f => 
                f.name.toLowerCase() === pName.toLowerCase() && !usedActualFileNames.has(f.name)
            );
            if (potentialFile) {
                file = potentialFile; // Đã tìm thấy file phù hợp!
                break; // Dừng tìm kiếm cho loại từ điển này
            }
        }

        if (file) {
            foundDictionaryTypes.add(dictionaryId);
            usedActualFileNames.add(file.name);

            const loadingLi = logHandler.append(`Đang đọc file: ${file.name} (dưới dạng ${dictionaryId})`, 'loading');
            const promise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    dictionaries.set(dictionaryId, {

                        priority: fileInfo.priority,
                        dict: parseDictionary(e.target.result, fileInfo.style)
                    });

                    logHandler.update(loadingLi, `Đã đọc xong file: ${file.name}`, 'success');
                    resolve();
                };
                reader.onerror = () => {
                    logHandler.update(loadingLi, `Lỗi khi đọc file: ${file.name}`, 'error');
                    resolve();
                };
                reader.readAsText(file);
            });
            fileReaderPromises.push(promise);
        }
    }

    await Promise.all(fileReaderPromises);

    const missingFiles = REQUIRED_FILES.filter(f => !foundDictionaryTypes.has(f));
    if (missingFiles.length > 0) {
        logHandler.append(`Lỗi: Thiếu các file bắt buộc: ${missingFiles.join(', ')}`, 'error');
        return null;
    }

    const db = await openDB();
    const savingLi = logHandler.append('Đang lưu từ điển vào IndexedDB...', 'loading');
    const storableDicts = Array.from(dictionaries.entries()).map(([name, data]) => {
        return [name, { priority: data.priority, dict: Array.from(data.dict.entries()) }];
    });
    await saveDataToDB(db, { id: 'parsed-dictionaries', data: storableDicts });
    logHandler.update(savingLi, 'Đã lưu từ điển vào IndexedDB.', 'success');
    logHandler.append('Quá trình hoàn tất.', 'info');

    return dictionaries;
}

// Style mặc định: [A]=[B]
function parseStyleChung(text) {
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

// Style cho Blacklist: Mỗi dòng là một mục cần loại bỏ
function parseBlacklistStyle(text) {
    const dictionary = new Map();
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
            dictionary.set(trimmedLine, ''); // Giá trị là một chuỗi rỗng
        }
    });
    return dictionary;
}

// Style cho LacViet: Xử lý các định dạng đặc biệt
function parseLacVietStyle(text) {
    const dictionary = new Map();
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if (line.startsWith('#') || line.trim() === '') return;
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();

            // Bỏ qua 1: <✚[$]> hoặc <[$]>
            value = value.replace(/✚?\[.*?\]\s*/, '');

            // Bỏ qua 2: <Hán Việt: $>
            // Tạo regex động dựa trên số lượng ký tự tiếng Trung
            if (value.includes('Hán Việt:')) {
                const chineseCharCount = (key.match(/[\u4e00-\u9fa5]/g) || []).length;
                if (chineseCharCount > 0) {
                    // Regex này tìm "Hán Việt:" theo sau bởi đúng số lượng từ (không phải ký tự)
                     const hanVietRegex = new RegExp(`Hán Việt: (\\S+\\s+){${chineseCharCount - 1}}\\S+\\s*`);
                     value = value.replace(hanVietRegex, '');
                }
            }

            // Bỏ qua 3 và Thay thế: <\n\t$.> thành dấu phân tách ;
            value = value.replace(/\n\t\d+\.\s*/g, '; ');

            // Dọn dẹp kết quả cuối cùng
            value = value.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
            value = value.startsWith(';') ? value.slice(1).trim() : value;

            if (key) dictionary.set(key, value);
        }
    });
    return dictionary;
}

// Hàm chính để chọn style xử lý phù hợp
function parseDictionary(text, style = 'Style-Chung') {
    switch (style) {
        case 'LacViet-Style':
            return parseLacVietStyle(text);
        case 'Blacklist-Style':
            return parseBlacklistStyle(text);
        // LuatNhan-Style sử dụng trình phân tích mặc định để tải các quy tắc
        case 'LuatNhan-Style':
        case 'Style-Chung':
        default:
            return parseStyleChung(text);
    }
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