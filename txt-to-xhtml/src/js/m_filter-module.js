export function _applyFilters(text) {
  if (this.state.cachedFilterRules.length === 0) return text;
  let currentText = text;
  this.state.cachedFilterRules.forEach(rule => {
    if (rule.enabled && rule.regex) {
      currentText = currentText.replace(rule.regex, rule.replace);
    }
  });
  return currentText;
}

export function _handleFilterRuleActions(event) {
  const target = event.target;
  const ruleItem = target.closest('.filter-rule-item');
  if (!ruleItem) return;

  const isDuplicateBtn = target.closest('.duplicate-btn');
  const isDeleteBtn = target.closest('.delete-btn');
  const isMoveUpBtn = target.closest('.move-up-btn');
  const isMoveDownBtn = target.closest('.move-down-btn');
  const isCaseToggleBtn = target.classList.contains('case-toggle-btn');
  const isWholeWordToggleBtn = target.classList.contains('whole-word-toggle-btn');
  const isRangeFilterToggleBtn = target.classList.contains('range-filter-toggle-btn');
  const isLineModeToggleBtn = target.classList.contains('line-mode-toggle-btn');

  if (isDuplicateBtn) {
    event.preventDefault();
    const newRuleData = this._getRuleDataFromDOM(ruleItem);
    newRuleData.name += ' (Bản sao)';
    newRuleData.openByDefault = true;
    this._addFilterRuleRow(newRuleData, ruleItem);
  } else if (isDeleteBtn) {
    event.preventDefault();
    ruleItem.remove();
    this._updateMoveButtonVisibility();
  } else if (isMoveUpBtn) {
    event.preventDefault();
    this._moveRuleUp(ruleItem);
  } else if (isMoveDownBtn) {
    event.preventDefault();
    this._moveRuleDown(ruleItem);
  } else if (isLineModeToggleBtn) {
    event.preventDefault();
    const currentMode = ruleItem.dataset.lineMatchMode || 'contains';
    const newMode = currentMode === 'contains' ? 'exact' : 'contains';
    ruleItem.dataset.lineMatchMode = newMode;
    target.textContent = newMode === 'contains' ? 'Nếu dòng chứa:' : 'Nếu toàn bộ dòng chứa:';
  } else if (isCaseToggleBtn || isWholeWordToggleBtn || isRangeFilterToggleBtn) {
    event.preventDefault();
    if (isCaseToggleBtn) {
      const btn = target;
      const isCaseSensitive = !(btn.dataset.caseSensitive === 'true');
      btn.dataset.caseSensitive = isCaseSensitive;
      btn.classList.toggle('active', isCaseSensitive);
      btn.title = isCaseSensitive ? 'Phân biệt chữ Hoa/thường' : 'Không phân biệt chữ Hoa/thường';
    } else if (isWholeWordToggleBtn) {
      const btn = target;
      const isWholeWord = !(btn.dataset.wholeWord === 'true');
      btn.dataset.wholeWord = isWholeWord;
      btn.classList.toggle('active', isWholeWord);
      btn.title = isWholeWord ? 'Tìm kiếm toàn bộ từ' : 'Tìm kiếm một phần từ';
    } else if (isRangeFilterToggleBtn) {
      const fromTextarea = ruleItem.querySelector('.filter-from-input');
      const toTextarea = ruleItem.querySelector('.filter-to-input');
      const fromButton = ruleItem.querySelector('.range-filter-toggle-btn[data-target="from"]');
      const toButton = ruleItem.querySelector('.range-filter-toggle-btn[data-target="to"]');
      if (target.dataset.target === 'from') {
        fromTextarea.classList.remove('hidden');
        toTextarea.classList.add('hidden');
        fromButton.classList.add('active');
        toButton.classList.remove('active');
      } else {
        toTextarea.classList.remove('hidden');
        fromTextarea.classList.add('hidden');
        toButton.classList.add('active');
        fromButton.classList.remove('active');
      }
    }
  }
}

