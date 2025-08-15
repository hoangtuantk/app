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
    const sortedRules = [...luatNhanDict.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [ruleKey, ruleValue] of sortedRules) {
        if (!ruleKey.includes('{0}')) continue;
        const escapedKey = escapeRegExp(ruleKey).replace('\\{0\\}', '([\u4e00-\u9fa5]+)');
        const regex = new RegExp(escapedKey, 'g');

        processedText = processedText.replace(regex, (match, capturedWord) => {
            if (state.masterKeySet.has(capturedWord)) {
                const translationResult = translateWord(capturedWord, state.dictionaries, nameDictionary, temporaryNameDictionary);
                if (translationResult && translationResult.found) {
                    return ruleValue.replace('{0}', translationResult.best);
                }
            }
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

    if (segments.length <= 1) {
        return [];
    }
    
    if (segments.length > 10) {
        return [`${segments.join(' ')} - Quá dài để gợi ý`];
    }
    
    const segmentMeanings = segments.map(seg => {
        const translation = translateWord(seg, state.dictionaries, nameDictionary, temporaryNameDictionary);
        return translation.all;
    });
    const cartesian = (...a) => a.reduce((acc, val) => acc.flatMap(d => val.map(e => [d, e].flat())));
    let combinations = [];
    try {
        combinations = cartesian(...segmentMeanings).map(combo => combo.join(' '));
    } catch (e) {
        return [`${text} - Số lượng tổ hợp quá nhiều`];
    }

    const uniqueCombinations = [...new Set(combinations)];
    const MAX_SUGGESTIONS = 50;
    const finalSuggestions = uniqueCombinations.slice(0, MAX_SUGGESTIONS);

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
    
    // Bộ quy tắc dấu câu hoàn chỉnh
    const OPENING_PUNCTUATION = new Set(['(', '[', '{', '“', '‘', '"', "'"]);
    const CLOSING_PUNCTUATION = new Set([')', ']', '}', '”', '’', ',', '.', '!', '?', ';', ':', '"', "'", '。', '：', '；', '，', '、', '！', '？', '……', '～']);

    const translatedLineHtmls = lines.map(line => {
        if (line.trim() === '') return null;

        const segments = segmentText(line, state.masterKeySet);
        
        // Bước 1: Lọc bỏ tất cả các segment chỉ chứa khoảng trắng.
        // Chúng ta sẽ tự kiểm soát toàn bộ việc thêm khoảng trắng.
        const nonEmptySegments = segments.filter(s => s.trim() !== '');

        // Bước 2: Tạo HTML cho từng segment và quyết định có thêm khoảng trắng phía trước hay không.
        const htmlParts = nonEmptySegments.map((segment, index) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.dataset.original = segment;

            // Logic dịch thuật cho segment
            if (!/[\u4e00-\u9fa5]/.test(segment)) {
                span.textContent = segment;
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
            }

            let leadingSpace = '';
            // Chỉ xem xét thêm khoảng trắng từ segment thứ hai trở đi.
            if (index > 0) {
                const prevSegment = nonEmptySegments[index - 1];
                
                const lastCharOfPrev = prevSegment.slice(-1);
                const firstCharOfCurrent = segment.charAt(0);

                // Mặc định là sẽ thêm khoảng trắng.
                leadingSpace = ' ';

                // Các trường hợp KHÔNG thêm khoảng trắng:
                // 1. Nếu segment trước đó kết thúc bằng một dấu mở.
                if (OPENING_PUNCTUATION.has(lastCharOfPrev)) {
                    leadingSpace = '';
                }
                // 2. Nếu segment hiện tại bắt đầu bằng một dấu đóng.
                if (CLOSING_PUNCTUATION.has(firstCharOfCurrent)) {
                    leadingSpace = '';
                }
            }
            
            return leadingSpace + span.outerHTML;
        });

        return htmlParts.join('');

    }).filter(Boolean);

    let finalHtml = translatedLineHtmls.join('<br><br>');
    
    const replacements = { '“': '"', '”': '"', '‘': "'", '’': "'", '。': '.', '：': ':', '；': ';', '，': ',', '！': '!', '？': '?', '……': '...', '～': '~', '、': ',' };
    finalHtml = finalHtml.replace(/[“”‘’。：；，、！？……～]/g, match => replacements[match] || match);

    DOMElements.outputPanel.innerHTML = finalHtml;
}
