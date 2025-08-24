import * as DOM from './m_dom.js';
import { ignoredExtensions } from './m_config.js';
import { parseMergedContent } from './m_content-processor.js';

const isIgnored = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? ignoredExtensions.includes(extension) : false;
};

const processSingleFile = (file) => {
  return new Promise((resolve) => {
    const path = file.webkitRelativePath || file.name;
    if (isIgnored(path)) {
      console.log(`Bỏ qua tệp bị lọc: ${path}`);
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve({ path, content: e.target.result });
    reader.onerror = (e) => {
      console.error(`Lỗi khi đọc tệp ${file.name}:`, e);
      resolve(null);
    };
    reader.readAsText(file);
  });
};

const handleZipFile = (zipFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      JSZip.loadAsync(e.target.result)
        .then(zip => {
          const fileReadPromises = [];
          zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir && !isIgnored(zipEntry.name)) {
              const filePromise = zipEntry.async('string').then(content => ({ path: zipEntry.name, content }))
                .catch(err => {
                  console.log(`Không thể đọc tệp "${zipEntry.name}" trong ZIP...`);
                  return null;
                });
              fileReadPromises.push(filePromise);
            } else if (!zipEntry.dir) {
              console.log(`Bỏ qua tệp bị lọc trong ZIP: ${zipEntry.name}`);
            }
          });
          return Promise.all(fileReadPromises);
        })
        .then(filesData => resolve(filesData.filter(file => file !== null)))
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(zipFile);
  });
};

export const handleFiles = async (files) => {
  if (files.length === 0) return { accepted: [], rejected: [] };

  DOM.mergeButton.disabled = true;
  DOM.mergeButton.textContent = 'Đang xử lý...';

  const allFilesPromises = Array.from(files).map(file => {
    return file.name.toLowerCase().endsWith('.zip') ? handleZipFile(file) : processSingleFile(file);
  });

  try {
    const newFilesArray = await Promise.all(allFilesPromises);
    const flattenedFiles = newFilesArray.flat().filter(file => file !== null);

    const allFileEntries = Array.from(files).flatMap(file => {
      if (file.webkitRelativePath) return { path: file.webkitRelativePath, originalFile: file };
      return { path: file.name, originalFile: file };
    });

    const accepted = [];
    const rejected = [];

    for (const file of flattenedFiles) {
      if (file.content !== undefined) {
        accepted.push(file);
      }
    }

    const acceptedPaths = accepted.map(f => f.path);

    allFileEntries.forEach(entry => {
      if (!acceptedPaths.includes(entry.path) && isIgnored(entry.path)) {
        rejected.push({ path: entry.path, reason: 'Bị lọc tự động' });
      }
    });

    const zipFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.zip'));
    for (const zipFile of zipFiles) {
      const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
      zip.forEach(relativePath => {
        if (!zip.files[relativePath].dir && isIgnored(relativePath) && !acceptedPaths.includes(relativePath)) {
          if (!rejected.find(r => r.path === relativePath)) {
            rejected.push({ path: relativePath, reason: 'Bị lọc tự động (trong zip)' });
          }
        }
      });
    }

    return { accepted, rejected };

  } catch (error) {
    console.error('Lỗi khi xử lý tệp:', error);
    alert('Đã xảy ra lỗi khi đọc một hoặc nhiều tệp. Vui lòng kiểm tra console.');
    return { accepted: [], rejected: [] };
  } finally {
    DOM.mergeButton.textContent = 'Gộp và Tải xuống';
  }
};

export const handleSplitFile = async (mergedContent) => {
  try {
    const extractedFiles = parseMergedContent(mergedContent);
    if (extractedFiles.length === 0) {
      alert('Không tìm thấy tệp hợp lệ nào trong tệp đã gộp. Định dạng có thể không đúng.');
      return;
    }
    const zip = new JSZip();
    extractedFiles.forEach(fileData => zip.file(fileData.path, fileData.content));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unmerged_files.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Lỗi khi tách tệp:", error);
    alert("Định dạng tệp đã gộp không hợp lệ hoặc đã bị hỏng.");
  }
};

export const clearAll = () => {
  const clearedFiles = [];
  DOM.fileInput.value = '';
  return clearedFiles;
};

const getFileFromFileEntry = (fileEntry) => {
  return new Promise((resolve) => fileEntry.file(resolve));
};

const getEntriesFromDirEntry = (dirEntry) => {
  const reader = dirEntry.createReader();
  return new Promise((resolve) => reader.readEntries(resolve));
};

const traverseFileTree = async (entry) => {
  if (!entry) return [];

  if (entry.isFile) {
    const file = await getFileFromFileEntry(entry);
    Object.defineProperty(file, 'webkitRelativePath', {
      value: entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath,
    });
    return [file];
  }

  if (entry.isDirectory) {
    const entries = await getEntriesFromDirEntry(entry);
    const files = await Promise.all(
      entries.map(childEntry => traverseFileTree(childEntry))
    );
    return files.flat();
  }

  return [];
};

export const getFilesFromDroppedItems = async (dataTransferItemList) => {
  if (!dataTransferItemList) return [];

  const entries = Array.from(dataTransferItemList)
    .map(item => item.webkitGetAsEntry())
    .filter(entry => entry !== null);

  const files = await Promise.all(entries.map(entry => traverseFileTree(entry)));

  return files.flat();
};
