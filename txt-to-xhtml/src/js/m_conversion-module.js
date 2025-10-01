export async function performConversion(rawTextOverride = null) {
  if (rawTextOverride === null) {
    this._setBusyState(true);
  }
  const startTime = Date.now();
  const rawText = rawTextOverride !== null ? rawTextOverride : this.dom.inputText.value;

  if (!rawText.trim()) {
    if (rawTextOverride === null) {
      this.dom.outputText.value = '';
      this._setBusyState(false);
      this._updateTextareaStats();
      this._updateFileNamePreview();
    }
    return '';
  }

  // --- Giai đoạn 1: Xử lý văn bản (Luôn thực hiện) ---

  // 1. Áp dụng bộ lọc (filters)
  let processedText = rawText;
  if (this.dom.filterSettingToggle.checked) {
    processedText = this._applyFilters(processedText);
  }

  // 2. Áp dụng xử lý từng dòng (chuẩn hóa dấu câu, viết hoa)
  // Logic này được chuyển ra ngoài để chạy cho cả hai chế độ.
  processedText = processedText.split('\n')
    .map(line => this._processLine(line))
    .join('\n');

  // --- Giai đoạn 2: Định dạng đầu ra (Tùy thuộc vào chế độ XHTML) ---

  let finalResult;

  if (this.dom.xhtmlConversionToggle.checked) {
    // Chế độ XHTML BẬT: Chuyển văn bản đã xử lý thành HTML
    const linesForHtml = processedText.split('\n').filter(line => line.trim());
    finalResult = this._buildHtml(linesForHtml, rawText); // _buildHtml sẽ thêm thẻ <p>, <h2>, header/footer

    if (rawTextOverride === null) {
      this.dom.outputLabel.textContent = 'Kết quả XHTML';
      this.dom.xhtmlExportOption.textContent = 'Kết quả XHTML (.xhtml)';
    }
  } else {
    // Chế độ XHTML TẮT: Sử dụng trực tiếp văn bản đã xử lý
    finalResult = processedText;

    if (rawTextOverride === null) {
      this.dom.outputLabel.textContent = 'Kết quả Chuyển Đổi';
      this.dom.xhtmlExportOption.textContent = 'Kết quả Chuyển Đổi (.txt)';
    }
  }

  if (rawTextOverride === null) {
    this.dom.outputText.value = finalResult;
    const elapsedTime = Date.now() - startTime;
    const remainingTime = this.config.minBusyDisplayTime - elapsedTime;
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
    this._setBusyState(false);
    this._updateTextareaStats();
    this._updateFileNamePreview();
  }

  return finalResult;
}

export function _performReverseConversion() {
  const htmlContent = this.dom.outputText.value;
  if (!this.dom.xhtmlConversionToggle.checked) {
    this.dom.inputText.value = htmlContent;
    this._updateTextareaStats();
    return;
  }
  let plainTextLines = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  doc.body.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE && (node.tagName.startsWith('H') || node.tagName === 'P')) {
      if (node.textContent.trim()) {
        plainTextLines.push(node.textContent.trim());
        if (this.dom.insertLineBreaksToggle.checked) {
          plainTextLines.push('');
        } else {
          if (node.tagName.startsWith('H')) {
            plainTextLines.push('');
          }
        }
      }
    }
  });
  this.dom.inputText.value = plainTextLines.join('\n');
  this._updateTextareaStats();
}

export function _htmlToPlainText(htmlContent) {
  let plainTextLines = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    doc.body.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && (node.tagName.startsWith('H') || node.tagName === 'P')) {
        if (node.textContent && node.textContent.trim()) {
          plainTextLines.push(node.textContent.trim());
          if (this.dom.insertLineBreaksToggle.checked) {
            plainTextLines.push('');
          } else {
            if (node.tagName.startsWith('H')) {
              plainTextLines.push('');
            }
          }
        }
      }
    });
  } catch (e) {
    console.error("Lỗi khi phân tích cú pháp HTML để dịch ngược:", e);
    return htmlContent; // Trả về nội dung gốc nếu có lỗi
  }
  return plainTextLines.join('\n');
}

