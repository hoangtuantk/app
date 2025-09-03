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

const chooseBestRepresentative = (group, options) => {
  let candidates = [...group];

  // Ưu tiên 1: Lọc ra các dòng có ít khoảng trắng nhất
  if (options.ignoreWhitespace) {
    const minSpaceCount = Math.min(...candidates.map(line => (line.match(/\s/g) || []).length));
    candidates = candidates.filter(line => (line.match(/\s/g) || []).length === minSpaceCount);
    if (candidates.length === 1) return candidates[0];
  }

  // Ưu tiên 2: Từ các ứng viên còn lại, chọn dòng nhiều chữ hoa nhất
  if (!options.caseSensitive && candidates.length > 1) {
    return getLineWithMostUppercase(candidates);
  }

  // Mặc định: Trả về dòng đầu tiên nếu không có tiêu chí nào khác
  return candidates[0];
};


const createSortComparator = (sortOptions, caseSensitive) => (a, b) => {
  // Ưu tiên 1: Sắp xếp theo số lượng chữ Hán nếu được bật (direction khác 0)
  if (sortOptions.charCountDirection !== 0) {
    const countDiff = a.chineseCharCount - b.chineseCharCount;
    if (countDiff !== 0) return countDiff * sortOptions.charCountDirection; // Nhân với direction để có xuôi/ngược
    // Ưu tiên phụ: đưa dòng có ký tự đặc biệt xuống dưới
    if (a.hasSpecialChars !== b.hasSpecialChars) return a.hasSpecialChars ?
      1 : -1;
  }

  // Ưu tiên 2: Sắp xếp theo A-Z (nếu có chọn)
  if (sortOptions.sortType.type) {
    const sensitivity = caseSensitive ?
      'variant' : 'base';
    const valA = sortOptions.sortType.type === 'chinese' ? a.chinesePart : a.vietnamesePart;
    const valB = sortOptions.sortType.type === 'chinese' ?
      b.chinesePart : b.vietnamesePart;
    const locale = sortOptions.sortType.type === 'chinese' ? 'zh' : 'vi';
    return valA.localeCompare(valB, locale, { sensitivity }) * sortOptions.sortType.direction;
  }

  return 0; // Không có thay đổi nếu không có tiêu chí nào
};


// --- Hàm chính của Worker (PHIÊN BẢN SỬA LỖI) ---
self.onmessage = (event) => {
  const { fileContent, comparisonOptions, sortOptions } = event.data;
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  const totalLines = lines.length;
  const reportInterval = Math.max(1000, Math.floor(totalLines / 100));

  // --- Giai đoạn 1: Phân tích và gom nhóm TẤT CẢ các dòng tương tự ---
  postMessage({ type: 'status', message: `Giai đoạn 1/3: Phân tích và gom nhóm ${totalLines.toLocaleString('vi-VN')} dòng...` });
  const lineGroupsMap = new Map();
  lines.forEach((originalLine, index) => {
    const key = cleanTextForComparison(originalLine, comparisonOptions);
    if (!lineGroupsMap.has(key)) {
      lineGroupsMap.set(key, new Set());
    }
    lineGroupsMap.get(key).add(originalLine);

    if ((index + 1) % reportInterval === 0) {
      const progress = 50 + Math.round(((index + 1) / totalLines) * 25); // Progress from 50% to 75%
      postMessage({ type: 'progress', value: progress });
    }
  });
  postMessage({ type: 'progress', value: 50 });

  // --- Giai đoạn 2: Chọn dòng đại diện và lọc trùng lặp ---
  postMessage({ type: 'status', message: 'Giai đoạn 2/3: Chọn dòng đại diện và lọc dữ liệu...' });
  let uniqueLinesData = [];
  let duplicateLines = [];
  const lineCounts = new Map();

  // Đếm số lần xuất hiện của mỗi dòng
  lines.forEach(line => {
    lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
  });

  lineGroupsMap.forEach((groupSet) => {
    const group = Array.from(groupSet);
    const chosenLine = chooseBestRepresentative(group, comparisonOptions);
    uniqueLinesData.push(parseLineContent(chosenLine, comparisonOptions));

    // Xử lý các dòng trùng lặp
    group.forEach(lineInGroup => {
      const count = lineCounts.get(lineInGroup);
      if (lineInGroup === chosenLine) {
        if (count > 1) {
          duplicateLines.push({ ...parseLineContent(lineInGroup, comparisonOptions), count: count - 1 });
        }
      } else {
        duplicateLines.push({ ...parseLineContent(lineInGroup, comparisonOptions), count: count });
      }
    });
  });
  postMessage({ type: 'progress', value: 75 });

  // --- Giai đoạn 3: Sắp xếp, tạo nhóm và hoàn tất ---
  postMessage({ type: 'status', message: 'Giai đoạn 3/3: Đang sắp xếp và hoàn tất...' });
  const comparator = createSortComparator(sortOptions, comparisonOptions.caseSensitive);
  uniqueLinesData.sort(comparator);
  duplicateLines.sort(comparator);
  postMessage({ type: 'progress', value: 90 });

  const chineseGroups = new Map();
  uniqueLinesData.forEach(item => {
    const key = item.chinesePart;
    if (!chineseGroups.has(key)) {
      chineseGroups.set(key, []);
    }
    chineseGroups.get(key).push(item.original);
  });

  const groupedLinesContent = [];
  chineseGroups.forEach((groupLines) => {
    if (groupLines.length > 1) {
      groupedLinesContent.push(groupLines.join('\n'));
    }
  });

  postMessage({ type: 'progress', value: 100 });
  postMessage({ type: 'status', message: 'Hoàn thành!' });

  setTimeout(() => {
    postMessage({
      type: 'result',
      data: {
        uniqueData: uniqueLinesData.map(item => item.original).join('\n'),
        duplicateData: duplicateLines.map(item => `${item.original} (đã lọc ${item.count} lần)`).join('\n'),
        groupedData: groupedLinesContent.join('\n\n'),
      }
    });
  }, 500);
};