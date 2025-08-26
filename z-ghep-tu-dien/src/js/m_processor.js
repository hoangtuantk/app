/**
 * Tải và phân tích dữ liệu từ file HanViet.txt
 * @param {string} url - Đường dẫn đến file HanViet.txt
 * @returns {Promise<Map<string, string>>} - Một Map chứa dữ liệu Hán Việt
 */
export async function loadHanVietData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const hanVietMap = new Map();
    text.split('\n').forEach(line => {
      // Xử lý các dòng có dạng 'KÝTỰ=âm' hoặc 'KÝTỰ=' (âm trống)
      if (line.includes('=')) {
        const firstEqualIndex = line.indexOf('=');
        const char = line.substring(0, firstEqualIndex).trim();
        const reading = line.substring(firstEqualIndex + 1).trim();
        if (char) { // Chỉ thêm vào map nếu có ký tự
          hanVietMap.set(char, reading);
        }
      }
    });
    return hanVietMap;
  } catch (error) {
    console.error("Không thể tải dữ liệu Hán Việt:", error);
    alert("Lỗi: Không thể tải file dữ liệu Hán Việt. Vui lòng kiểm tra console.");
    return new Map();
  }
}

/**
 * Xử lý một đoạn văn bản đầu vào theo các quy tắc mới
 * @param {string} text - Dữ liệu đầu vào
 * @param {Map<string, string>} hanVietMap - Map dữ liệu Hán Việt
 * @returns {string} - Dữ liệu đã được xử lý
 */
export function processText(text, hanVietMap) {
  // Nếu không có text hoặc map, trả về text gốc ngay lập tức
  if (!text || hanVietMap.size === 0) return text;

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return text.split('\n').map(line => {
    const firstEqualIndex = line.indexOf('=');

    // Nếu dòng không có dấu '=' hoặc dấu '=' ở đầu, không xử lý, trả về dòng gốc
    if (firstEqualIndex <= 0) {
      return line;
    }

    // Lấy phần ký tự Hán (trước dấu '=') để tra cứu
    const hanCharactersPart = line.substring(0, firstEqualIndex);

    const readings = [];
    for (const char of hanCharactersPart) {
      const reading = hanVietMap.get(char);

      // QUY TẮC 1 & 2:
      // Chỉ thêm âm đọc vào mảng nếu nó được tìm thấy VÀ không phải là chuỗi rỗng.
      // Điều này sẽ bỏ qua các ký tự không có trong file Hán Việt (undefined)
      // và các ký tự có trong file nhưng giá trị trống (ví dụ: A=).
      if (reading) { // check for non-empty string
        readings.push(reading);
      }
    }

    // Nếu sau khi tra cứu, không có âm đọc hợp lệ nào được tìm thấy,
    // trả về 100% dòng gốc mà không thêm bất cứ thứ gì.
    if (readings.length === 0) {
      return line;
    }

    // QUY TẮC 3:
    // Việc chỉ join các 'reading' hợp lệ sẽ tự động loại bỏ khoảng trắng thừa.
    // Ví dụ: ['quang', '', 'diệu'] sẽ không bao giờ xảy ra, nó sẽ là ['quang', 'diệu'].
    // Kết quả join sẽ là "quang diệu", không phải "quang  diệu".
    const hvLower = readings.join(' ');
    const hvUpper = toTitleCase(hvLower);

    // QUY TẮC 4:
    // Trả về `line` (biến chứa nội dung gốc 100%) và nối thêm kết quả.
    // Không có .trim() hay bất kỳ sự thay đổi nào đối với `line`.
    return `${line}/${hvLower}/${hvUpper}`;

  }).join('\n');
}