export function _processLine(line) {
  let tempLine = line.trim();
  if (!tempLine) return '';
  if (this.dom.autoProcessPunctuationToggle.checked) {
    if (this.dom.subPunctuationToggle_normalizeAll.checked) {
      tempLine = tempLine.replace(/\s*((\.{2,})|([.,:;?!]))\s*/g, '$1 ');
    }

    if (this.dom.subPunctuationToggle_normalizeBrackets.checked) {
      const openBrackets = /[\(\[{“‘]/g;
      const closeBrackets = /[\)\]}”’]/g;
      const allQuotes = /["']/g;
      tempLine = tempLine.replace(/\s+([\"'‘’“”])/g, '$1');
      tempLine = tempLine.replace(/([\(\[{“‘])\s+/g, '$1');
      tempLine = tempLine.replace(/\s+([\)\]}”’])/g, '$1');
      tempLine = tempLine.replace(/([^\s\(\[{“‘])([\({\[“‘])/g, '$1 $2');
      tempLine = tempLine.replace(/([\)\]}”’])([^\s.,\)\]}”’])/g, '$1 $2');
      tempLine = tempLine.split('\n').map(singleLine => {
        let inDoubleQuote = false;
        let inSingleQuote = false;
        let correctedLine = '';
        for (let i = 0; i < singleLine.length; i++) {

          const char = singleLine[i];
          const prevChar = i > 0 ? singleLine[i - 1] : ' ';
          const nextChar = i < singleLine.length - 1 ? singleLine[i + 1] : ' ';

          if (char === '"') {

            if (!inDoubleQuote) {
              if (prevChar !== ' ' && !prevChar.match(openBrackets)) correctedLine += ' ';
              correctedLine += char;

              if (nextChar === ' ') {
                i++;
              }

            } else {
              if (prevChar === ' ') correctedLine = correctedLine.slice(0, -1);
              correctedLine += char;
              if (nextChar !== ' ' && !nextChar.match(closeBrackets) && nextChar !== '.' && nextChar !== ',') correctedLine += ' ';
            }
            inDoubleQuote = !inDoubleQuote;
          } else if (char === "'") {
            if (!inSingleQuote) {
              if (prevChar !== ' ' && !prevChar.match(openBrackets)) correctedLine += ' ';
              correctedLine += char;
              if (nextChar === ' ') {
                i++;
              }
            } else {
              if (prevChar === ' ') correctedLine = correctedLine.slice(0, -1);
              correctedLine += char;
              if (nextChar !== ' ' && !nextChar.match(closeBrackets) && nextChar !== '.' && nextChar !== ',') correctedLine += ' ';
            }
            inSingleQuote = !inSingleQuote;
          } else {
            correctedLine += char;
          }
        }
        return correctedLine.replace(/\s\s+/g, ' ');
      }).join('\n');
    }
  }

  if (this.dom.autoCapitalizationToggle.checked) {
    // Tùy chọn: Viết hoa sau dấu câu .?!
    if (this.dom.subCapitalization_afterPunctuation.checked) {
      tempLine = tempLine.replace(/([.?!]\s+)([^a-zA-ZÀ-ỹ]*)([a-zA-ZÀ-ỹ])/gu, (match, p1, p2, p3) => {
        return p1 + p2 + p3.toUpperCase();
      });
    }

    // Tùy chọn: Viết hoa sau dấu hai chấm :
    if (this.dom.subCapitalization_afterColon.checked) {
      tempLine = tempLine.replace(/([:]\s+)([^a-zA-ZÀ-ỹ]*)([a-zA-ZÀ-ỹ])/gu, (match, p1, p2, p3) => {
        return p1 + p2 + p3.toUpperCase();
      });
    }

    // Tùy chọn: Viết hoa sau dấu ngoặc mở ( " “
    if (this.dom.subCapitalization_afterOpeningBracket.checked) {
      tempLine = tempLine.replace(/([(“"]\s*)([^a-zA-ZÀ-ỹ]*)([a-zA-ZÀ-ỹ])/gu, (match, p1, p2, p3) => {
        return p1 + p2 + p3.toUpperCase();
      });
    }

    // Tùy chọn: Viết hoa chữ cái đầu dòng
    if (this.dom.subCapitalization_firstLetter.checked) {
      tempLine = this._capitalizeFirstAlphabetic(tempLine);
    }
  }
  tempLine = tempLine.trim();
  return tempLine;
}

export function _buildHtml(lines, originalText = '') {
  if (lines.length === 0) return '';

  let htmlOutput = '';
  let titleForHeader = '';
  let isChapterLine = false;
  let linesToProcess = [...lines];

  const firstMeaningfulLine = lines.find(l => l.trim()) || '';
  if (!firstMeaningfulLine) return '';

  // Logic xử lý tiêu đề, được điều khiển bởi các công tắc
  if (this.dom.autoProcessTitleToggle.checked && this.dom.subTitle_recognizeChapter.checked) {
    const chapterPattern = /^(?:(thứ)\s*)?(chương)?\s*([\d]+|[a-zA-ZÀ-ỹ\s]+)(?:(?::\s*|\s+)(.*))?$/i;
    const match = firstMeaningfulLine.match(chapterPattern);

    if (match) {
      const hasChapterKeyword = (match[1] && match[1].toLowerCase() === 'thứ') || (match[2] && match[2].toLowerCase() === 'chương');
      const hasNumberOrWord = match[3] && match[3].trim().length > 0;
      isChapterLine = hasChapterKeyword && hasNumberOrWord;
    }

    if (isChapterLine) {
      let chapterNumberDigits = this._convertVietnameseNumberWordsToDigits(match[3].trim());
      let chapterTitleRaw = match[4] ? match[4].trim() : '';

      if (chapterTitleRaw.toLowerCase().startsWith('chương: ')) {
        chapterTitleRaw = chapterTitleRaw.substring(8).trim();
      } else if (chapterTitleRaw.toLowerCase().startsWith('chương ')) {
        chapterTitleRaw = chapterTitleRaw.substring(7).trim();
      }

      titleForHeader = `Chương ${chapterNumberDigits}`;
      if (chapterTitleRaw) {
        titleForHeader += `: ${this._capitalizeFirstAlphabetic(chapterTitleRaw)}`;
      }
      titleForHeader = titleForHeader.replace(/\.$/, '');

      const headingLevel = this.dom.subTitle_headingLevelSelect.value || 'h2';
      htmlOutput += `<${headingLevel}>${titleForHeader}</${headingLevel}>\n\n`;

      linesToProcess.shift();
    }
  }

  // Xử lý các dòng còn lại
  linesToProcess.forEach(line => {
    if (line.trim()) htmlOutput += `<p>${line}</p>\n`;
  });

  // Tạo title dự phòng nếu chưa có
  if (!titleForHeader) {
    const textForTitle = originalText || lines.join(' ');
    titleForHeader = textForTitle.trim().split(/\s+/).slice(0, 5).join(' ').replace(/\.$/, '') || 'Chuyển đổi văn bản';
  }

  // Chèn header/footer và thẻ <title> nếu được chọn
  if (this.dom.includeHeaderFooterToggle.checked) {
    let header = this.dom.htmlHeaderInput.value;
    // Chỉ chèn vào thẻ <title> nếu tùy chọn được bật
    if (this.dom.autoProcessTitleToggle.checked && this.dom.subTitle_insertIntoTitleTag.checked) {
      header = header.replace(/<title>.*?<\/title>/, `<title>${titleForHeader}</title>`);
    }
    htmlOutput = `${header}\n${htmlOutput.trim()}\n${this.dom.htmlFooterInput.value}`;
  }

  return htmlOutput.trim();
}