export function _showBatchModal() {
  this.dom.batchProcessOverlay.classList.remove('hidden');
  this.dom.batchProcessModal.classList.remove('hidden');
  setTimeout(() => {
    this.dom.batchProcessOverlay.classList.add('visible');
    this.dom.batchProcessModal.querySelector('.transform').classList.add('scale-100', 'opacity-100');
    this.dom.batchProcessModal.querySelector('.transform').classList.remove('scale-95', 'opacity-0');
  }, 10);
  this._resetBatchModalUI();
}

export function _hideBatchModal() {
  this.dom.batchProcessModal.querySelector('.transform').classList.remove('scale-100', 'opacity-100');
  this.dom.batchProcessModal.querySelector('.transform').classList.add('scale-95', 'opacity-0');
  this.dom.batchProcessOverlay.classList.remove('visible');
  setTimeout(() => {
    this.dom.batchProcessOverlay.classList.add('hidden');
    this.dom.batchProcessModal.classList.add('hidden');
  }, 300);
}

export function _resetBatchModalUI() {
  this.dom.batchProgressContainer.classList.add('hidden');
  this.dom.batchDropzone.classList.remove('hidden');
  this.dom.batchLogOutput.innerHTML = '';
  this.dom.batchProgressBar.style.width = '0%';
  this.dom.batchProgressPercentage.textContent = '0%';
  this.dom.batchStatusText.textContent = 'Đang chờ tệp...';
  this.dom.batchDownloadBtn.classList.add('hidden');
  this.state.batchProcessedFiles = [];
  this.dom.batchFilesInput.value = ''; // Reset file input
}

export function _addBatchLog(message, type = 'info') {
  const logColors = {
    info: 'text-gray-400',
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
  };
  const color = logColors[type] || logColors.info;
  const timestamp = new Date().toLocaleTimeString();
  this.dom.batchLogOutput.innerHTML += `<span class="${color}">[${timestamp}] ${message}</span>\n`;
  this.dom.batchLogContainer.scrollTop = this.dom.batchLogContainer.scrollHeight;
}

export async function _handleBatchFiles(files) {
  if (files.length === 0) return;

  this.dom.batchDropzone.classList.add('hidden');
  this.dom.batchProgressContainer.classList.remove('hidden');
  this._addBatchLog(`Đã nhận ${files.length} mục. Bắt đầu xử lý...`);

  let fileQueue = [];
  const zipFiles = Array.from(files).filter(file => file.name.endsWith('.zip'));
  const otherFiles = Array.from(files).filter(file => !file.name.endsWith('.zip'));

  fileQueue.push(...otherFiles);

  for (const zipFile of zipFiles) {
    try {
      this._addBatchLog(`Đang giải nén tệp: ${zipFile.name}...`, 'warning');
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(zipFile);
      for (const filename in zip.files) {
        if (!zip.files[filename].dir) {
          const fileInZip = zip.files[filename];
          const blob = await fileInZip.async('blob');
          const extractedFile = new File([blob], fileInZip.name, { type: blob.type });
          const supportedExtensions = ['.txt', '.html', '.xhtml'];
          if (supportedExtensions.some(ext => extractedFile.name.endsWith(ext))) {
            fileQueue.push(extractedFile);
            this._addBatchLog(`Đã tìm thấy tệp hợp lệ trong zip: ${extractedFile.name}`);
          }
        }
      }
    } catch (error) {
      this._addBatchLog(`Lỗi khi giải nén ${zipFile.name}: ${error.message}`, 'error');
    }
  }

  if (fileQueue.length === 0) {
    this._addBatchLog(`Không tìm thấy tệp hợp lệ để xử lý.`, 'error');
    this.dom.batchStatusText.textContent = 'Không có tệp hợp lệ.';
    return;
  }

  await this._processFileQueue(fileQueue);
}

export async function _processFileQueue(queue) {
  const totalFiles = queue.length;
  this.state.batchProcessedFiles = [];
  for (let i = 0; i < totalFiles; i++) {
    const file = queue[i];
    const currentFileNumber = i + 1;

    this.dom.batchStatusText.textContent = `Đang xử lý: ${file.name} (${currentFileNumber}/${totalFiles})`;
    this._addBatchLog(`Bắt đầu xử lý tệp ${currentFileNumber}/${totalFiles}: ${file.name}`);

    try {
      const content = await file.text();
      const isHtmlInput = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.xhtml');
      let processedContent;
      let newExt;

      if (isHtmlInput) {
        // Dịch ngược tự động cho file .html/.xhtml
        processedContent = this._htmlToPlainText(content);
        newExt = '.txt';
      } else {
        // Xử lý bình thường cho file .txt
        processedContent = await this.performConversion(content);
        const isXhtml = this.dom.xhtmlConversionToggle.checked;
        newExt = isXhtml ? '.xhtml' : '.txt';
      }

      let baseName;
      if (this.dom.keepOriginalFilenameToggle.checked) {
        baseName = file.name.split('.').slice(0, -1).join('.');
      } else {
        const sourceTextForName = isHtmlInput ? processedContent : content;
        const outputTextForName = isHtmlInput ? '' : processedContent;
        baseName = this._getFileName(sourceTextForName, outputTextForName);
      }

      // Xử lý tệp trùng tên
      let finalFileName = `${baseName}${newExt}`;
      let counter = 1;
      while (this.state.batchProcessedFiles.some(f => f.name === finalFileName)) {
        finalFileName = `${baseName}_${counter}${newExt}`;
        counter++;
      }

      this.state.batchProcessedFiles.push({ name: finalFileName, content: processedContent });
      this._addBatchLog(`✔ Xử lý thành công: ${file.name} -> ${finalFileName}`, 'success');
    } catch (error) {
      this._addBatchLog(`❌ Lỗi khi xử lý ${file.name}: ${error.message}`, 'error');
    }

    // Update progress bar
    const progress = (currentFileNumber / totalFiles) * 100;
    this.dom.batchProgressBar.style.width = `${progress}%`;
    this.dom.batchProgressPercentage.textContent = `${Math.round(progress)}%`;

    // small delay for UI update
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  this.dom.batchStatusText.textContent = `Hoàn tất! Đã xử lý ${totalFiles} tệp.`;
  this._addBatchLog(`--- Xử lý hàng loạt hoàn tất ---`, 'success');

  if (this.state.batchProcessedFiles.length > 0) {
    this.dom.batchDownloadBtn.classList.remove('hidden');
  }
}

export async function _downloadBatchResults() {
  if (this.state.batchProcessedFiles.length === 0) {
    this._addBatchLog("Không có tệp nào để tải xuống.", "error");
    return;
  }

  this._addBatchLog("Đang nén các tệp kết quả...", "warning");
  const zip = new JSZip();
  for (const file of this.state.batchProcessedFiles) {
    zip.file(file.name, file.content);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  this._downloadFile('Processed_Files.zip', zipBlob, 'application/zip');
  this._addBatchLog("Đã tạo và tải xuống tệp ZIP.", "success");
}