// --- Các hàm xử lý cốt lõi (sao chép từ main.js để worker có thể dùng) ---
const nonAlphaNumericExceptEqualsRegex = /[^A-Za-z0-9\u4e00-\u9fff\u00C0-\u1EF9\s=]/g;
const specialCharRegex = /[^\p{L}\p{N}\s]/u;

const cleanTextForComparison = (text, options) => {
  let cleanedText = text.startsWith('$') ? text.substring(1) : text;
  if (options.ignoreWhitespace) cleanedText = cleanedText.replace(/\s/g, '');
  if (options.ignoreSpecialChars) cleanedText = cleanedText.replace(nonAlphaNumericExceptEqualsRegex, '');
  if (!options.caseSensitive) cleanedText = cleanedText.toLowerCase();
  return cleanedText;
};

const parseLineContent = (line, options) => {
  const originalLine = line;
  const lineWithoutDollar = originalLine.startsWith('$') ? originalLine.substring(1) : originalLine;
  const parts = lineWithoutDollar.split('=');
  const chinesePart = parts.length > 1 ? parts[0] : lineWithoutDollar;
  const vietnamesePart = parts.length > 1 ? parts.slice(1).join('=') : lineWithoutDollar;
  const chineseCharCount = (chinesePart.match(/[\u4e00-\u9fff]/g) || []).length;

  return {
    original: originalLine,
    chinesePart,
    vietnamesePart,
    chineseCharCount,
    hasSpecialChars: specialCharRegex.test(chinesePart),
    comparisonKey: cleanTextForComparison(originalLine, options)
  };
};

const getLineWithMostUppercase = (group) => {
  const vietnameseUppercaseRegex = /[A-ZÀÁẠẢÃĂẰẮẲẶẴÂẦẤẨẬẪĐÈÉẸẺẼÊỀẾỂỆỄÌÍỊỈĨÒÓỌỎÕÔỒỐỔỘỖƠỜỚỞỢỠÙÚỤỦŨƯỪỨỬỰỮỲÝỴỶỸ]/g;
  return group.reduce((best, current) => {
    const parseVnPart = (line) => {
      const lineWithoutDollar = line.startsWith('$') ? line.substring(1) : line;
      const parts = lineWithoutDollar.split('=');
      return parts.length > 1 ? parts.slice(1).join('=') : lineWithoutDollar;
    };
    const bestCount = (parseVnPart(best).match(vietnameseUppercaseRegex) || []).length;
    const currentCount = (parseVnPart(current).match(vietnameseUppercaseRegex) || []).length;
    return currentCount > bestCount ? current : best;
  });
};

// THAY THẾ HÀM CŨ BẰNG HÀM NÀY
const createSortComparator = (sortOptions, caseSensitive) => (a, b) => {
  // Ưu tiên 1: Sắp xếp theo số lượng chữ Hán (nếu bật)
  if (sortOptions.charCountEnabled) {
    const countDiff = a.chineseCharCount - b.chineseCharCount;
    if (countDiff !== 0) return countDiff;
    // Ưu tiên phụ: đưa dòng có ký tự đặc biệt xuống dưới
    if (a.hasSpecialChars !== b.hasSpecialChars) return a.hasSpecialChars ? 1 : -1;
  }

  // Ưu tiên 2: Sắp xếp theo A-Z (nếu có chọn)
  if (sortOptions.sortType.type) {
    const sensitivity = caseSensitive ? 'variant' : 'base';
    const valA = sortOptions.sortType.type === 'chinese' ? a.chinesePart : a.vietnamesePart;
    const valB = sortOptions.sortType.type === 'chinese' ? b.chinesePart : b.vietnamesePart;
    const locale = sortOptions.sortType.type === 'chinese' ? 'zh' : 'vi';
    return valA.localeCompare(valB, locale, { sensitivity }) * sortOptions.sortType.direction;
  }

  return 0; // Không có thay đổi nếu không có tiêu chí nào
};


