import DOMElements from './dom.js';
import { segmentText, translateWord } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary } from './nameList.js';

export function formatVietphraseMeanings(meanings) {
    if (meanings.length <= 1) {
        return meanings.join('/');
    }
    return `(${meanings.join('/')})`;
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
                span.textContent = formatVietphraseMeanings(translation.all);
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
    const segments = segmentText(text, state.masterKeySet);

    if (segments.length <= 1) {
        return [];
    }
    
    // Lấy tất cả các nghĩa Vietphrase cho từng từ đã được tách ra.
    const segmentMeanings = segments.map(seg => {
        const translation = translateWord(seg, state.dictionaries, nameDictionary, temporaryNameDictionary);
        return translation.all;
    });

    // Chỉ trả về mảng các mảng nghĩa, không tạo ra tổ hợp nghĩa.
    return segmentMeanings;
}
