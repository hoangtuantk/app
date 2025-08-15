import DOMElements from './dom.js';
import { segmentText, translateWord } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary } from './nameList.js';
// HÀM HỖ TRỢ ĐỂ XỬ LÝ KÝ TỰ ĐẶC BIỆT
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// HÀM ÁP DỤNG LUẬT NHẤN
function applyLuatNhan(text, state) {
    const luatNhanDict = state.dictionaries.get('LuatNhan')?.dict;
    if (!luatNhanDict || luatNhanDict.size === 0) {
        return text;
    }

    let processedText = text;
    // Sắp xếp các luật theo độ dài, ưu tiên luật dài hơn để tránh xung đột
    const sortedRules = [...luatNhanDict.entries()].sort((a, b) => b[0].length - a[0].length);

    for (const [ruleKey, ruleValue] of sortedRules) {
        if (!ruleKey.includes('{0}')) continue;

        // Tạo biểu thức chính quy từ luật, thay thế {0} bằng một nhóm ký tự tiếng Trung
        const escapedKey = escapeRegExp(ruleKey).replace('\\{0\\}', '([\u4e00-\u9fa5]+)');
        const regex = new RegExp(escapedKey, 'g');

        processedText = processedText.replace(regex, (match, capturedWord) => {
            // Kiểm tra xem từ bị bắt (capturedWord) có trong từ điển không
            if (state.masterKeySet.has(capturedWord)) {
                // Dịch từ bị bắt đó
                const translationResult = translateWord(capturedWord, state.dictionaries, nameDictionary, temporaryNameDictionary);
                if (translationResult && translationResult.found) {
                    // Thay thế {0} trong vế phải của luật bằng kết quả dịch
                    return ruleValue.replace('{0}', translationResult.best);
                }
            }
            // Nếu không tìm thấy, trả về chuỗi gốc để không làm hỏng văn bản
            return match;
        });
    }

    return processedText;
}

const translationCache = new Map();
export function synthesizeCompoundTranslation(text, state) {
    if (translationCache.has(text)) {
        return translationCache.get(text);
    }
    const segments = segmentText(text, state.masterKeySet);

    // Nếu sau khi tách mà chỉ có 1 từ, không cần gợi ý.
    if (segments.length <= 1) {
        return [];
    }
    
    // Giới hạn độ dài của cụm từ để tránh tính toán quá lâu
    if (segments.length > 10) {
        return [`${segments.join(' ')} - Quá dài để gợi ý`];
    }
    
    // Lấy tất cả các nghĩa Vietphrase cho từng từ đã được tách ra.
    const segmentMeanings = segments.map(seg => {
        const translation = translateWord(seg, state.dictionaries, nameDictionary, temporaryNameDictionary);
        return translation.all;
    });
    // Tạo ra tất cả các tổ hợp nghĩa có thể có.
    const cartesian = (...a) => a.reduce((acc, val) => acc.flatMap(d => val.map(e => [d, e].flat())));
    let combinations = [];
    try {
        combinations = cartesian(...segmentMeanings).map(combo => combo.join(' '));
    } catch (e) {
        // Xử lý lỗi nếu số lượng tổ hợp quá lớn
        return [`${text} - Số lượng tổ hợp quá nhiều`];
    }

    // Lọc các nghĩa trùng lặp
    const uniqueCombinations = [...new Set(combinations)];
    // Giới hạn số lượng gợi ý để tránh DOM quá tải khi hiển thị
    const MAX_SUGGESTIONS = 50;
    const finalSuggestions = uniqueCombinations.slice(0, MAX_SUGGESTIONS);

    // Lưu kết quả đã tính toán vào cache trước khi trả về
    translationCache.set(text, finalSuggestions);
    return finalSuggestions;
}

export function performTranslation(state, options = {}) {
    const textToTranslate = options.forceText ?? DOMElements.inputText.value;
    const textWithLuatNhan = applyLuatNhan(textToTranslate, state);

    if (!textToTranslate.trim()) {
        DOMElements.outputPanel.textContent = 'Kết quả sẽ hiện ở đây...';
        return;
    }

    if (!options.forceText) {
        state.lastTranslatedText = textToTranslate;
    }

    const isVietphraseMode = DOMElements.modeToggle.checked;
    const lines = textWithLuatNhan.split('\n');

    // Định nghĩa các bộ ký tự để kiểm tra
    const OPENING_PUNCTUATION = new Set(['(', '[', '{', '“', '‘']);
    const CLOSING_PUNCTUATION = new Set([')', ']', '}', '”', '’', ',', '.', '!', '?', ';', ':', '。', '：', '；', '，', '、', '！', '？', '……', '～']);

    const translatedLineHtmls = lines.map(line => {
        if (line.trim() === '') return null;

        const segments = segmentText(line, state.masterKeySet);
        const cleanedSegments = [];
        for (let i = 0; i < segments.length; i++) {
            const currentSegment = segments[i];
            const nextSegment = (i + 1 < segments.length) ? segments[i+1] : null;

            if (currentSegment.trim() === '' && nextSegment && CLOSING_PUNCTUATION.has(nextSegment.trim())) {
                continue;
            }

            cleanedSegments.push(currentSegment);
        }
        const lineHtml = cleanedSegments.map((segment, index) => {
            const span = document.createElement('span');
            span.className = 'word';

            // Dịch từng segment và tạo span tương ứng
            if (!/[\u4e00-\u9fa5]/.test(segment)) {
                span.textContent = segment;
                span.dataset.original = segment;
            } else {
                const blacklistDict = state.dictionaries.get('Blacklist')?.dict;
                if (blacklistDict && blacklistDict.has(segment)) {
                    return ''; // Bỏ qua từ trong blacklist
                }

                const translation = translateWord(segment, state.dictionaries, nameDictionary, temporaryNameDictionary);
                
                if (!translation.found) {
                    span.classList.add('untranslatable');
                    span.textContent = segment;
                } else if (isVietphraseMode) {
                    span.classList.add('vietphrase-word');
                    span.textContent = `(${translation.all.join('/')})`;
                } else {
                    span.textContent = translation.best;
                }
                span.dataset.original = segment;
            }

            // Logic chèn khoảng trắng chủ động
            let trailingSpace = '';
            if (index < segments.length - 1) { // Chỉ xét khi không phải từ cuối cùng
                const currentSegment = segment.trim();
                const nextSegment = segments[index + 1].trim();

                // Nếu từ hiện tại là dấu mở ngoặc, HOẶC từ tiếp theo là dấu đóng ngoặc/dấu câu
                // thì KHÔNG thêm khoảng trắng.
                if (!OPENING_PUNCTUATION.has(currentSegment) && !CLOSING_PUNCTUATION.has(nextSegment)) {
                    trailingSpace = ' ';
                }
            }
            
            return span.outerHTML + trailingSpace;

        }).join('');

        return lineHtml;

    }).filter(Boolean);

    let finalHtml = translatedLineHtmls.join('<br><br>');
    
    // Thay thế các dấu câu full-width (nếu còn)
    const replacements = { '。': '.', '：': ':', '；': ';', '，': ',', '！': '!', '？': '?', '……': '...', '～': '~', '、': ',' };
    finalHtml = finalHtml.replace(/[。：；，、！？……～]/g, match => replacements[match] || match);

    DOMElements.outputPanel.innerHTML = finalHtml;
}