// --- Hàm chính của Worker ---
// THAY THẾ TOÀN BỘ HÀM self.onmessage BẰNG HÀM MỚI NÀY
self.onmessage = (event) => {
  const { fileContent, comparisonOptions, sortOptions } = event.data;
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const totalLines = lines.length;
  // Đặt khoảng thời gian báo cáo tiến trình để tránh gửi quá nhiều tin nhắn
  const reportInterval = Math.max(1000, Math.floor(totalLines / 100));

  // --- Giai đoạn 1: Xử lý xung đột viết hoa/thường ---
  postMessage({ type: 'status', message: 'Giai đoạn 1/4: Xử lý xung đột viết hoa/thường...' });
  const resolvedLines = [];
  const resolvedMap = new Map();
  if (!comparisonOptions.caseSensitive) {
    const groups = {};
    lines.forEach(line => {
      const key = cleanTextForComparison(line, comparisonOptions);
      if (!groups[key]) groups[key] = new Set();
      groups[key].add(line);
    });

    Object.values(groups).forEach(groupSet => {
      const group = Array.from(groupSet);
      resolvedLines.push(group.length > 1 ? getLineWithMostUppercase(group) : group[0]);
    });
  } else {
    resolvedLines.push(...lines);
  }
  postMessage({ type: 'progress', value: 15 });

  // --- Giai đoạn 2: Tìm dòng duy nhất và dòng trùng lặp ---
  postMessage({ type: 'status', message: `Giai đoạn 2/4: Tìm và lọc ${totalLines.toLocaleString('vi-VN')} dòng...` });
  const lineGroupsMap = new Map();
  resolvedLines.forEach((originalLine, index) => {
    const key = cleanTextForComparison(originalLine, comparisonOptions);
    if (!lineGroupsMap.has(key)) {
      lineGroupsMap.set(key, { originalCounts: new Map() });
    }
    const group = lineGroupsMap.get(key);
    group.originalCounts.set(originalLine, (group.originalCounts.get(originalLine) || 0) + 1);

    if ((index + 1) % reportInterval === 0) {
      const progress = 15 + Math.round(((index + 1) / totalLines) * 60);
      postMessage({ type: 'progress', value: progress });
    }
  });

  let uniqueLines = [];
  let duplicateLines = [];
  lineGroupsMap.forEach((group, key) => {
    const chosenLine = group.originalCounts.keys().next().value;
    const totalCount = Array.from(group.originalCounts.values()).reduce((sum, count) => sum + count, 0);

    uniqueLines.push(parseLineContent(chosenLine, comparisonOptions));
    if (totalCount > 1) {
      duplicateLines.push({ ...parseLineContent(chosenLine, comparisonOptions), count: totalCount - 1 });
    }
  });
  postMessage({ type: 'progress', value: 75 });

  // --- Giai đoạn 3: Sắp xếp kết quả ---
  postMessage({ type: 'status', message: 'Giai đoạn 3/4: Đang sắp xếp kết quả...' });
  const comparator = createSortComparator(sortOptions, comparisonOptions.caseSensitive);
  uniqueLines.sort(comparator);
  duplicateLines.sort(comparator);
  postMessage({ type: 'progress', value: 90 });

  // --- Giai đoạn 4: Tạo nhóm tiếng Trung trùng lặp ---
  postMessage({ type: 'status', message: 'Giai đoạn 4/4: Hoàn tất và tạo nhóm...' });
  const chineseGroups = new Map();
  uniqueLines.forEach(item => {
    const key = item.chinesePart;
    if (!chineseGroups.has(key)) {
      chineseGroups.set(key, []);
    }
    chineseGroups.get(key).push(item.original);
  });

  const groupedLinesContent = [];
  chineseGroups.forEach((lines) => {
    if (lines.length > 1) {
      groupedLinesContent.push(lines.join('\n'));
    }
  });
  postMessage({ type: 'progress', value: 100 });
  postMessage({ type: 'status', message: 'Hoàn thành!' });

  // --- Gửi kết quả cuối cùng ---
  // Thêm một độ trễ nhỏ để người dùng thấy được 100%
  setTimeout(() => {
    postMessage({
      type: 'result',
      data: {
        uniqueData: uniqueLines.map(item => item.original).join('\n'),
        duplicateData: duplicateLines.map(item => `${item.original} (đã lọc ${item.count} lần)`).join('\n'),
        groupedData: groupedLinesContent.join('\n\n'),
      }
    });
  }, 500);
};