export function _addFilterRuleRow(ruleData = {}, insertAfterElement = null, isLoading = false) {
  const defaults = {
    type: 'regular', name: 'Quy tắc mới',
    find: '', replace: '', fromText: '', toText: '', replaceRange: '',
    caseSensitive: false, wholeWord: false, enabled: true, openByDefault: true,
    lineMatchMode: 'contains'
  };
  const data = { ...defaults, ...ruleData };

  const newItem = document.createElement('div');
  newItem.classList.add('filter-rule-item');
  newItem.dataset.ruleType = data.type;
  newItem.dataset.lineMatchMode = data.lineMatchMode;

  newItem.innerHTML = `
        <details class="rule-details" ${data.openByDefault ? 'open' : ''}>
            <summary class="rule-summary">
                <label class="toggle-switch-small">
                    <input type="checkbox" class="rule-enable-toggle" ${data.enabled ? 'checked' : ''}>
                    <span class="slider-small"></span>
                </label>
                <input type="text" class="rule-name-input flex-grow" value="${data.name}">
                <select class="rule-type-select">
                    <option value="regular" ${data.type === 'regular' ? 'selected' : ''}>Tìm & Thay thế</option>
                    <option value="regex" ${data.type === 'regex' ? 'selected' : ''}>Regex</option>
                    <option value="line" ${data.type === 'line' ? 'selected' : ''}>Lọc theo Dòng</option>
                    <option value="range" ${data.type === 'range' ? 'selected' : ''}>Lọc theo Vùng</option>
                </select>
                <button class="move-up-btn move-btn action-btn" title="Di chuyển lên">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                </button>
                <button class="move-down-btn move-btn action-btn" title="Di chuyển xuống">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                </button>
                <button class="duplicate-btn action-btn" title="Nhân bản quy tắc">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
                <button class="delete-btn action-btn" title="Xóa quy tắc">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </summary>
            <div class="rule-content p-4 pt-2">
                <div class="rule-content-section" data-type-specific="regular regex line">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <label class="rule-label-button" data-label-for="find">Tìm:</label>
                                <button class="line-mode-toggle-btn hidden">${data.lineMatchMode === 'contains' ? 'Nếu dòng chứa:' : 'Nếu toàn bộ dòng chứa:'}</button>
                            </div>
                            <textarea class="filter-find-input p-2 border rounded-md w-full bg-gray-700 border-gray-600 text-gray-200" rows="3">${data.find}</textarea>
                        </div>
                        <div>
                            <label class="rule-label-button mb-2">Thay thế bằng:</label>
                            <textarea class="filter-replace-input p-2 border rounded-md w-full bg-gray-700 border-gray-600 text-gray-200" rows="3">${data.replace}</textarea>
                        </div>
                    </div>
                </div>
                <div class="rule-content-section hidden" data-type-specific="range">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div class="flex gap-2 mb-2">
                                <button class="range-filter-toggle-btn active" data-target="from">Từ (Văn bản 1)</button>
                                <button class="range-filter-toggle-btn" data-target="to">Đến (Văn bản 2)</button>
                            </div>
                            <textarea class="filter-from-input range-filter-textarea p-2 border rounded-md w-full bg-gray-700 border-gray-600 text-gray-200" rows="5" placeholder="Ví dụ: Bắt đầu đoạn...">${data.fromText}</textarea>
                            <textarea class="filter-to-input range-filter-textarea p-2 border rounded-md w-full bg-gray-700 border-gray-600 text-gray-200 hidden" rows="5" placeholder="Ví dụ: ...kết thúc đoạn.">${data.toText}</textarea>
                        </div>
                        <div>
                            <label class="range-replace-label">Thay thế bằng:</label>
                            <textarea class="filter-replace-input-range p-2 border rounded-md w-full bg-gray-700 border-gray-600 text-gray-200 range-filter-textarea" rows="5" placeholder="Ví dụ: (Đoạn này đã bị xóa)">${data.replaceRange}</textarea>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 mt-2">
                    <button class="case-toggle-btn action-btn px-3 py-1 rounded-md text-sm font-semibold ${data.caseSensitive ? 'active' : ''}" title="${data.caseSensitive ? 'Phân biệt chữ Hoa/thường' : 'Không phân biệt chữ Hoa/thường'}" data-case-sensitive="${data.caseSensitive}">Aa</button>
                    <button class="whole-word-toggle-btn action-btn px-3 py-1 rounded-md text-sm font-semibold ${data.wholeWord ? 'active' : ''}" title="${data.wholeWord ? 'Tìm kiếm toàn bộ từ' : 'Tìm kiếm một phần từ'}" data-whole-word="${data.wholeWord}">W</button>
                </div>
            </div>
        </details>
    `;

  this._switchRuleContentType(newItem, data.type);

  if (insertAfterElement) {
    insertAfterElement.parentNode.insertBefore(newItem, insertAfterElement.nextSibling);
  } else {
    this.dom.filterRulesContainer.appendChild(newItem);
  }

  const stopPropagation = (e) => e.stopPropagation();
  newItem.querySelector('.toggle-switch-small').addEventListener('click', stopPropagation);
  newItem.querySelector('.rule-type-select').addEventListener('click', stopPropagation);

  this._updateMoveButtonVisibility();
  if (!isLoading) {
    this.updateAndPerformConversion();
  }
}

