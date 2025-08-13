import * as DOM from './dom.js';
import * as Actions from './actions.js';
import * as Content from './content-processor.js';
import { updateUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    let processedFiles = [];

    const processAndUpdate = async (files) => {
        const newFiles = await Actions.handleFiles(files, processedFiles);
        processedFiles = newFiles;
        updateUI(processedFiles);
    };

    DOM.browseButton.addEventListener('click', () => DOM.fileInput.click());

    DOM.fileInput.addEventListener('change', (e) => processAndUpdate(e.target.files)); 

    DOM.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        DOM.dropZone.classList.add('drag-over');
    });

    DOM.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.remove('drag-over');
    });

    DOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.remove('drag-over');
        processAndUpdate(e.dataTransfer.files);
    });

    DOM.mergeButton.addEventListener('click', () => {
        if (processedFiles.length > 0) {
            const mergedContent = Content.generateMergedContent(processedFiles);
            Content.downloadTxtFile(mergedContent, 'merged_files.txt');
        }
    });

    DOM.clearButton.addEventListener('click', () => {
        processedFiles = Actions.clearAll();
        updateUI(processedFiles);
    });

    DOM.splitButton.addEventListener('click', () => {
        const splitFileInput = document.createElement('input');
        splitFileInput.type = 'file';
        splitFileInput.accept = '.txt';
        splitFileInput.style.display = 'none';
        splitFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                Actions.handleSplitFile(e.target.files[0]);
            }
        });
        document.body.appendChild(splitFileInput);
        splitFileInput.click();
        document.body.removeChild(splitFileInput);
    });

    updateUI(processedFiles);
});