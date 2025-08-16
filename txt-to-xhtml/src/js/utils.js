export function _debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export function _capitalizeFirstAlphabetic(text) {
  const match = text.match(/[a-zA-ZÀ-ỹ]/u);
  if (match) {
    const index = text.indexOf(match[0]);
    return text.substring(0, index) + text.charAt(index).toUpperCase() + text.substring(index + 1);
  }
  return text;
}

export function _convertVietnameseNumberWordsToDigits(text) {
  const trimmedText = text.trim();
  // Kiểm tra xem chuỗi có phải hoàn toàn là số hay không (bao gồm cả số 0 đứng đầu)
  if (/^\d+$/.test(trimmedText)) {
    // Chuyển chuỗi thành số nguyên để loại bỏ các số 0 không cần thiết và trả về dưới dạng chuỗi
    return String(parseInt(trimmedText, 10));
  }
  const unitMap = { 'không': 0, 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9 }, specialUnitMap = { 'mốt': 1, 'tư': 4, 'lăm': 5 }, scaleWords = { 'nghìn': 1e3, 'ngàn': 1e3, 'triệu': 1e6, 'tỷ': 1e9 };
  let total = 0, block = 0, last = 0;
  text.toLowerCase().split(/\s+/).filter(w => w).forEach((word, i, words) => {
    if (unitMap[word] !== void 0) { last = unitMap[word]; block += last }
    else if (specialUnitMap[word] !== void 0) { last = specialUnitMap[word]; block = i > 0 && ("mươi" === words[i - 1] || "mười" === words[i - 1]) ? 10 * Math.floor(block / 10) + last : block + last }
    else if ("mười" === word) { block += 10; last = 10 }
    else if ("mươi" === word) { block = block - last + 10 * last; last = 10 }
    else if ("trăm" === word) { block = block - last + 100 * last; last = 100 }
    else if (scaleWords[word]) { const scale = scaleWords[word]; 0 === block && 0 === last && (block = 1); total += block * scale; block = 0; last = 0 }
    else if ("lẻ" === word || "linh" === word) last = 0
  });
  return String(total + block);[cite_start]
}

export function _syncScroll(source, target) {
  if (!this.dom.syncScrollSettingToggle.checked || this.state.isSyncingScroll) return;
  this.state.isSyncingScroll = true;

  const sourceScrollHeight = source.scrollHeight - source.clientHeight;
  const targetScrollHeight = target.scrollHeight - target.clientHeight;

  if (sourceScrollHeight <= 0) {
    this.state.isSyncingScroll = false;
    return;
  }

  const scrollRatio = source.scrollTop / sourceScrollHeight;
  target.scrollTop = scrollRatio * targetScrollHeight;

  requestAnimationFrame(() => {
    this.state.isSyncingScroll = false;
  });
}

export function _handleHomeEndKeys(e, textarea) {
  if (e.key === 'Home') {
    e.preventDefault();
    textarea.selectionStart = textarea.selectionEnd = 0;
    textarea.scrollTop = 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    textarea.scrollTop = textarea.scrollHeight;
  }
}