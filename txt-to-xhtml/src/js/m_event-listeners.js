export function _bindEventListeners() {
  const debouncedSave = this._debounce(() => this._saveState(), 500);
  const debouncedUpdateAndSave = this._debounce(() => {
    this.updateAndPerformConversion();
    this._saveState();
  }, this.config.debounceDelay);

  // --- CÁC LISTENER CƠ BẢN ---
  this.dom.convertBtn.addEventListener('click', () => this.performConversion());
  this.dom.pasteAndDownloadBtn.addEventListener('click', () => this._pasteAndDownload());
  this.dom.pasteBtn.addEventListener('click', () => this._pasteFromClipboard());
  this.dom.copyBtn.addEventListener('click', () => this._copyToClipboard());
  this.dom.clearBtn.addEventListener('click', () => this._clearAll());
  this.dom.exportBtn.addEventListener('click', () => this._handleExport());
  this.dom.exportOptionSelect.addEventListener('change', () => { this._updateFileNamePreview(); debouncedSave(); });
  this.dom.decreaseFontBtn.addEventListener('click', () => this._adjustGlobalFontSize('decrease'));
  this.dom.increaseFontBtn.addEventListener('click', () => this._adjustGlobalFontSize('increase'));
  this.dom.currentFontSizeInput.addEventListener('change', () => this._handleFontSizeInputChange());
  this.dom.inputText.addEventListener('input', debouncedUpdateAndSave);
  this.dom.htmlHeaderInput.addEventListener('input', debouncedUpdateAndSave);
  this.dom.htmlFooterInput.addEventListener('input', debouncedUpdateAndSave);
  this.dom.outputText.addEventListener('input', this._debounce(() => { this._performReverseConversion(); this._updateTextareaStats(); }, this.config.debounceDelay));
  this.dom.inputText.addEventListener('scroll', () => this._syncScroll(this.dom.inputText, this.dom.outputText));
  this.dom.outputText.addEventListener('scroll', () => this._syncScroll(this.dom.outputText, this.dom.inputText));

  // --- BATCH PROCESSING LISTENERS ---
  this.dom.batchProcessBtn.addEventListener('click', () => this._showBatchModal());
  this.dom.closeBatchProcessModalBtn.addEventListener('click', () => this._hideBatchModal());
  this.dom.batchCancelBtn.addEventListener('click', () => this._hideBatchModal());
  this.dom.batchProcessOverlay.addEventListener('click', () => this._hideBatchModal());
  this.dom.batchSelectFilesBtn.addEventListener('click', () => this.dom.batchFilesInput.click());
  this.dom.batchFilesInput.addEventListener('change', (e) => this._handleBatchFiles(e.target.files));
  this.dom.batchDropzone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); this.dom.batchDropzone.classList.add('dragover'); });
  this.dom.batchDropzone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); this.dom.batchDropzone.classList.remove('dragover'); });
  this.dom.batchDropzone.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); this.dom.batchDropzone.classList.remove('dragover'); this._handleBatchFiles(e.dataTransfer.files); });
  this.dom.batchDownloadBtn.addEventListener('click', () => this._downloadBatchResults());

  // --- CÁC LISTENER CHO BỘ LỌC, MODAL ---
  this.dom.addFilterRuleBtn.addEventListener('click', () => { this._addFilterRuleRow(); this._saveState(); });
  this.dom.clearAllFilterRulesBtn.addEventListener('click', () => {
    this._showConfirmationModal('Bạn có chắc chắn muốn xóa tất cả các quy tắc lọc không? Hành động này không thể hoàn tác.', () => { this._clearAllFilterRules(); this._saveState(); });
  });
  this.dom.toggleAllFiltersBtn.addEventListener('click', () => this._toggleAllFilterDetails());
  this.dom.filterRulesContainer.addEventListener('click', (e) => { this._handleFilterRuleActions(e); if (e.target.closest('.action-btn')) { debouncedSave(); } });
  this.dom.filterRulesContainer.addEventListener('input', debouncedUpdateAndSave);
  this.dom.filterRulesContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('rule-type-select')) {
      const ruleItem = e.target.closest('.filter-rule-item');
      if (ruleItem) this._switchRuleContentType(ruleItem, e.target.value);
    }
    this.updateAndPerformConversion();
    debouncedSave();
  });
  this.dom.exportFilterRulesBtn.addEventListener('click', () => this._exportFilterRules());
  this.dom.importFilterRulesBtn.addEventListener('click', () => this._importFilterRules());
  this.dom.loadImportedRulesBtn.addEventListener('click', () => { this._loadImportedRules(); this._saveState(); });
  this.dom.closeExportImportAreaBtn.addEventListener('click', () => this.dom.exportImportArea.classList.add('hidden'));
  this.dom.exportRulesToFileBtn.addEventListener('click', () => this._exportRulesToFile());
  this.dom.importRulesFromFileBtn.addEventListener('click', () => this.dom.importRulesFileInput.click());
  this.dom.importRulesFileInput.addEventListener('change', (e) => { this._importRulesFromFile(e); });

  const advancedSettings = [
    { toggle: this.dom.autoProcessPunctuationToggle, optionsPanel: this.dom.punctuationSubOptions, optionsBtn: this.dom.punctuationOptionsBtn },
    { toggle: this.dom.autoCapitalizationToggle, optionsPanel: this.dom.capitalizationSubOptions, optionsBtn: this.dom.capitalizationOptionsBtn },
    { toggle: this.dom.autoProcessTitleToggle, optionsPanel: this.dom.titleSubOptions, optionsBtn: this.dom.titleOptionsBtn }
  ];

  const toggleSettingsModal = (forceClose = false) => {
    const isOpen = !this.dom.settingsModal.classList.contains('hidden');
    if (forceClose || isOpen) {
      this.dom.settingsModal.classList.add('hidden');
      this.dom.settingsOverlay.classList.add('hidden');

      // Đóng tất cả các tùy chọn con khi đóng modal
      advancedSettings.forEach(setting => {
        setting.optionsPanel.classList.add('hidden');
      });

      this._saveState();
    } else {
      this.dom.settingsModal.classList.remove('hidden');
      this.dom.settingsOverlay.classList.remove('hidden');
    }
  };

  this.dom.settingsBtn.addEventListener('click', () => toggleSettingsModal());
  this.dom.closeSettingsBtn.addEventListener('click', () => toggleSettingsModal(true));
  this.dom.settingsModal.addEventListener('click', (e) => { if (e.target === this.dom.settingsModal) toggleSettingsModal(true); });
  this.dom.resetSettingsBtn.addEventListener('click', () => {
    this._showConfirmationModal('Bạn có chắc muốn reset tất cả cài đặt về mặc định không?', () => { this._resetSettings(); this._saveState(); });
  });
  this.dom.cancelBtn.addEventListener('click', () => this._hideConfirmationModal());
  this.dom.confirmationOverlay.addEventListener('click', () => this._hideConfirmationModal());
  this.dom.confirmBtn.addEventListener('click', () => {
    if (this.state.confirmationCallback) this.state.confirmationCallback();
    this._hideConfirmationModal();
  });

  const simpleToggles = [
    this.dom.xhtmlConversionToggle,
    this.dom.includeHeaderFooterToggle,
    this.dom.filterSettingToggle,
    this.dom.syncScrollSettingToggle,
    this.dom.keepOriginalFilenameToggle
  ];
  simpleToggles.forEach(toggle => {
    if (toggle) toggle.addEventListener('change', debouncedUpdateAndSave);
  });

  advancedSettings.forEach(({ toggle, optionsPanel, optionsBtn }) => {
    if (!toggle) return;
    toggle.addEventListener('change', () => {
      const isChecked = toggle.checked;
      optionsBtn.disabled = !isChecked;
      if (!isChecked) {
        optionsPanel.classList.add('hidden');
      }
      debouncedUpdateAndSave();
    });
    optionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (toggle.checked) {
        const isCurrentlyOpen = !optionsPanel.classList.contains('hidden');
        advancedSettings.forEach(otherSetting => {
          otherSetting.optionsPanel.classList.add('hidden');
        });
        if (!isCurrentlyOpen) {
          optionsPanel.classList.remove('hidden');
        }
      }
    });
  });

  const subOptionControls = [
    this.dom.subPunctuationToggle_normalizePeriodComma, this.dom.subPunctuationToggle_formatColon, this.dom.subPunctuationToggle_normalizeBrackets,
    this.dom.subCapitalization_firstLetter, this.dom.subCapitalization_afterPunctuation, this.dom.subCapitalization_afterColon,
    this.dom.subTitle_recognizeChapter, this.dom.subTitle_insertIntoTitleTag, this.dom.subTitle_headingLevelSelect
  ];
  subOptionControls.forEach(control => {
    if (control) control.addEventListener('change', debouncedUpdateAndSave);
  });

  this.dom.nameFormatRadios.forEach(radio => radio.addEventListener('change', () => { this._handleNamingOptionChange(); debouncedUpdateAndSave(); }));
  this.dom.customNameFormatInput.addEventListener('input', debouncedUpdateAndSave);
  window.addEventListener('resize', this._debounce(() => this._syncTextareaHeights(), 100));
  this.dom.inputText.addEventListener('keydown', (e) => this._handleHomeEndKeys(e, this.dom.inputText));
  this.dom.outputText.addEventListener('keydown', (e) => this._handleHomeEndKeys(e, this.dom.outputText));
}