export function _switchRuleContentType(ruleItem, newType) {
  ruleItem.dataset.ruleType = newType;

  const sections = ruleItem.querySelectorAll('.rule-content-section');
  const findInput = ruleItem.querySelector('.filter-find-input');
  const replaceInput = ruleItem.querySelector('.filter-replace-input');
  const lineModeToggleBtn = ruleItem.querySelector('.line-mode-toggle-btn');
  const findLabel = ruleItem.querySelector('[data-label-for="find"]');
  const replaceLabel = ruleItem.querySelector('.filter-replace-input').previousElementSibling;

  sections.forEach(section => {
    const types = section.dataset.typeSpecific.split(' ');
    section.classList.toggle('hidden', !types.includes(newType));
  });

  lineModeToggleBtn.classList.toggle('hidden', newType !== 'line');
  findLabel.classList.toggle('hidden', newType === 'line');

  if (findLabel) {
    if (newType === 'regex') {
      findLabel.textContent = 'Biểu thức Regex:';
      findInput.placeholder = 'Ví dụ: (\\d{4})';
      replaceInput.placeholder = 'Ví dụ: Năm $1';
    } else if (newType === 'line') {
      findInput.placeholder = 'Ví dụ: quảng cáo';
      replaceInput.placeholder = 'Ví dụ: (Dòng này đã bị xóa)';
    }
    else {
      findLabel.textContent = 'Tìm:';
      findInput.placeholder = 'Ví dụ: Lỗi sai';
      replaceInput.placeholder = 'Ví dụ: Lỗi đúng';
    }
  }

  const wholeWordBtn = ruleItem.querySelector('.whole-word-toggle-btn');
  wholeWordBtn.classList.toggle('hidden', newType === 'regex' || newType === 'line');
}

export function _getRuleDataFromDOM(ruleItem) {
  return {
    type: ruleItem.dataset.ruleType,
    name: ruleItem.querySelector('.rule-name-input').value,
    enabled: ruleItem.querySelector('.rule-enable-toggle').checked,
    caseSensitive: ruleItem.querySelector('.case-toggle-btn').dataset.caseSensitive === 'true',
    wholeWord: ruleItem.querySelector('.whole-word-toggle-btn').dataset.wholeWord === 'true',
    find: ruleItem.querySelector('.filter-find-input').value,
    replace: ruleItem.querySelector('.filter-replace-input').value,
    fromText: ruleItem.querySelector('.filter-from-input').value,
    toText: ruleItem.querySelector('.filter-to-input').value,
    replaceRange: ruleItem.querySelector('.filter-replace-input-range').value,
    lineMatchMode: ruleItem.dataset.lineMatchMode || 'contains',
  };
}

export function _updateFilterRulesCache() {
  this.state.cachedFilterRules = [];
  const ruleItems = this.dom.filterRulesContainer.querySelectorAll('.filter-rule-item');
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  ruleItems.forEach(item => {
    const data = this._getRuleDataFromDOM(item);
    if (!data.enabled) return;

    try {
      let regex;
      const flags = data.caseSensitive ? 'g' : 'gi';

      if (data.type === 'range') {
        if (!data.fromText.trim() || !data.toText.trim()) return;
        const fromPattern = escapeRegex(data.fromText);
        const toPattern = escapeRegex(data.toText);
        regex = new RegExp(`${fromPattern}[\\s\\S]*?${toPattern}`, flags);
        this.state.cachedFilterRules.push({ ...data, regex, replace: data.replaceRange });

      } else if (data.type === 'line') {
        if (!data.find.trim()) return;
        const lineFlags = flags + 'm';
        const pattern = escapeRegex(data.find);
        if (data.lineMatchMode === 'exact') {
          regex = new RegExp(`^\\s*${pattern}\\s*$`, lineFlags);
        } else {
          regex = new RegExp(`^.*${pattern}.*$`, lineFlags);
        }
        this.state.cachedFilterRules.push({ ...data, regex });

      } else {
        if (!data.find.trim()) return;
        let pattern = data.find;

        if (data.type === 'regular') {
          pattern = escapeRegex(pattern);
          if (data.wholeWord) {
            pattern = `\\b${pattern}\\b`;
          }
        }

        regex = new RegExp(pattern, flags);
        this.state.cachedFilterRules.push({ ...data, regex });
      }
    } catch (e) {
      console.error("Invalid regex in filter:", data.name, e);
      this._showNotification(`Lỗi quy tắc lọc: "${data.name}" có cú pháp Regex không hợp lệ.`, 5000, true);
    }
  });
}

