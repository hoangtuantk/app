import DOMElements from './dom.js';
import { segmentText, translateWord } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary } from './nameList.js';

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

export function performTranslation(state) {
    const chineseText = DOMElements.inputText.value;
    if (!chineseText.trim()) {
        DOMElements.outputPanel.textContent = 'Vui lòng nhập văn bản.';
        return;
    }
    const isVietphraseMode = DOMElements.modeToggle.checked;
    const lines = chineseText.split('\n');
    const translatedLineHtmls = lines.map(line => {
        if (line.trim() === '') return null;

        const segments = segmentText(line, state.masterKeySet);
        const rawLineHtml = segments.map((segment) => {
            const translation = translateWord(segment, state.dictionaries, nameDictionary, temporaryNameDictionary);
            const span = document.createElement('span');
            span.className = 'word';
            
            if (!translation.found) {
                span.classList.add('untranslatable');
                span.textContent = segment;
            } else if (isVietphraseMode) {
                span.textContent = `(${translation.all.join('/')})`;
                span.classList.add('vietphrase-word');
            } else {
                span.textContent = translation.best;
            }
            span.dataset.original = segment;
            return span.outerHTML;
        }).join('');

        let processedHtml = rawLineHtml.replace(/<\/span><span/g, '</span> <span');
        processedHtml = processedHtml.replace(/\s+(<span[^>]*>[.,!?;:()\[\]{}'"]<\/span>)/g, '$1');
        return processedHtml;
    }).filter(Boolean);

    let finalHtml = translatedLineHtmls.join('<br><br>');
    const replacements = { '。': '.', '：': ':', '；': ';', '，': ',', '！': '!', '？': '?', '……': '...', '～': '~' };
    finalHtml = finalHtml.replace(/。|：|；|，|！|？|……|～/g, match => replacements[match]);
    finalHtml = finalHtml.replace(/<\/span>\s+([.,!?;:])/g, '</span>$1');

    DOMElements.outputPanel.innerHTML = finalHtml;
}