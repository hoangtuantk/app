import { processText } from './m_processor.js';

/**
 * Xử lý file lớn theo từng khối (chunk) để không làm treo trình duyệt
 * @param {File} file - File người dùng chọn
 * @param {Map<string, string>} hanVietMap - Map dữ liệu Hán Việt
 * @param {function(number): void} onProgress - Callback để cập nhật tiến trình (0-100)
 * @returns {Promise<string>} - Nội dung file đã được xử lý
 */
export async function processLargeFile(file, hanVietMap, onProgress) {
  const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk
  let offset = 0;
  let resultChunks = [];
  let partialLine = '';

  while (offset < file.size) {
    const chunk = await readChunk(file, offset, CHUNK_SIZE);
    const textChunk = partialLine + new TextDecoder("utf-8").decode(chunk);

    const lines = textChunk.split('\n');
    // Giữ lại dòng cuối có thể chưa hoàn chỉnh
    partialLine = lines.pop();

    const processedChunk = processText(lines.join('\n'), hanVietMap);
    resultChunks.push(processedChunk);

    offset += CHUNK_SIZE;
    const progress = Math.min(100, Math.round((offset / file.size) * 100));
    onProgress(progress);
  }

  // Xử lý phần cuối cùng còn lại
  if (partialLine) {
    resultChunks.push(processText(partialLine, hanVietMap));
  }
  onProgress(100);

  return resultChunks.join('\n');
}

function readChunk(file, offset, size) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const slice = file.slice(offset, offset + size);
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Kích hoạt việc tải file về cho người dùng
 * @param {string} content - Nội dung file
 * @param {string} originalFilename - Tên file gốc
 */
export function downloadFile(content, originalFilename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `processed_${originalFilename}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}