export function _clearAllFilterRules() {
  this.dom.filterRulesContainer.innerHTML = '';
  this.updateAndPerformConversion();
  this._showNotification("Đã xóa tất cả quy tắc lọc!");
}

export function _toggleAllFilterDetails() {
  const detailsElements = this.dom.filterRulesContainer.querySelectorAll('.rule-details');
  if (detailsElements.length === 0) return;
  const shouldOpen = ![...detailsElements].some(d => d.open);
  detailsElements.forEach(d => d.open = shouldOpen);
}

export function _exportFilterRules() {
  const exportedRules = Array.from(this.dom.filterRulesContainer.querySelectorAll('.filter-rule-item')).map(item => this._getRuleDataFromDOM(item));
  const exportedText = JSON.stringify(exportedRules, null, 2);
  this.dom.exportImportTextarea.value = exportedText;
  this.dom.exportImportArea.classList.remove('hidden');
  this.dom.exportRulesToFileBtn.classList.remove('hidden');
  this.dom.importRulesFromFileBtn.classList.add('hidden');
  this.dom.loadImportedRulesBtn.classList.add('hidden');
  this.dom.exportImportTextarea.select();
  document.execCommand('copy');
  this._showNotification("Đã sao chép quy tắc lọc (JSON) vào clipboard!");
}

export function _importFilterRules() {
  this.dom.exportImportTextarea.value = '';
  this.dom.exportImportArea.classList.remove('hidden');
  this.dom.importRulesFromFileBtn.classList.remove('hidden');
  this.dom.loadImportedRulesBtn.classList.remove('hidden');
  this.dom.exportRulesToFileBtn.classList.add('hidden');
  this.dom.exportImportTextarea.focus();
}

export function _loadImportedRules() {
  const rawText = this.dom.exportImportTextarea.value;
  if (!rawText.trim()) {
    this._showNotification("Vùng nhập liệu trống.", 3000, true);
    return;
  }
  try {
    const rules = JSON.parse(rawText);
    if (!Array.isArray(rules)) {
      throw new Error("Dữ liệu JSON không phải là một mảng.");
    }
    this.dom.filterRulesContainer.innerHTML = '';
    rules.forEach(rule => {
      if (typeof rule === 'object' && rule !== null) {
        this._addFilterRuleRow(rule);
      }
    });
    this.dom.exportImportArea.classList.add('hidden');
    this.updateAndPerformConversion();
    this._showNotification("Đã tải thành công các quy tắc lọc!");
  } catch (e) {
    this._showNotification(`Lỗi khi đọc JSON: ${e.message}`, 5000, true);
  }
}

export function _exportRulesToFile() {
  const content = this.dom.exportImportTextarea.value;
  if (!content.trim()) {
    this._showNotification("Không có quy tắc nào để lưu.", 3000);
    return;
  }
  this._downloadFile('filter_rules.json', content, 'application/json');
}

export function _importRulesFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    this.dom.exportImportTextarea.value = e.target.result;
    this._loadImportedRules();
  };
  reader.onerror = () => {
    this._showNotification("Lỗi khi đọc file.", 5000);
  };
  reader.readAsText(file);
  event.target.value = '';
}

// --- Rule Movement ---
export function _moveRuleUp(ruleItem) {
  const prevSibling = ruleItem.previousElementSibling;
  if (prevSibling) {
    this.dom.filterRulesContainer.insertBefore(ruleItem, prevSibling);
    this._updateMoveButtonVisibility();
  }
}

export function _moveRuleDown(ruleItem) {
  const nextSibling = ruleItem.nextElementSibling;
  if (nextSibling) {
    this.dom.filterRulesContainer.insertBefore(nextSibling, ruleItem);
    this._updateMoveButtonVisibility();
  }
}

export function _updateMoveButtonVisibility() {
  const ruleItems = this.dom.filterRulesContainer.querySelectorAll('.filter-rule-item');
  ruleItems.forEach((item, index) => {
    const upBtn = item.querySelector('.move-up-btn');
    const downBtn = item.querySelector('.move-down-btn');
    upBtn.classList.toggle('disabled', index === 0);
    downBtn.classList.toggle('disabled', index === ruleItems.length - 1);
  });
}