import DOMElements from './dom.js';
import { segmentText, translateWord } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary } from './nameList.js';

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

export function synthesizeCompoundTranslation(text, state) {
    // Sử dụng lại chính hàm TÁCH TỪ GỐC (segmentText) để phá vỡ cụm từ trong popup.
    // Điều này đảm bảo logic là nhất quán 100% với cách dịch chính.
    const segments = segmentText(text, state.masterKeySet);

    // Nếu sau khi tách mà chỉ có 1 từ (tức là không thể phá vỡ thêm), thì không cần gợi ý.
    if (segments.length <= 1) {
        return [];
    }

    // Lấy tất cả các nghĩa Vietphrase cho từng từ đã được tách ra.
    const segmentMeanings = segments.map(seg => {
        const translation = translateWord(seg, state.dictionaries, nameDictionary, temporaryNameDictionary);
        return translation.all;
    });

    // Tạo ra tất cả các tổ hợp nghĩa có thể có.
    const cartesian = (...a) => a.reduce((acc, val) => acc.flatMap(d => val.map(e => [d, e].flat())));
    const combinations = cartesian(...segmentMeanings).map(combo => combo.join(' '));

    // Trả về danh sách gợi ý.
    return [...new Set(combinations)];
}
