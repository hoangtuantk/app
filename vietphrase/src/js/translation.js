import DOMElements from './dom.js';
import { segmentText, translateWord } from './dictionary.js';
import { nameDictionary, temporaryNameDictionary } from './nameList.js';

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    const OPENING_PUNCTUATION = new Set(['(', '[', '{', '“', '‘', '"', "'"]);
    const CLOSING_PUNCTUATION = new Set([')', ']', '}', '”', '’', ',', '.', '!', '?', ';', ':', '"', "'", '。', '：', '；', '，', '、', '！', '？', '……', '～']);
    const ALL_PUNCTUATION = new Set([...OPENING_PUNCTUATION, ...CLOSING_PUNCTUATION]);
    const translatedLineHtmls = lines.map(line => {
        if (line.trim() === '') return null;
        const initialSegments = segmentText(line, state.masterKeySet);
        const punctuationCharsForRegex = Array.from(ALL_PUNCTUATION).map(p => escapeRegExp(p)).join('');
        const punctuationSplitRegex = new RegExp(`([${punctuationCharsForRegex}])`);
        
        const segments = initialSegments.flatMap(segment => {
            if (/[\u4e00-\u9fa5]/.test(segment)) {
                return [segment];
            }
            return segment.split(punctuationSplitRegex).filter(Boolean);
        }).filter(s => s.trim() !== '');

        const htmlParts = segments.map((segment, index) => {
            const span = document.createElement('span');
            span.className = 'word';
            span.dataset.original = segment;

            if (!/[\u4e00-\u9fa5]/.test(segment)) {
                span.textContent = segment;
            } else {
                const blacklistDict = state.dictionaries.get('Blacklist')?.dict;
                if (blacklistDict && blacklistDict.has(segment)) {
                    return '';
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
            if (index > 0) {
                const prevSegment = segments[index - 1];
                const lastCharOfPrev = prevSegment.slice(-1);
                const firstCharOfCurrent = segment.charAt(0);
                leadingSpace = ' ';

                const isPrevOpening = OPENING_PUNCTUATION.has(lastCharOfPrev);
                const isCurrentClosing = CLOSING_PUNCTUATION.has(firstCharOfCurrent);
                
                if (isPrevOpening) {
                    leadingSpace = '';
                }

                if (isCurrentClosing) {
                    const prevWantsSpaceAfter = new Set([':', ';', '.', '?', '!']).has(lastCharOfPrev);
                    const currentIsOpeningQuote = new Set(['"', "'", '“', '‘']).has(firstCharOfCurrent);
                    if (prevWantsSpaceAfter && currentIsOpeningQuote) {
                    } else {
                        leadingSpace = '';
                    }
                }
            }
            
            return leadingSpace + span.outerHTML;
        });

        const lineHtml = htmlParts.join('');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lineHtml;

        const treeWalker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
        let firstTextNodeContainingLetter = null;

        while (treeWalker.nextNode()) {
            if (/\p{L}/u.test(treeWalker.currentNode.nodeValue)) {
                firstTextNodeContainingLetter = treeWalker.currentNode;
                break;
            }
        }

        if (firstTextNodeContainingLetter) {
            firstTextNodeContainingLetter.nodeValue = firstTextNodeContainingLetter.nodeValue.replace(
                /(\p{L})/u,
                (match) => match.toUpperCase()
            );
        }

        return tempDiv.innerHTML;

    }).filter(Boolean);

    let finalHtml = translatedLineHtmls.join('<br><br>');
    
    const replacements = { '。': '.', '：': ':', '；': ';', '，': ',', '！': '!', '？': '?', '……': '...', '～': '~', '、': ',' };
    finalHtml = finalHtml.replace(/[。：；，、！？……～]/g, match => replacements[match] || match);

    DOMElements.outputPanel.innerHTML = finalHtml;
}