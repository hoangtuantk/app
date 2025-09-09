import * as DOM from './m_dom.js';
import * as Actions from './m_actions.js';
import * as Content from './m_content-processor.js';
import { updateUI } from './m_ui.js';

const naturalSort = (a, b) => {
  return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
};

document.addEventListener('DOMContentLoaded', () => {
  let processedFiles = [];
  let removedFiles = [];

  const processAndUpdate = async (files, shouldSort = false) => {
    const result = await Actions.handleFiles(files);

    result.accepted.forEach(newFile => {
      if (!processedFiles.find(existing => existing.path === newFile.path)) {
        processedFiles.push(newFile);
      }
    });

    result.rejected.forEach(newFile => {
      if (!removedFiles.find(existing => existing.path === newFile.path)) {
        removedFiles.push(newFile);
      }
    });

    if (shouldSort) {
      processedFiles.sort(naturalSort);
    }

    updateUI(processedFiles, removedFiles);
  };

  DOM.browseButton.addEventListener('click', () => DOM.fileInput.click());

  DOM.fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    const shouldSort = files.length === 1 && files[0].name.toLowerCase().endsWith('.zip');
    processAndUpdate(files, shouldSort);
  });

  DOM.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.add('drag-over');
  });

  DOM.dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('drag-over');
  });

  DOM.dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('drag-over');
    const files = await Actions.getFilesFromDroppedItems(e.dataTransfer.items);
    if (files && files.length > 0) {
      processAndUpdate(files, true);
    }
  });

  DOM.fileListElem.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-file-btn')) {
      const pathToRemove = e.target.getAttribute('data-path');

      const fileIndex = processedFiles.findIndex(file => file.path === pathToRemove);

      if (fileIndex > -1) {
        const [removedFile] = processedFiles.splice(fileIndex, 1);
        removedFiles.push({ path: removedFile.path, reason: 'Bị xóa thủ công' });

        updateUI(processedFiles, removedFiles);
      }
    }
  });

  DOM.mergeButton.addEventListener('click', () => {
    if (processedFiles.length > 0) {
      const mergedContent = Content.generateMergedContent(processedFiles);
      Content.downloadTxtFile(mergedContent, 'merged_files.txt');
    }
  });

  DOM.clearButton.addEventListener('click', () => {
    processedFiles = [];
    removedFiles = [];
    DOM.fileInput.value = '';
    updateUI(processedFiles, removedFiles);
  });

  DOM.splitButton.addEventListener('click', () => {
    if (processedFiles.length > 0) {
      const contentToSplit = processedFiles[0].content;
      Actions.handleSplitFile(contentToSplit);
    } else {
      alert("Vui lòng chọn hoặc kéo một tệp đã gộp vào để tách.");
    }
  });

  updateUI(processedFiles, removedFiles);
});