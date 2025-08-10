document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');
    const fileListElem = document.getElementById('file-list');
    const placeholderText = document.getElementById('placeholder-text');
    const mergeButton = document.getElementById('merge-button');
    const clearButton = document.getElementById('clear-button');
    const fileListHeader = document.querySelector('#file-list-container h2');

    let processedFiles = [];
    
    // Danh sách các phần mở rộng tệp sẽ bị bỏ qua (không phân biệt chữ hoa, chữ thường)
    const ignoredExtensions = [
        'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico',
        'pdf',
        'exe', 'msi'
    ];

    const isIgnored = (fileName) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return extension ? ignoredExtensions.includes(extension) : false;
    };


    // --- Hàm xử lý chính ---
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
            // Lọc ra các tệp null (bị bỏ qua) và làm phẳng mảng
            const flattenedFiles = newFilesArray.flat().filter(file => file !== null);
            
            processedFiles.push(...flattenedFiles);
            // Loại bỏ các tệp trùng lặp dựa trên đường dẫn
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
            
            // Kiểm tra nếu tệp nên bị bỏ qua
            if (isIgnored(path)) {
                console.log(`Bỏ qua tệp bị lọc: ${path}`);
                resolve(null); // Trả về null để lọc ra sau này
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ path, content: e.target.result });
            };
            reader.onerror = (e) => {
                console.error(`Lỗi khi đọc tệp ${file.name}:`, e);
                // Vẫn resolve null để không làm hỏng toàn bộ quá trình
                resolve(null); 
            };
            // Cố gắng đọc dưới dạng văn bản
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
                            // Chỉ xử lý tệp (không phải thư mục) và không nằm trong danh sách bỏ qua
                            if (!zipEntry.dir && !isIgnored(zipEntry.name)) {
                                const filePromise = zipEntry.async('string').then(content => {
                                    return { path: zipEntry.name, content };
                                }).catch(err => {
                                    console.log(`Không thể đọc tệp "${zipEntry.name}" trong ZIP dưới dạng văn bản, có thể đây là tệp nhị phân.`);
                                    return null; // Bỏ qua tệp này nếu không đọc được
                                });
                                fileReadPromises.push(filePromise);
                            } else if (!zipEntry.dir) {
                                console.log(`Bỏ qua tệp bị lọc trong ZIP: ${zipEntry.name}`);
                            }
                        });
                        return Promise.all(fileReadPromises);
                    })
                    .then(filesData => {
                        // Lọc ra các tệp null không đọc được
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


    // --- Gán các sự kiện ---
    browseButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

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
    
    updateUI();
});
