document.addEventListener('DOMContentLoaded', () => {
    // --- Lấy các phần tử DOM ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');
    const fileListElem = document.getElementById('file-list');
    const placeholderText = document.getElementById('placeholder-text');
    const mergeButton = document.getElementById('merge-button');
    const clearButton = document.getElementById('clear-button');
    // Lấy phần tử h2 để hiển thị số lượng tệp
    const fileListHeader = document.querySelector('#file-list-container h2');

    // --- Biến trạng thái ---
    let processedFiles = []; // Mảng lưu trữ các tệp đã xử lý { path, content }

    // --- Hàm xử lý chính ---
    const handleFiles = async (files) => {
        if (files.length === 0) return;
        
        // Vô hiệu hóa nút gộp trong khi xử lý
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

        // Đợi tất cả các tệp được đọc và xử lý
        try {
            const newFilesArray = await Promise.all(filePromises);
            // newFilesArray là một mảng của các mảng, làm phẳng nó
            const flattenedFiles = newFilesArray.flat(); 
            
            // Thêm các tệp mới vào danh sách đã có
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
            const reader = new FileReader();
            reader.onload = (e) => {
                // Ưu tiên webkitRelativePath để giữ cấu trúc thư mục
                // Nếu không có, dùng tên tệp làm đường dẫn
                const path = file.webkitRelativePath || file.name;
                resolve({ path, content: e.target.result });
            };
            reader.onerror = (e) => {
                console.error(`Lỗi khi đọc tệp ${file.name}:`, e);
                reject(e);
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
                            // Chỉ xử lý tệp, bỏ qua thư mục
                            if (!zipEntry.dir) {
                                const filePromise = zipEntry.async('string').then(content => {
                                    return { path: zipEntry.name, content };
                                });
                                fileReadPromises.push(filePromise);
                            }
                        });
                        // Đợi tất cả các tệp trong ZIP được đọc
                        return Promise.all(fileReadPromises);
                    })
                    .then(filesData => {
                        resolve(filesData); // Trả về mảng các tệp đã đọc
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
        // Cập nhật tiêu đề với số lượng tệp chính xác
        fileListHeader.textContent = `Các tệp đã được nhận diện (${processedFiles.length}):`;

        if (processedFiles.length > 0) {
            placeholderText.style.display = 'none';
            fileListElem.innerHTML = ''; // Xóa danh sách cũ
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
            // Quay lại văn bản gốc khi không có tệp nào
            fileListHeader.textContent = 'Các tệp đã được nhận diện:';
        }
    };

    const generateMergedContent = () => {
        const separator = "\n\n/////-----(((PHÂN TÁCH GIỮA CÁC TỆP)))-----\\\\\\\n\n";
        return processedFiles.map((file, index) => {
            const fileNumber = index + 1;
            const header = `---(((---BẮT ĐẦU TỆP ${fileNumber}---)))---\n*****### TỆP ${file.path} ###*****\n\n`;
            const footer = `\n---(((---KẾT THÚC TỆP ${fileNumber}---)))---`;
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
        URL.revokeObjectURL(url); // Giải phóng bộ nhớ
    };

    const clearAll = () => {
        processedFiles = [];
        fileInput.value = ''; // Đặt lại input để có thể chọn lại cùng tệp
        updateUI();
    };


    // --- Gán các sự kiện ---

    // Mở hộp thoại chọn tệp khi nhấn nút "Browse"
    browseButton.addEventListener('click', () => {
        fileInput.click();
    });

    // Xử lý khi người dùng đã chọn tệp
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Xử lý sự kiện kéo-thả
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Ngăn hành vi mặc định của trình duyệt
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

    // Xử lý sự kiện nhấn nút
    mergeButton.addEventListener('click', () => {
        if (processedFiles.length > 0) {
            const mergedContent = generateMergedContent();
            downloadTxtFile(mergedContent);
        }
    });

    clearButton.addEventListener('click', clearAll);
    
    // Gọi updateUI một lần khi tải trang để đảm bảo trạng thái ban đầu là chính xác
    updateUI();
});