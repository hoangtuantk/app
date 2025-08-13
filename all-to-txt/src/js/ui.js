import * as DOM from './dom.js';

export const updateUI = (processedFiles) => {
  DOM.fileListHeader.textContent = `Các tệp đã được nhận diện (${processedFiles.length}):`;

  if (processedFiles.length > 0) {
      DOM.placeholderText.style.display = 'none';
      DOM.fileListElem.innerHTML = '';
      processedFiles.forEach(file => {
          const li = document.createElement('li');
          li.textContent = file.path;
          DOM.fileListElem.appendChild(li);
      });
      DOM.mergeButton.disabled = false;
  } else {
      DOM.fileListElem.innerHTML = '';
      DOM.placeholderText.style.display = 'block';
      DOM.mergeButton.disabled = true;
      DOM.fileListHeader.textContent = 'Các tệp đã được nhận diện:';
  }
};