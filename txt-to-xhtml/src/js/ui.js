
export function _setBusyState(isBusy) {
  this.dom.convertBtn.disabled = isBusy;
  this.dom.copyBtn.disabled = isBusy;
  this.dom.clearBtn.disabled = isBusy;
  if (isBusy) {
    this.dom.progressBar.style.transition = 'width 0.2s ease-out, opacity 0.1s ease-in-out';
    this.dom.progressBar.style.opacity = '1';
    this.dom.progressBar.style.width = '100%';
  } else {
    this.dom.progressBar.style.transition = 'none';
    this.dom.progressBar.style.opacity = '0';
    this.dom.progressBar.style.width = '0%';
  }
}

export function _showNotification(message, duration = 5000, dismissOnClick = true) {
  clearTimeout(this.state.notificationTimeout);
  if (this.state.notificationClickListener) {
    this.dom.copyNotification.removeEventListener('click', this.state.notificationClickListener);
  }
  this.dom.copyNotification.innerHTML = message;
  this.dom.copyNotification.classList.remove('opacity-0');
  this.state.notificationTimeout = setTimeout(() => {
    this.dom.copyNotification.classList.add('opacity-0');
  }, duration);
  if (dismissOnClick) {
    this.state.notificationClickListener = () => {
      this.dom.copyNotification.classList.add('opacity-0');
      clearTimeout(this.state.notificationTimeout);
      this.dom.copyNotification.removeEventListener('click', this.state.notificationClickListener);
    };
    this.dom.copyNotification.addEventListener('click', this.state.notificationClickListener);
  }
}

export function _applyFontSize(size) {
  const newSize = Math.max(10, Math.min(size, 40));
  this.dom.inputText.style.fontSize = `${newSize}px`;
  this.dom.outputText.style.fontSize = `${newSize}px`;
  if (this.dom.currentFontSizeInput) {
    this.dom.currentFontSizeInput.value = `${newSize}px`;
  }
}

export function _adjustGlobalFontSize(action) {
  let currentSize = parseInt(this.dom.currentFontSizeInput.value, 10);
  let newSize = action === 'increase' ? currentSize + 1 : currentSize - 1;
  this._applyFontSize(newSize);
  this._saveState();
}

export function _handleFontSizeInputChange() {
  let newSize = parseInt(this.dom.currentFontSizeInput.value, 10);
  if (isNaN(newSize)) newSize = 22;
  this._applyFontSize(newSize);
  this._saveState();
}

export function _updateClock() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timezoneOffsetMinutes = now.getTimezoneOffset();
  const timezoneOffsetHours = -timezoneOffsetMinutes / 60;
  const timezoneSign = timezoneOffsetHours >= 0 ? '+' : '';
  const timezoneString = `UTC${timezoneSign}${timezoneOffsetHours}`;
  if (this.dom.liveClock) {
    this.dom.liveClock.textContent = `${timezoneString} | ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

export function _syncTextareaHeights() { }

export function _updateTextareaStats() {
  const inputText = this.dom.inputText.value;
  const outputText = this.dom.outputText.value;
  const inputCharCount = inputText.length;
  const inputLineCount = inputText.split('\n').length;
  const outputCharCount = outputText.length;
  const outputLineCount = outputText.split('\n').length;
  this.dom.inputTextStats.textContent = `(Ký tự: ${inputCharCount} | Dòng: ${inputLineCount})`;
  this.dom.outputTextStats.textContent = `(Ký tự: ${outputCharCount} | Dòng: ${outputLineCount})`;
}

export function _copyToClipboard() {
  if (!this.dom.outputText.value) return;
  this.dom.outputText.select();
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
  this._showNotification("Đã sao chép vào clipboard!");
}

export function _clearAll() {
  this.dom.inputText.value = '';
  this.dom.outputText.value = '';
  this.updateAndPerformConversion();
  this._saveState();
}

export function _showConfirmationModal(message, onConfirm) {
  this.dom.confirmationMessage.textContent = message;
  this.state.confirmationCallback = onConfirm;
  this.dom.confirmationModal.classList.remove('hidden');
  this.dom.confirmationOverlay.classList.remove('hidden');
}

export function _hideConfirmationModal() {
  this.state.confirmationCallback = null;
  this.dom.confirmationModal.classList.add('hidden');
  this.dom.confirmationOverlay.classList.add('hidden');
}