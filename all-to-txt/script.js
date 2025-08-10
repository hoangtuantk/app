document.addEventListener('DOMContentLoaded', () => {
    // Lấy tất cả các phần tử DOM cần thiết
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const zipInput = document.getElementById('zipInput');
    const fileList = document.getElementById('fileList');
    const fileCount = document.getElementById('fileCount');
    const mergeButton = document.getElementById('mergeButton');
    const clearButton = document.getElementById('clearButton');
    const mergedOutput = document.getElementById('mergedOutput');
    const statusMessage = document.getElementById('statusMessage');

    // Mảng để lưu trữ tất cả các tệp đã chọn
    let allFiles = [];

    /**
     * Xử lý sự kiện thay đổi cho các input tệp và thư mục.
     * Thu thập tất cả các tệp và cập nhật giao diện.
     * @param {Event} event - Sự kiện thay đổi.
     */
    const handleFileSelection = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            // Thêm tệp mới vào mảng
            allFiles = [...allFiles, ...files];
            // Loại bỏ các tệp trùng lặp dựa trên đường dẫn tương đối hoặc tên tệp.
            const uniqueFiles = Array.from(new Set(allFiles.map(f => f.webkitRelativePath || f.name)))
                                     .map(path => allFiles.find(f => (f.webkitRelativePath || f.name) === path));
            allFiles = uniqueFiles;
            updateFileList();
        }
    };
    
    /**
     * Xử lý sự kiện thay đổi cho input tệp ZIP.
     * Giải nén tệp ZIP và thêm các tệp bên trong vào danh sách.
     * @param {Event} event - Sự kiện thay đổi.
     */
    const handleZipFileSelection = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        statusMessage.textContent = 'Đang giải nén tệp ZIP...';
        mergeButton.disabled = true;
        clearButton.disabled = true;

        try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);

            const zipFiles = [];
            zipContent.forEach((relativePath, zipEntry) => {
                // Bỏ qua các thư mục
                if (!zipEntry.dir) {
                    zipFiles.push({
                        name: zipEntry.name,
                        file: new Promise(async (resolve, reject) => {
                            try {
                                const blob = await zipEntry.async("blob");
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsText(blob);
                            } catch (e) {
                                reject(e);
                            }
                        })
                    });
                }
            });

            // Thêm các tệp từ ZIP vào danh sách chung
            for (const zipFile of zipFiles) {
                const content = await zipFile.file;
                // Tạo một đối tượng File giả để xử lý đồng nhất
                const fileObject = new File([content], zipFile.name, { type: 'text/plain' });
                fileObject.webkitRelativePath = zipFile.name; // Gán đường dẫn tương đối để hiển thị
                allFiles.push(fileObject);
            }
            
            // Loại bỏ các tệp trùng lặp
            const uniqueFiles = Array.from(new Set(allFiles.map(f => f.webkitRelativePath || f.name)))
                                     .map(path => allFiles.find(f => (f.webkitRelativePath || f.name) === path));
            allFiles = uniqueFiles;

            updateFileList();
            statusMessage.textContent = 'Đã giải nén tệp ZIP thành công.';

        } catch (error) {
            console.error('Lỗi khi giải nén tệp ZIP:', error);
            statusMessage.textContent = `Đã xảy ra lỗi khi giải nén: ${error.message}.`;
        } finally {
            mergeButton.disabled = false;
            clearButton.disabled = false;
            // Đặt lại input để có thể chọn lại cùng một file
            zipInput.value = null;
        }
    };


    /**
     * Cập nhật danh sách các tệp đã chọn được hiển thị trên giao diện.
     */
    const updateFileList = () => {
        fileList.innerHTML = '';
        fileCount.textContent = allFiles.length;
        if (allFiles.length === 0) {
            fileList.innerHTML = '<li class="text-gray-500">Chưa có tệp nào được chọn.</li>';
            mergeButton.disabled = true;
            clearButton.disabled = true;
        } else {
            allFiles.forEach(file => {
                const listItem = document.createElement('li');
                // Sử dụng webkitRelativePath cho thư mục, hoặc file.name cho các tệp riêng lẻ
                listItem.textContent = file.webkitRelativePath || file.name;
                listItem.className = 'py-1 border-b border-gray-700 last:border-0 truncate list-item';
                fileList.appendChild(listItem);
            });
            mergeButton.disabled = false;
            clearButton.disabled = false;
            statusMessage.textContent = `${allFiles.length} tệp đã được chọn. Sẵn sàng để gộp.`;
        }
    };

    /**
     * Đọc nội dung của một tệp tin và trả về một Promise.
     * @param {File} file - Tệp tin cần đọc.
     * @returns {Promise<string>} Một Promise giải quyết với nội dung tệp dưới dạng chuỗi.
     */
    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    /**
     * Gộp nội dung của tất cả các tệp đã chọn thành một chuỗi duy nhất
     * và kích hoạt quá trình tải xuống.
     */
    const mergeAndDownload = async () => {
        if (allFiles.length === 0) {
            statusMessage.textContent = 'Vui lòng chọn tệp trước khi gộp.';
            return;
        }

        statusMessage.textContent = 'Đang xử lý và gộp tệp...';
        mergeButton.disabled = true;
        clearButton.disabled = true;

        try {
            // Sắp xếp các tệp theo thứ tự bảng chữ cái của đường dẫn để đảm bảo thứ tự đầu ra nhất quán
            const sortedFiles = allFiles.sort((a, b) => {
                const pathA = a.webkitRelativePath || a.name;
                const pathB = b.webkitRelativePath || b.name;
                return pathA.localeCompare(pathB);
            });

            // Đọc nội dung của tất cả các tệp bất đồng bộ
            const fileContentsPromises = sortedFiles.map(readFileContent);
            const contents = await Promise.all(fileContentsPromises);

            // Xây dựng chuỗi đã gộp cuối cùng theo định dạng đã chỉ định
            let mergedText = '';
            sortedFiles.forEach((file, index) => {
                const fileNumber = index + 1;
                const relativePath = file.webkitRelativePath || file.name;
                
                mergedText += `---(((---TỆP ${fileNumber}---)))---\n`;
                mergedText += `***** TỆP ${relativePath} *****\n`;
                mergedText += `${contents[index]}\n`;
                mergedText += `---(((---HẾT TỆP ${fileNumber}---)))---\n\n`;

                if (index < sortedFiles.length - 1) {
                    mergedText += `/////-----(((PHÂN TÁCH GIỮA CÁC TỆP)))-----\\\\\\\\`;
                    mergedText += `\n\n`;
                }
            });

            mergedOutput.value = mergedText;
            downloadFile(mergedText);
            statusMessage.textContent = 'Đã gộp thành công! Tệp đang được tải xuống.';

        } catch (error) {
            console.error('Lỗi khi đọc hoặc gộp tệp:', error);
            statusMessage.textContent = `Đã xảy ra lỗi: ${error.message}. Vui lòng thử lại.`;
        } finally {
            mergeButton.disabled = false;
            clearButton.disabled = false;
        }
    };

    /**
     * Tạo và kích hoạt tải xuống một tệp văn bản với nội dung đã cho.
     * @param {string} content - Nội dung văn bản cần tải xuống.
     */
    const downloadFile = (content) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'gop_noi_dung.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /**
     * Xóa tất cả các tệp đã chọn.
     */
    const clearFiles = () => {
        allFiles = [];
        fileInput.value = ''; // Đặt lại giá trị input để có thể chọn lại tệp giống nhau
        folderInput.value = '';
        zipInput.value = '';
        updateFileList();
        statusMessage.textContent = 'Danh sách tệp đã được xóa.';
    };

    // Gắn các trình nghe sự kiện vào input và button
    fileInput.addEventListener('change', handleFileSelection);
    folderInput.addEventListener('change', handleFileSelection);
    zipInput.addEventListener('change', handleZipFileSelection);
    mergeButton.addEventListener('click', mergeAndDownload);
    clearButton.addEventListener('click', clearFiles);
    
    // Trạng thái giao diện ban đầu
    updateFileList();
});