import * as DOM from './dom.js';

export const updateUI = (processedFiles) => {
  DOM.fileListHeader.textContent = `Các tệp đã được nhận diện (${processedFiles.length}):`;

  const hasFiles = processedFiles.length > 0;

  DOM.mergeButton.disabled = !hasFiles;
  DOM.splitButton.disabled = !hasFiles;

  if (hasFiles) {
      DOM.placeholderText.style.display = 'none';
      DOM.fileListElem.innerHTML = '';
      processedFiles.forEach(file => {
          const li = document.createElement('li');
          li.textContent = file.path;
          DOM.fileListElem.appendChild(li);
      });
  } else {
      DOM.fileListElem.innerHTML = '';
      DOM.placeholderText.style.display = 'block';
      DOM.mergeButton.disabled = true;
      DOM.splitButton.disabled = true;
      DOM.fileListHeader.textContent = 'Các tệp đã được nhận diện:';
  }
};