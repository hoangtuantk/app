document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');
    const fileListElem = document.getElementById('file-list');
    const placeholderText = document.getElementById('placeholder-text');
    const mergeButton = document.getElementById('merge-button');
    const clearButton = document.getElementById('clear-button');
    const splitButton = document.getElementById('split-button');
    const fileListHeader = document.querySelector('#file-list-container h2');

    let processedFiles = [];
    
    const ignoredExtensions = [
        'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico',
        'pdf',
        'exe', 'msi'
    ];

    const isIgnored = (fileName) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension ? ignoredExtensions.includes(extension) : false;
    };

    const handleFiles = async (files) => {
        if (files.length === 0) return;
        mergeButton.disabled = true;
        mergeButton.textContent = 'Đang xử lý...';
        const filePromises = [];
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.zip')) {
                filePromises.push(handleZipFile(file));
            } else {
                filePromises.push(processSingleFile(file));
            }
        }
        try {
            const newFilesArray = await Promise.all(filePromises);
            const flattenedFiles = newFilesArray.flat().filter(file => file !== null);
            
            processedFiles.push(...flattenedFiles);
            const uniqueFiles = processedFiles.reduce((acc, current) => {
                if (!acc.find(item => item.path === current.path)) {
                    acc.push(current);
                }
                return acc;
            }, []);
            processedFiles = uniqueFiles;
        } catch (error) {
            console.error('Lỗi khi xử lý tệp:', error);
            alert('Đã xảy ra lỗi khi đọc một hoặc nhiều tệp. Vui lòng kiểm tra console.');
        }
        updateUI();
        mergeButton.textContent = 'Gộp và Tải xuống';
    };

    const processSingleFile = (file) => {
        return new Promise((resolve, reject) => {
            const path = file.webkitRelativePath || file.name;
            
            if (isIgnored(path)) {
                console.log(`Bỏ qua tệp bị lọc: ${path}`);
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ path, content: e.target.result });
            };
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
                                const filePromise = zipEntry.async('string').then(content => {
                                    return { path: zipEntry.name, content };
                                }).catch(err => {
                                    console.log(`Không thể đọc tệp "${zipEntry.name}" trong ZIP dưới dạng văn bản, có thể đây là tệp nhị phân.`);
                                    return null;
                                });
                                fileReadPromises.push(filePromise);
                            } else if (!zipEntry.dir) {
                                console.log(`Bỏ qua tệp bị lọc trong ZIP: ${zipEntry.name}`);
                            }
                        });
                        return Promise.all(fileReadPromises);
                    })
                    .then(filesData => {
                        resolve(filesData.filter(file => file !== null));
                    })
                    .catch(err => {
                        console.error('Lỗi khi giải nén file ZIP:', err);
                        reject(err);
                    });
            };
            reader.onerror = (e) => {
                console.error('Lỗi khi đọc file ZIP:', e);
                reject(e);
            };
            reader.readAsArrayBuffer(zipFile);
        });
    };

    const updateUI = () => {
        fileListHeader.textContent = `Các tệp đã được nhận diện (${processedFiles.length}):`;

        if (processedFiles.length > 0) {
            placeholderText.style.display = 'none';
            fileListElem.innerHTML = '';
            processedFiles.forEach(file => {
                const li = document.createElement('li');
                li.textContent = file.path;
                fileListElem.appendChild(li);
            });
            mergeButton.disabled = false;
        } else {
            fileListElem.innerHTML = '';
            placeholderText.style.display = 'block';
            mergeButton.disabled = true;
            fileListHeader.textContent = 'Các tệp đã được nhận diện:';
        }
    };

    const generateMergedContent = () => {
        const separator = "\n\n\n/////-----(((PHÂN TÁCH GIỮA CÁC TỆP)))-----\\\\\\\n\n\n";
        return processedFiles.map((file, index) => {
            const fileNumber = index + 1;
            const header = `---(((---BẮT ĐẦU TỆP ${fileNumber}---)))---\n*****### TỆP ${file.path} ###*****\n\n`;
            const footer = `\n\n---(((---KẾT THÚC TỆP ${fileNumber}---)))---`;
            return header + file.content + footer;
        }).join(separator);
    };

    const downloadTxtFile = (content) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_files.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const clearAll = () => {
        processedFiles = [];
        fileInput.value = ''; 
        updateUI();
    };

    const handleSplitFile = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            try {
                const extractedFiles = parseMergedContent(content);
                if (extractedFiles.length === 0) {
                    alert('Không tìm thấy tệp hợp lệ nào trong tệp đã gộp.');
                    return;
                }
                
                const zip = new JSZip();
                extractedFiles.forEach(fileData => {
                    zip.file(fileData.path, fileData.content);
                });

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
        reader.onerror = () => {
            alert('Không thể đọc tệp đã chọn.');
        };
        reader.readAsText(file);
    };
    
    const parseMergedContent = (content) => {
        const files = [];
        const separator = "\n\n\n/////-----(((PHÂN TÁCH GIỮA CÁC TỆP)))-----\\\\\\\n\n\n";
        const fileBlocks = content.split(separator);

        // ===== SỬA LỖI Ở ĐÂY =====
        // Biểu thức chính quy đã được sửa để thoát các ký tự đặc biệt: '(', ')', '*'
        const headerRegex = /^---\(\(\(---BẮT ĐẦU TỆP \d+---\)\)\)---\n\*{5}### TỆP (.+?) ###\*{5}\n\n/;
        const footerRegex = /\n\n---\(\(\(---KẾT THÚC TỆP \d+---\)\)\)---$/;
        // =========================

        for (const block of fileBlocks) {
            if (block.trim() === '') continue;

            const headerMatch = block.match(headerRegex);
            if (!headerMatch) {
                console.warn("Khối không khớp với header:", block); // Thêm log để gỡ lỗi
                continue;
            }

            const path = headerMatch[1].trim();
            let fileContent = block.replace(headerRegex, '');
            fileContent = fileContent.replace(footerRegex, '');
            
            files.push({ path, content: fileContent });
        }
        return files;
    };

    browseButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    mergeButton.addEventListener('click', () => {
        if (processedFiles.length > 0) {
            const mergedContent = generateMergedContent();
            downloadTxtFile(mergedContent);
        }
    });

    clearButton.addEventListener('click', clearAll);

    splitButton.addEventListener('click', () => {
        const splitFileInput = document.createElement('input');
        splitFileInput.type = 'file';
        splitFileInput.accept = '.txt';
        splitFileInput.style.display = 'none';
        splitFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleSplitFile(e.target.files[0]);
            }
        });
        document.body.appendChild(splitFileInput);
        splitFileInput.click();
        document.body.removeChild(splitFileInput);
    });
    
    updateUI();
});