import * as DOM from './m_dom.js';

export const updateUI = (processedFiles, removedFiles) => {
  DOM.fileListHeader.textContent = `Các tệp đã được nhận diện (${processedFiles.length}):`;
  const hasProcessedFiles = processedFiles.length > 0;
  DOM.mergeButton.disabled = !hasProcessedFiles;
  DOM.splitButton.disabled = !hasProcessedFiles;

  if (hasProcessedFiles) {
    DOM.placeholderText.style.display = 'none';
    DOM.fileListElem.innerHTML = '';
    processedFiles.forEach(file => {
      const li = document.createElement('li');

      const fileName = document.createElement('span');
      fileName.textContent = file.path;

      const removeBtn = document.createElement('span');
      removeBtn.textContent = 'x';
      removeBtn.className = 'remove-file-btn';
      removeBtn.setAttribute('data-path', file.path);

      li.appendChild(fileName);
      li.appendChild(removeBtn);
      DOM.fileListElem.appendChild(li);
    });
  } else {
    DOM.fileListElem.innerHTML = '';
    DOM.placeholderText.style.display = 'block';
    DOM.fileListHeader.textContent = 'Các tệp đã được nhận diện:';
  }

  DOM.removedFileListHeader.textContent = `Các tệp đã bị loại bỏ (${removedFiles.length}):`;
  const hasRemovedFiles = removedFiles.length > 0;

  if (hasRemovedFiles) {
    DOM.placeholderTextRemoved.style.display = 'none';
    DOM.removedFileListElem.innerHTML = '';
    removedFiles.forEach(file => {
      const li = document.createElement('li');
      li.textContent = `${file.path}`;
      DOM.removedFileListElem.appendChild(li);
    });
  } else {
    DOM.removedFileListElem.innerHTML = '';
    DOM.placeholderTextRemoved.style.display = 'block';
    DOM.removedFileListHeader.textContent = 'Các tệp đã bị loại bỏ:';
  }
};