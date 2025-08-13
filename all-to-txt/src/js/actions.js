import * as DOM from './dom.js';
import { ignoredExtensions } from './config.js';
import { parseMergedContent } from './content-processor.js';

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

export const handleFiles = async (files, processedFiles) => {
    if (files.length === 0) return [];
    DOM.mergeButton.disabled = true;
    DOM.mergeButton.textContent = 'Đang xử lý...';

    const filePromises = Array.from(files).map(file => {
        return file.name.toLowerCase().endsWith('.zip') ? handleZipFile(file) : processSingleFile(file);
    });

    try {
        const newFilesArray = await Promise.all(filePromises);
        const flattenedFiles = newFilesArray.flat().filter(file => file !== null);

        const currentFiles = [...processedFiles, ...flattenedFiles];
        const uniqueFiles = currentFiles.reduce((acc, current) => {
            if (!acc.find(item => item.path === current.path)) {
                acc.push(current);
            }
            return acc;
        }, []);
        return uniqueFiles;
    } catch (error) {
        console.error('Lỗi khi xử lý tệp:', error);
        alert('Đã xảy ra lỗi khi đọc một hoặc nhiều tệp. Vui lòng kiểm tra console.');
        return processedFiles;
    } finally {
        DOM.mergeButton.textContent = 'Gộp và Tải xuống';
    }
};

export const handleSplitFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const extractedFiles = parseMergedContent(e.target.result);
            if (extractedFiles.length === 0) {
                alert('Không tìm thấy tệp hợp lệ nào trong tệp đã gộp.');
                return;
            }
            const zip = new JSZip();
            extractedFiles.forEach(fileData => zip.file(fileData.path, fileData.content));
            const zipBlob = await zip.generateAsync({type:"blob"});
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
    reader.readAsText(file);
};

export const clearAll = () => {
    const clearedFiles = [];
    DOM.fileInput.value = '';
    return clearedFiles;
};