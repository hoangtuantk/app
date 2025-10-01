import { config } from './m_config.js';
import { state } from './m_state.js';
import { dom } from './m_dom.js';
import * as conversion from './m_conversion-module.js';
import * as filters from './m_filter-module.js';
import * as batch from './m_batch-module.js';
import * as ui from './m_ui.js';
import * as fileHandler from './m_file-handler.js';
import * as utils from './m_utils.js';
import { _bindEventListeners } from './m_event-listeners.js';

const App = {
  config,
  state,
  dom,

  ...conversion,
  ...filters,
  ...batch,
  ...ui,
  ...fileHandler,
  ...utils,

  _bindEventListeners,

  init() {
    this._cacheDomElements();
    this._bindEventListeners();
    this._loadState();
    this.updateAndPerformConversion();
    this._updateClock();
    setInterval(() => this._updateClock(), 1000);
    this._updateTextareaStats();
  },

  _cacheDomElements() {
    this.dom.inputText = document.getElementById('inputText');

    this.dom.outputText = document.getElementById('outputText');
    this.dom.convertBtn = document.getElementById('convertBtn');
    this.dom.pasteAndDownloadBtn = document.getElementById('pasteAndDownloadBtn');
    this.dom.progressBar = document.getElementById('progressBar');
    this.dom.pasteBtn = document.getElementById('pasteBtn');
    this.dom.copyBtn = document.getElementById('copyBtn');
    this.dom.clearBtn = document.getElementById('clearBtn');
    this.dom.copyNotification = document.getElementById('copyNotification');
    this.dom.htmlHeaderInput = document.getElementById('htmlHeaderInput');
    this.dom.htmlFooterInput = document.getElementById('htmlFooterInput');
    this.dom.filterRulesContainer = document.getElementById('filterRulesContainer');
    this.dom.addFilterRuleBtn = document.getElementById('addFilterRuleBtn');
    this.dom.exportFilterRulesBtn = document.getElementById('exportFilterRulesBtn');
    this.dom.importFilterRulesBtn = document.getElementById('importFilterRulesBtn');
    this.dom.clearAllFilterRulesBtn = document.getElementById('clearAllFilterRulesBtn');
    this.dom.toggleAllFiltersBtn = document.getElementById('toggleAllFiltersBtn');
    this.dom.exportImportArea = document.getElementById('exportImportArea');
    this.dom.exportImportTextarea = document.getElementById('exportImportTextarea');
    this.dom.loadImportedRulesBtn = document.getElementById('loadImportedRulesBtn');
    this.dom.closeExportImportAreaBtn = document.getElementById('closeExportImportAreaBtn');
    this.dom.exportBtn = document.getElementById('exportIconBtn');
    this.dom.exportOptionSelect = document.getElementById('exportOptionSelect');
    this.dom.decreaseFontBtn = document.getElementById('decreaseFontBtn');
    this.dom.increaseFontBtn = document.getElementById('increaseFontBtn');
    this.dom.currentFontSizeInput = document.getElementById('currentFontSizeInput');
    this.dom.liveClock = document.getElementById('live-clock');
    this.dom.detailsFilter = document.getElementById('detailsFilter');
    this.dom.detailsHeaderFooter = document.getElementById('detailsHeaderFooter');
    this.dom.inputTextStats = document.getElementById('inputTextStats');
    this.dom.outputTextStats = document.getElementById('outputTextStats');
    this.dom.outputLabel = document.getElementById('outputLabel');
    this.dom.xhtmlExportOption = this.dom.exportOptionSelect.querySelector('option[value="html"]');
    this.dom.fileNamePreview = document.getElementById('fileNamePreview');
    this.dom.punctuationOptionsBtn = document.getElementById('punctuationOptionsBtn');
    this.dom.punctuationSubOptions = document.getElementById('punctuationSubOptions');
    this.dom.subPunctuationToggle_normalizeAll = document.getElementById('subPunctuationToggle_normalizeAll');
    this.dom.subPunctuationToggle_normalizeBrackets = document.getElementById('subPunctuationToggle_normalizeBrackets');
    this.dom.settingsBtn = document.getElementById('settingsBtn');
    this.dom.settingsOverlay = document.getElementById('settingsOverlay');
    this.dom.settingsModal = document.getElementById('settingsModal');
    this.dom.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.dom.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    this.dom.xhtmlConversionToggle = document.getElementById('xhtmlConversionToggle');
    this.dom.autoProcessPunctuationToggle = document.getElementById('autoProcessPunctuationToggle');
    this.dom.includeHeaderFooterToggle = document.getElementById('includeHeaderFooterToggle');
    this.dom.filterSettingToggle = document.getElementById('filterSettingToggle');
    this.dom.syncScrollSettingToggle = document.getElementById('syncScrollSettingToggle');
    this.dom.nameFormatRadios = document.querySelectorAll('input[name="nameFormat"]');
    this.dom.customNameFormatInput = document.getElementById('customNameFormatInput');
    this.dom.customNameFormatExample = document.getElementById('customNameFormatExample');
    this.dom.confirmationOverlay = document.getElementById('confirmationOverlay');
    this.dom.confirmationModal = document.getElementById('confirmationModal');
    this.dom.confirmationMessage = document.getElementById('confirmationMessage');
    this.dom.confirmBtn = document.getElementById('confirmBtn');
    this.dom.cancelBtn = document.getElementById('cancelBtn');
    this.dom.importRulesFromFileBtn = document.getElementById('importRulesFromFileBtn');
    this.dom.exportRulesToFileBtn = document.getElementById('exportRulesToFileBtn');
    this.dom.importRulesFileInput = document.getElementById('importRulesFileInput');
    this.dom.autoCapitalizationToggle = document.getElementById('autoCapitalizationToggle');
    this.dom.capitalizationOptionsBtn = document.getElementById('capitalizationOptionsBtn');
    this.dom.capitalizationSubOptions = document.getElementById('capitalizationSubOptions');
    this.dom.subCapitalization_firstLetter = document.getElementById('subCapitalization_firstLetter');
    this.dom.subCapitalization_afterPunctuation = document.getElementById('subCapitalization_afterPunctuation');
    this.dom.subCapitalization_afterColon = document.getElementById('subCapitalization_afterColon');
    this.dom.subCapitalization_afterOpeningBracket = document.getElementById('subCapitalization_afterOpeningBracket');
    this.dom.autoProcessTitleToggle = document.getElementById('autoProcessTitleToggle');
    this.dom.titleOptionsBtn = document.getElementById('titleOptionsBtn');
    this.dom.titleSubOptions = document.getElementById('titleSubOptions');
    this.dom.subTitle_recognizeChapter = document.getElementById('subTitle_recognizeChapter');
    this.dom.subTitle_insertIntoTitleTag = document.getElementById('subTitle_insertIntoTitleTag');
    this.dom.subTitle_headingLevelSelect = document.getElementById('subTitle_headingLevelSelect');
    this.dom.keepOriginalFilenameToggle = document.getElementById('keepOriginalFilenameToggle');
    this.dom.insertLineBreaksToggle = document.getElementById('insertLineBreaksToggle');

    this.dom.batchProcessBtn = document.getElementById('batchProcessBtn');
    this.dom.batchProcessOverlay = document.getElementById('batchProcessOverlay');
    this.dom.batchProcessModal = document.getElementById('batchProcessModal');
    this.dom.closeBatchProcessModalBtn = document.getElementById('closeBatchProcessModalBtn');
    this.dom.batchCancelBtn = document.getElementById('batchCancelBtn');
    this.dom.batchDropzone = document.getElementById('batchDropzone');
    this.dom.batchSelectFilesBtn = document.getElementById('batchSelectFilesBtn');
    this.dom.batchFilesInput = document.getElementById('batchFilesInput');
    this.dom.batchProgressContainer = document.getElementById('batchProgressContainer');
    this.dom.batchStatusText = document.getElementById('batchStatusText');
    this.dom.batchProgressPercentage = document.getElementById('batchProgressPercentage');
    this.dom.batchProgressBar = document.getElementById('batchProgressBar');
    this.dom.batchLogContainer = document.getElementById('batchLogContainer');
    this.dom.batchLogOutput = document.getElementById('batchLogOutput');
    this.dom.batchDownloadBtn = document.getElementById('batchDownloadBtn');
  },

  _saveState() {
    const rules = Array.from(this.dom.filterRulesContainer.querySelectorAll('.filter-rule-item'))
      .map(item => this._getRuleDataFromDOM(item));

    const state = {
      isXhtmlMode: this.dom.xhtmlConversionToggle.checked,
      autoProcessPunctuation: this.dom.autoProcessPunctuationToggle.checked,
      subPunctuation: {
        normalizeAll: this.dom.subPunctuationToggle_normalizeAll.checked,
        normalizeBrackets: this.dom.subPunctuationToggle_normalizeBrackets.checked,
      },
      autoCapitalization: this.dom.autoCapitalizationToggle.checked,
      subCapitalization: {
        firstLetter: this.dom.subCapitalization_firstLetter.checked,
        afterPunctuation: this.dom.subCapitalization_afterPunctuation.checked,
        afterColon: this.dom.subCapitalization_afterColon.checked,
        afterOpeningBracket: this.dom.subCapitalization_afterOpeningBracket.checked,
      },
      autoProcessTitle: this.dom.autoProcessTitleToggle.checked,
      subTitle: {
        recognizeChapter: this.dom.subTitle_recognizeChapter.checked,
        insertIntoTitleTag: this.dom.subTitle_insertIntoTitleTag.checked,
        headingLevel: this.dom.subTitle_headingLevelSelect.value,
      },
      includeHeaderFooter: this.dom.includeHeaderFooterToggle.checked,
      useFilter: this.dom.filterSettingToggle.checked,
      useSyncScroll: this.dom.syncScrollSettingToggle.checked,
      keepOriginalFilename: this.dom.keepOriginalFilenameToggle.checked,
      insertLineBreaks: this.dom.insertLineBreaksToggle.checked,
      nameFormat: document.querySelector('input[name="nameFormat"]:checked').value,
      customNameFormat: this.dom.customNameFormatInput.value,
      fontSize: this.dom.currentFontSizeInput.value,
      exportOption: this.dom.exportOptionSelect.value,
      headerContent: this.dom.htmlHeaderInput.value,
      footerContent: this.dom.htmlFooterInput.value,
      filterRules: rules
    };
    localStorage.setItem(this.config.settingsKey, JSON.stringify(state));
  },

  _loadState() {
    const savedStateJSON = localStorage.getItem(this.config.settingsKey);
    let state;
    try {
      state = savedStateJSON ? JSON.parse(savedStateJSON) : this._getDefaultSettings();
    } catch (e) {
      console.error("Failed to parse saved state, using defaults.", e);
      state = this._getDefaultSettings();
    }
    this.dom.xhtmlConversionToggle.checked = state.isXhtmlMode;
    this.dom.autoProcessPunctuationToggle.checked = state.autoProcessPunctuation ?? true;
    this.dom.punctuationOptionsBtn.disabled = !(state.autoProcessPunctuation ?? true);
    if (state.subPunctuation) {
      this.dom.subPunctuationToggle_normalizeAll.checked = state.subPunctuation.normalizeAll ??
        state.subPunctuation.normalizePeriodComma ?? true;
      this.dom.subPunctuationToggle_normalizeBrackets.checked = state.subPunctuation.normalizeBrackets ?? true;
    }
    this.dom.autoCapitalizationToggle.checked = state.autoCapitalization ?? true;
    this.dom.capitalizationOptionsBtn.disabled = !(state.autoCapitalization ?? true);
    if (state.subCapitalization) {
      this.dom.subCapitalization_firstLetter.checked = state.subCapitalization.firstLetter ??
        true;
      this.dom.subCapitalization_afterPunctuation.checked = state.subCapitalization.afterPunctuation ?? true;
      this.dom.subCapitalization_afterColon.checked = state.subCapitalization.afterColon ?? true;
      this.dom.subCapitalization_afterOpeningBracket.checked = state.subCapitalization.afterOpeningBracket ?? true;
    }
    this.dom.autoProcessTitleToggle.checked = state.autoProcessTitle ?? true;
    this.dom.titleOptionsBtn.disabled = !(state.autoProcessTitle ?? true);
    if (state.subTitle) {
      this.dom.subTitle_recognizeChapter.checked = state.subTitle.recognizeChapter ??
        true;
      this.dom.subTitle_insertIntoTitleTag.checked = state.subTitle.insertIntoTitleTag ?? true;
      this.dom.subTitle_headingLevelSelect.value = state.subTitle.headingLevel ?? 'h2';
    }
    this.dom.includeHeaderFooterToggle.checked = state.includeHeaderFooter;
    this.dom.filterSettingToggle.checked = state.useFilter;
    this.dom.syncScrollSettingToggle.checked = state.useSyncScroll;
    this.dom.keepOriginalFilenameToggle.checked = state.keepOriginalFilename ?? false;
    this.dom.insertLineBreaksToggle.checked = state.insertLineBreaks ?? true;
    this.dom.exportOptionSelect.value = state.exportOption || 'html';
    this._applyFontSize(parseInt(state.fontSize, 10) || 22);
    this.dom.htmlHeaderInput.value = state.headerContent || this.config.defaultHeader;
    this.dom.htmlFooterInput.value = state.footerContent || this.config.defaultFooter;
    const nameFormatRadio = document.querySelector(`input[name="nameFormat"][value="${state.nameFormat}"]`);
    if (nameFormatRadio) nameFormatRadio.checked = true;
    this.dom.customNameFormatInput.value = state.customNameFormat;
    this._handleNamingOptionChange();
    this.dom.filterRulesContainer.innerHTML = '';
    const rulesToLoad = state.filterRules && state.filterRules.length > 0 ? state.filterRules : this.config.defaultFilterRules;
    rulesToLoad.forEach(rule => this._addFilterRuleRow(rule, null, true));
    this.updateAndPerformConversion();
  },

  _getDefaultSettings() {
    return {
      isXhtmlMode: true,
      autoProcessPunctuation: true,
      autoCapitalization: true,
      subCapitalization: {
        firstLetter: true,
        afterPunctuation: true,
        afterColon: true,
        afterOpeningBracket: true
      },
      autoProcessTitle: true,
      subTitle: {
        recognizeChapter: true,
        insertIntoTitleTag: true,
        headingLevel: 'h2'
      },
      includeHeaderFooter: true,
      useFilter: false,
      useSyncScroll: false,
      keepOriginalFilename: false,
      insertLineBreaks: true,
      nameFormat: 'chapter_prefix',
      customNameFormat: '[YYYY-MM-DD_HH-mm-ss]_[CHUONG]',
      fontSize: '22px',
      exportOption: 'html',
      headerContent: this.config.defaultHeader,
      footerContent: this.config.defaultFooter,
      filterRules: this.config.defaultFilterRules
    };
  },

  _resetSettings() {
    localStorage.removeItem(this.config.settingsKey);
    this._loadState();
    this._showNotification("Cài đặt đã được reset về mặc định.");
  },

  _loadInitialContent() {
    this._applyFontSize(parseInt(this.dom.currentFontSizeInput.value, 10));
    this._syncTextareaHeights();
  },

  updateAndPerformConversion() {
    this._updateFilterRulesCache();
    this.performConversion();
    this._updateTextareaStats();
    this._updateFileNamePreview();
  },

  async _pasteAndDownload() {
    this._setBusyState(true);
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        this._showNotification("Không có nội dung văn bản trong clipboard.", 5000, true);
        this._setBusyState(false);
        return;
      }
      this.dom.inputText.value = text;
      await this.performConversion();
      this._showNotification("Đã dán và chuyển đổi. Đang bắt đầu tải xuống...", 3000, true);

      // Thêm một khoảng chờ nhỏ để người dùng thấy thông báo
      setTimeout(() => {
        this._handleExport();
        this._setBusyState(false);
      }, 1000);

    } catch (err) {
      console.error('Lỗi khi dán hoặc tải:', err);
      this._showNotification("Lỗi: Không thể đọc nội dung từ clipboard. <br>Hãy chắc chắn bạn đã cấp quyền cho trang web.", 7000, true);
      this._setBusyState(false);
    }
  },

  async _pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        this.dom.inputText.value = text;
        this.updateAndPerformConversion();
        this._showNotification("Đã dán nội dung từ clipboard.", 3000, true);
      } else {
        this._showNotification("Không có nội dung văn bản trong clipboard.", 5000, true);
      }
    } catch (err) {
      console.error('Lỗi khi dán:', err);
      this._showNotification("Lỗi: Không thể đọc nội dung từ clipboard. <br>Hãy chắc chắn bạn đã cấp quyền cho trang web.", 7000, true);
    }
  },

};

document.addEventListener('DOMContentLoaded', () => App.init());