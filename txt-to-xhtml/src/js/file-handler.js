export function _handleExport() {
  const option = this.dom.exportOptionSelect.value;
  const baseFileName = this._getFileName(this.dom.inputText.value, this.dom.outputText.value);
  let files = [];

  if (option === 'html' || option === 'both') {
    if (this.dom.outputText.value) {
      const isXhtml = this.dom.xhtmlConversionToggle.checked;
      const ext = isXhtml ? '.xhtml' : '.txt';
      const mime = isXhtml ? 'application/xhtml+xml' : 'text/plain';
      const fileName = `${baseFileName}${ext}`;
      this._downloadFile(fileName, this.dom.outputText.value, mime);
      files.push(fileName);
    }
  }
  if (option === 'original' || option === 'both') {
    if (this.dom.inputText.value) {
      const fileName = `${baseFileName}_original.txt`;
      this._downloadFile(fileName, this.dom.inputText.value, 'text/plain');
      files.push(fileName);
    }
  }

  if (files.length > 0) {
    const message = `Đã xuất tệp thành công!<br>Tên file: <strong>${files.join(' và ')}</strong>`;
    this._showNotification(message, 5000, true);
  }
}

export function _sanitizeFileName(text) {
  if (!text) return '';
  return text.toString().replace(/[\\/:"*?<>|]+/g, '');
}

export function _parseCustomFilename(format, data) {
  return format.replace(/\[([^\]]+)\]/g, (match, key) => {
    const upperKey = key.toUpperCase();
    if (data.hasOwnProperty(upperKey)) {
      return data[upperKey];
    }

    let timeFormat = key;
    let hasTimeToken = false;

    if (timeFormat.includes('hh')) {
      hasTimeToken = true;
      timeFormat = timeFormat.replace(/hh/g, data.hh + data.ampm);
    }

    const otherTokens = {
      'YYYY': data.YYYY, 'MM': data.MM, 'DD': data.DD,
      'HH': data.HH, 'mm': data.mm, 'ss': data.ss
    };

    for (const token in otherTokens) {
      if (timeFormat.includes(token)) {
        hasTimeToken = true;
        timeFormat = timeFormat.replace(new RegExp(token, 'g'), otherTokens[token]);
      }
    }

    return hasTimeToken ? timeFormat : match;
  });
}

export function _getFileName(inputTextValue, outputTextValue) {
  const now = new Date();
  const dateParts = {
    YYYY: now.getFullYear(),
    MM: String(now.getMonth() + 1).padStart(2, '0'),
    DD: String(now.getDate()).padStart(2, '0'),
    HH: String(now.getHours()).padStart(2, '0'),
    hh: String(now.getHours() % 12 || 12).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
    ss: String(now.getSeconds()).padStart(2, '0'),
    ampm: now.getHours() >= 12 ? 'pm' : 'am',
  };

  const titleMatch = outputTextValue.match(/<title>(.*?)<\/title>/i);
  let candidate = (titleMatch && titleMatch[1].trim()) || inputTextValue.trim().split(/\s+/).slice(0, 5).join(' ');
  const chapterMatch = candidate.match(/^(?:chương\s*(?:thứ\s*)?)\s*([\d]+|[a-zA-ZÀ-ỹ\s]+)/i);

  let chapterNumber = '';
  if (chapterMatch) {
    chapterNumber = this._convertVietnameseNumberWordsToDigits(chapterMatch[1].trim());
  }

  const data = {
    ...dateParts,
    CHUONG: chapterNumber ? `C${chapterNumber}` : '',
    TIEUDE: this._sanitizeFileName(candidate) || 'file',
    THOIGIAN: `${dateParts.YYYY}${dateParts.MM}${dateParts.DD}_${dateParts.HH}${dateParts.mm}${dateParts.ss}`
  };

  const formatOption = document.querySelector('input[name="nameFormat"]:checked').value;
  let finalName;

  if (formatOption === 'title') {
    const rawTitle = (titleMatch && titleMatch[1].trim()) || 'untitled';
    finalName = this._sanitizeFileName(rawTitle);
  } else {
    let formatString = '';
    switch (formatOption) {
      case 'chapter_prefix':
        formatString = '[CHUONG]_[THOIGIAN]';
        break;
      case 'timestamp_prefix':
        formatString = '[THOIGIAN]_[CHUONG]';
        break;
      case 'custom':
        formatString = this.dom.customNameFormatInput.value;
        break;
    }
    finalName = this._parseCustomFilename(formatString, data)
      .replace(/__+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  return finalName || data.THOIGIAN;
}

export function _updateFileNamePreview() {
  if (!this.dom.fileNamePreview) return;
  const filename = this._getFileName(this.dom.inputText.value, this.dom.outputText.value);
  const exportOption = this.dom.exportOptionSelect.value;
  const isXhtml = this.dom.xhtmlConversionToggle.checked;
  const mainExt = isXhtml ? '.xhtml' : '.txt';

  let fullFilename;
  let titleText;

  switch (exportOption) {
    case 'html':
      fullFilename = `${filename}${mainExt}`;
      titleText = `Tên file đầy đủ: ${fullFilename}`;
      break;
    case 'original':
      fullFilename = `${filename}_original.txt`;
      titleText = `Tên file đầy đủ: ${fullFilename}`;
      break;
    case 'both':
      const mainFile = `${filename}${mainExt}`;
      const originalFile = `${filename}_original.txt`;
      fullFilename = mainFile;
      titleText = `Sẽ xuất 2 tệp: ${mainFile} và ${originalFile}`;
      break;
    default:
      fullFilename = `${filename}${mainExt}`;
      titleText = `Tên file đầy đủ: ${fullFilename}`;
  }

  this.dom.fileNamePreview.textContent = fullFilename;
  this.dom.fileNamePreview.title = titleText;
}

export function _handleNamingOptionChange() {
  const selectedFormat = document.querySelector('input[name="nameFormat"]:checked').value;
  const isCustom = selectedFormat === 'custom';
  this.dom.customNameFormatInput.disabled = !isCustom;
  this.dom.customNameFormatExample.classList.toggle('hidden', !isCustom);
}

export function _downloadFile(filename, content, mimeType) {
  const blob = (typeof content === 'string')
    ? new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: `${mimeType};charset=utf-8` })
    : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}