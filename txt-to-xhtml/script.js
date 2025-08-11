const App = {
    // --- CONFIGURATION ---
    config: {
        debounceDelay: 300,
        minBusyDisplayTime: 200,
        settingsKey: 'textConverterStateV3',
        defaultHeader: `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n  <title></title>\n  <link href="../Styles/stylesheet.css" rel="stylesheet" type="text/css"/>\n</head>\n<body>`,
        defaultFooter: `</body>\n</html>`,
        defaultFilterRules: [
            { type: 'regular', name: '·', find: "·", replace: "", caseSensitive: false, wholeWord: false, enabled: false, lineMatchMode: 'contains' },
            { type: 'regular', name: 'demo', find: "demo", replace: "demo", caseSensitive: false, wholeWord: false, enabled: false, lineMatchMode: 'contains' }
        ],
    },

    // --- STATE ---
    state: {
        isSyncingScroll: false,
        cachedFilterRules: [],
        notificationTimeout: null,
        notificationClickListener: null,
        confirmationCallback: null,
    },

    // --- DOM ELEMENTS ---
    dom: {},

    init() {
        this._cacheDomElements();
        this._bindEventListeners();
        this._loadState();
        this.updateAndPerformConversion();
        this._updateClock();
        setInterval(() => this._updateClock(), 1000);
        this._updateTextareaStats();
    },

   //
    _cacheDomElements() {
        this.dom.inputText = document.getElementById('inputText');
        this.dom.outputText = document.getElementById('outputText');
        this.dom.convertBtn = document.getElementById('convertBtn');
        this.dom.progressBar = document.getElementById('progressBar');
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

        // Punctuation Sub-options
        this.dom.subPunctuationToggle_normalizePeriodComma = document.getElementById('subPunctuationToggle_normalizePeriodComma');
        this.dom.subPunctuationToggle_formatColon = document.getElementById('subPunctuationToggle_formatColon');
        this.dom.subPunctuationToggle_normalizeBrackets = document.getElementById('subPunctuationToggle_normalizeBrackets');    

        // Settings Modal Elements
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

        // Confirmation Modal Elements
        this.dom.confirmationOverlay = document.getElementById('confirmationOverlay');
        this.dom.confirmationModal = document.getElementById('confirmationModal');
        this.dom.confirmationMessage = document.getElementById('confirmationMessage');
        this.dom.confirmBtn = document.getElementById('confirmBtn');
        this.dom.cancelBtn = document.getElementById('cancelBtn');

        // Import/Export File Buttons
        this.dom.importRulesFromFileBtn = document.getElementById('importRulesFromFileBtn');
        this.dom.exportRulesToFileBtn = document.getElementById('exportRulesToFileBtn');
        this.dom.importRulesFileInput = document.getElementById('importRulesFileInput');
        this.dom.autoCapitalizationToggle = document.getElementById('autoCapitalizationToggle');
        this.dom.capitalizationOptionsBtn = document.getElementById('capitalizationOptionsBtn');
        this.dom.capitalizationSubOptions = document.getElementById('capitalizationSubOptions');
        this.dom.subCapitalization_firstLetter = document.getElementById('subCapitalization_firstLetter');
        this.dom.subCapitalization_afterPunctuation = document.getElementById('subCapitalization_afterPunctuation');
    },

    //
    _bindEventListeners() {
        const debouncedSave = this._debounce(() => this._saveState(), 500);
        const debouncedUpdateAndSave = this._debounce(() => {
            this.updateAndPerformConversion();
            this._saveState();
        }, this.config.debounceDelay);

        this.dom.convertBtn.addEventListener('click', () => this.performConversion());
        this.dom.copyBtn.addEventListener('click', () => this._copyToClipboard());
        this.dom.clearBtn.addEventListener('click', () => this._clearAll());
        this.dom.exportBtn.addEventListener('click', () => this._handleExport());
        
        this.dom.exportOptionSelect.addEventListener('change', () => {
            this._updateFileNamePreview();
            debouncedSave();
        });

        this.dom.decreaseFontBtn.addEventListener('click', () => this._adjustGlobalFontSize('decrease'));
        this.dom.increaseFontBtn.addEventListener('click', () => this._adjustGlobalFontSize('increase'));
        this.dom.currentFontSizeInput.addEventListener('change', () => this._handleFontSizeInputChange());
        this.dom.currentFontSizeInput.addEventListener('focus', (event) => {
            const input = event.target;
            const value = input.value;
            const pxIndex = value.indexOf('px');
            if (pxIndex !== -1) {
                input.setSelectionRange(0, pxIndex);
            } else {
                input.select();
            }
        });

        this.dom.inputText.addEventListener('input', debouncedUpdateAndSave);
        this.dom.htmlHeaderInput.addEventListener('input', debouncedUpdateAndSave);
        this.dom.htmlFooterInput.addEventListener('input', debouncedUpdateAndSave);
        this.dom.outputText.addEventListener('input', this._debounce(() => {
            this._performReverseConversion();
            this._updateTextareaStats();
        }, this.config.debounceDelay));
        
        this.dom.inputText.addEventListener('scroll', () => this._syncScroll(this.dom.inputText, this.dom.outputText));
        this.dom.outputText.addEventListener('scroll', () => this._syncScroll(this.dom.outputText, this.dom.inputText));

        this.dom.addFilterRuleBtn.addEventListener('click', () => {
            this._addFilterRuleRow();
            this._saveState();
        });
        this.dom.clearAllFilterRulesBtn.addEventListener('click', () => {
            this._showConfirmationModal(
                'Bạn có chắc chắn muốn xóa tất cả các quy tắc lọc không? Hành động này không thể hoàn tác.',
                () => {
                    this._clearAllFilterRules();
                    this._saveState();
                }
            );
        });
        this.dom.toggleAllFiltersBtn.addEventListener('click', () => this._toggleAllFilterDetails());
        this.dom.filterRulesContainer.addEventListener('click', (e) => {
            this._handleFilterRuleActions(e);
            if (e.target.closest('.action-btn')) {
                debouncedSave();
            }
        });
        this.dom.filterRulesContainer.addEventListener('input', debouncedUpdateAndSave);
        this.dom.filterRulesContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('rule-type-select')) {
                const ruleItem = e.target.closest('.filter-rule-item');
                const newType = e.target.value;
                if (ruleItem) {
                    this._switchRuleContentType(ruleItem, newType);
                }
            }
            this.updateAndPerformConversion();
            debouncedSave();
        });
        
        // Filter rule import/export
        this.dom.exportFilterRulesBtn.addEventListener('click', () => this._exportFilterRules());
        this.dom.importFilterRulesBtn.addEventListener('click', () => this._importFilterRules());
        this.dom.loadImportedRulesBtn.addEventListener('click', () => {
            this._loadImportedRules();
            this._saveState();
        });
        this.dom.closeExportImportAreaBtn.addEventListener('click', () => this.dom.exportImportArea.classList.add('hidden'));
        this.dom.exportRulesToFileBtn.addEventListener('click', () => this._exportRulesToFile());
        this.dom.importRulesFromFileBtn.addEventListener('click', () => this.dom.importRulesFileInput.click());
        this.dom.importRulesFileInput.addEventListener('change', (e) => {
            this._importRulesFromFile(e);
        });

        // Settings Modal Listeners
        const toggleSettingsModal = (forceClose = false) => {
            const isOpen = !this.dom.settingsModal.classList.contains('hidden');
            if (forceClose || isOpen) {
                this.dom.settingsModal.classList.add('hidden');
                this.dom.settingsOverlay.classList.add('hidden');
                this._saveState(); 
            } else {
                this.dom.settingsModal.classList.remove('hidden');
                this.dom.settingsOverlay.classList.remove('hidden');
            }
        };
        this.dom.settingsBtn.addEventListener('click', () => toggleSettingsModal());
        this.dom.closeSettingsBtn.addEventListener('click', () => toggleSettingsModal(true));
        this.dom.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.dom.settingsModal) {
                toggleSettingsModal(true);
            }
        });
        
        this.dom.resetSettingsBtn.addEventListener('click', () => {
            this._showConfirmationModal(
                'Bạn có chắc muốn reset tất cả cài đặt về mặc định không?',
                () => {
                    this._resetSettings();
                    this._saveState();
                }
            );
        });

        // Confirmation Modal
        this.dom.cancelBtn.addEventListener('click', () => this._hideConfirmationModal());
        this.dom.confirmationOverlay.addEventListener('click', () => this._hideConfirmationModal());
        this.dom.confirmBtn.addEventListener('click', () => {
            if (this.state.confirmationCallback) {
                this.state.confirmationCallback();
            }
            this._hideConfirmationModal();
        });

        this.dom.punctuationOptionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.dom.punctuationSubOptions.classList.toggle('hidden');
            this._saveState();
        }); 
        
        this.dom.capitalizationOptionsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.dom.capitalizationSubOptions.classList.toggle('hidden');
            this._saveState();
        });

        this.dom.autoCapitalizationToggle.addEventListener('change', debouncedUpdateAndSave);
        this.dom.subCapitalization_firstLetter.addEventListener('change', debouncedUpdateAndSave);
        this.dom.subCapitalization_afterPunctuation.addEventListener('change', debouncedUpdateAndSave);

        // Settings controls listeners
        const settingsToggles = [
            this.dom.xhtmlConversionToggle, this.dom.autoProcessPunctuationToggle,
            this.dom.includeHeaderFooterToggle, this.dom.filterSettingToggle,
            this.dom.syncScrollSettingToggle
        ];
        settingsToggles.forEach(toggle => toggle.addEventListener('change', debouncedUpdateAndSave));
        
        this.dom.nameFormatRadios.forEach(radio => radio.addEventListener('change', () => {
            this._handleNamingOptionChange();
            debouncedUpdateAndSave();
        }));
        this.dom.customNameFormatInput.addEventListener('input', debouncedUpdateAndSave);

        // Other listeners
        window.addEventListener('resize', this._debounce(() => this._syncTextareaHeights(), 100));
        this.dom.inputText.addEventListener('keydown', (e) => this._handleHomeEndKeys(e, this.dom.inputText));
        this.dom.outputText.addEventListener('keydown', (e) => this._handleHomeEndKeys(e, this.dom.outputText));
        this.dom.subPunctuationToggle_normalizePeriodComma.addEventListener('change', debouncedUpdateAndSave);
        this.dom.subPunctuationToggle_formatColon.addEventListener('change', debouncedUpdateAndSave);
        this.dom.subPunctuationToggle_normalizeBrackets.addEventListener('change', debouncedUpdateAndSave);
    },

    // --- State Management ---
    _saveState() {
        const rules = Array.from(this.dom.filterRulesContainer.querySelectorAll('.filter-rule-item'))
                       .map(item => this._getRuleDataFromDOM(item));

        const state = {
            isPunctuationOptionsOpen: !this.dom.punctuationSubOptions.classList.contains('hidden'),
            isCapitalizationOptionsOpen: !this.dom.capitalizationSubOptions.classList.contains('hidden'), // Mới
            isXhtmlMode: this.dom.xhtmlConversionToggle.checked,
            autoProcessPunctuation: this.dom.autoProcessPunctuationToggle.checked,
            subPunctuation: {
                normalizePeriodComma: this.dom.subPunctuationToggle_normalizePeriodComma.checked,
                formatColon: this.dom.subPunctuationToggle_formatColon.checked,
                normalizeBrackets: this.dom.subPunctuationToggle_normalizeBrackets.checked,
            },
            autoCapitalization: this.dom.autoCapitalizationToggle.checked, // Mới
            subCapitalization: { // Mới
                firstLetter: this.dom.subCapitalization_firstLetter.checked,
                afterPunctuation: this.dom.subCapitalization_afterPunctuation.checked,
            },
            includeHeaderFooter: this.dom.includeHeaderFooterToggle.checked,
            useFilter: this.dom.filterSettingToggle.checked,
            useSyncScroll: this.dom.syncScrollSettingToggle.checked,
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

        // Apply settings
        this.dom.xhtmlConversionToggle.checked = state.isXhtmlMode;
        this.dom.autoProcessPunctuationToggle.checked = state.autoProcessPunctuation;
        if (state.subPunctuation) {
            this.dom.subPunctuationToggle_normalizePeriodComma.checked = state.subPunctuation.normalizePeriodComma ?? true;
            this.dom.subPunctuationToggle_formatColon.checked = state.subPunctuation.formatColon ?? true;
            this.dom.subPunctuationToggle_normalizeBrackets.checked = state.subPunctuation.normalizeBrackets ?? true;
        }

        // Mới: Tải cài đặt viết hoa
        this.dom.autoCapitalizationToggle.checked = state.autoCapitalization ?? true;
        if (state.subCapitalization) {
            this.dom.subCapitalization_firstLetter.checked = state.subCapitalization.firstLetter ?? true;
            this.dom.subCapitalization_afterPunctuation.checked = state.subCapitalization.afterPunctuation ?? true;
        }

        this.dom.includeHeaderFooterToggle.checked = state.includeHeaderFooter;
        this.dom.filterSettingToggle.checked = state.useFilter;
        this.dom.syncScrollSettingToggle.checked = state.useSyncScroll;
        
        this.dom.exportOptionSelect.value = state.exportOption || 'html';
        this._applyFontSize(parseInt(state.fontSize, 10) || 22);
        this.dom.htmlHeaderInput.value = state.headerContent || this.config.defaultHeader;
        this.dom.htmlFooterInput.value = state.footerContent || this.config.defaultFooter;

        if (state.isPunctuationOptionsOpen) {
            this.dom.punctuationSubOptions.classList.remove('hidden');
        }
        if (state.isCapitalizationOptionsOpen) { // Mới
            this.dom.capitalizationSubOptions.classList.remove('hidden');
        }

        // Apply naming format
        const nameFormatRadio = document.querySelector(`input[name="nameFormat"][value="${state.nameFormat}"]`);
        if (nameFormatRadio) nameFormatRadio.checked = true;
        this.dom.customNameFormatInput.value = state.customNameFormat;
        this._handleNamingOptionChange();

        // Apply filter rules
        this.dom.filterRulesContainer.innerHTML = '';
        const rulesToLoad = state.filterRules && state.filterRules.length > 0 ? state.filterRules : this.config.defaultFilterRules;
        rulesToLoad.forEach(rule => this._addFilterRuleRow(rule, null, true));

        this.updateAndPerformConversion();
    },

    _getDefaultSettings() {
        return {
            isXhtmlMode: true,
            autoProcessPunctuation: true,
            autoCapitalization: true, // Mới
            subCapitalization: { // Mới
                firstLetter: true,
                afterPunctuation: true
            },
            includeHeaderFooter: true,
            useFilter: false,
            useSyncScroll: false,
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

    // --- Confirmation Modal ---
    _showConfirmationModal(message, onConfirm) {
        this.dom.confirmationMessage.textContent = message;
        this.state.confirmationCallback = onConfirm;
        this.dom.confirmationModal.classList.remove('hidden');
        this.dom.confirmationOverlay.classList.remove('hidden');
    },

    _hideConfirmationModal() {
        this.state.confirmationCallback = null;
        this.dom.confirmationModal.classList.add('hidden');
        this.dom.confirmationOverlay.classList.add('hidden');
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

    async performConversion() {
        this._setBusyState(true);
        const startTime = Date.now();
        const rawText = this.dom.inputText.value;

        if (!rawText.trim()) {
            this.dom.outputText.value = '';
            this._setBusyState(false);
            this._updateTextareaStats();
            this._updateFileNamePreview();
            return;
        }

        let processedText = rawText;
        if (this.dom.filterSettingToggle.checked) {
            processedText = this._applyFilters(processedText);
        }

        let htmlResult;
        if (this.dom.xhtmlConversionToggle.checked) {
            const linesForHtml = processedText.split('\n').map(line => this._processLine(line)).filter(line => line);
            htmlResult = this._buildHtml(linesForHtml);
            this.dom.outputLabel.textContent = 'Kết quả XHTML';
            this.dom.xhtmlExportOption.textContent = 'Kết quả XHTML (.xhtml)';
        } else {
            htmlResult = processedText;
            this.dom.outputLabel.textContent = 'Kết quả Chuyển Đổi';
            this.dom.xhtmlExportOption.textContent = 'Kết quả Chuyển Đổi (.txt)';
        }

        this.dom.outputText.value = htmlResult;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = this.config.minBusyDisplayTime - elapsedTime;
        if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        this._setBusyState(false);
        this._updateTextareaStats();
        this._updateFileNamePreview();
    },
    
    _performReverseConversion() {
        const htmlContent = this.dom.outputText.value;
        if (!this.dom.xhtmlConversionToggle.checked) {
            this.dom.inputText.value = htmlContent;
            this._updateTextareaStats();
            return;
        }
        let plainTextLines = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        doc.body.childNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && (node.tagName.startsWith('H') || node.tagName === 'P')) {
                if (node.textContent.trim()) {
                    plainTextLines.push(node.textContent.trim());
                    if (node.tagName.startsWith('H')) {
                        plainTextLines.push('');
                    }
                }
            }
        });
        this.dom.inputText.value = plainTextLines.join('\n');
        this._updateTextareaStats();
    },

    _processLine(line) {
        let tempLine = line.trim();
        if (!tempLine) return '';

        if (this.dom.autoProcessPunctuationToggle.checked) {
            if (this.dom.subPunctuationToggle_normalizePeriodComma.checked) {
                tempLine = tempLine.replace(/\s*([.,])\s*/g, '$1 ');
            }
            if (this.dom.subPunctuationToggle_formatColon.checked) {
                tempLine = tempLine.replace(/\s*:\s*/g, ': ');
            }

            if (this.dom.subPunctuationToggle_normalizeBrackets.checked) {
                const openBrackets = /[\(\[{“‘]/g;
                const closeBrackets = /[\)\]}”’]/g;
                const allQuotes = /["']/g;
                tempLine = tempLine.replace(/\s+([\"'‘’“”])/g, '$1'); 
                
                tempLine = tempLine.replace(/([\(\[{“‘])\s+/g, '$1');
                tempLine = tempLine.replace(/\s+([\)\]}”’])/g, '$1');
                tempLine = tempLine.replace(/([^\s\(\[{“‘])([\({\[“‘])/g, '$1 $2');
                tempLine = tempLine.replace(/([\)\]}”’])([^\s.,\)\]}”’])/g, '$1 $2');
                tempLine = tempLine.split('\n').map(singleLine => {
                    let inDoubleQuote = false;
                    let inSingleQuote = false;
                    let correctedLine = '';
                    for (let i = 0; i < singleLine.length; i++) {
                        const char = singleLine[i];
                        const prevChar = i > 0 ? singleLine[i-1] : ' ';
                        const nextChar = i < singleLine.length - 1 ? singleLine[i+1] : ' ';

                        if (char === '"') {
                            if (!inDoubleQuote) {
                                if (prevChar !== ' ' && !prevChar.match(openBrackets)) correctedLine += ' ';
                                correctedLine += char;
                                if (nextChar === ' ') {
                                    i++;
                                }
                            } else {
                                if (prevChar === ' ') correctedLine = correctedLine.slice(0,-1);
                                correctedLine += char;
                                if (nextChar !== ' ' && !nextChar.match(closeBrackets) && nextChar !=='.' && nextChar !==',') correctedLine += ' ';
                            }
                            inDoubleQuote = !inDoubleQuote;
                        } else if (char === "'") {
                            if (!inSingleQuote) {
                                if (prevChar !== ' ' && !prevChar.match(openBrackets)) correctedLine += ' ';
                                correctedLine += char;
                                if (nextChar === ' ') {
                                    i++;
                                }
                            } else {
                                if (prevChar === ' ') correctedLine = correctedLine.slice(0,-1);
                                correctedLine += char;
                                if (nextChar !== ' ' && !nextChar.match(closeBrackets) && nextChar !=='.' && nextChar !==',') correctedLine += ' ';
                            }
                            inSingleQuote = !inSingleQuote;
                        } else {
                            correctedLine += char;
                        }
                    }
                    return correctedLine.replace(/\s\s+/g, ' ');
                }).join('\n');
            }
        }
        
        if (this.dom.autoCapitalizationToggle.checked) {
            // Tùy chọn: Viết hoa sau dấu câu
            if (this.dom.subCapitalization_afterPunctuation.checked) {
                // Dấu . : ? ! và xử lý các ký tự không phải chữ cái sau dấu câu
                tempLine = tempLine.replace(/([.:?!]\s+)([^a-zA-ZÀ-ỹ]*)([a-zA-ZÀ-ỹ])/gu, (match, p1, p2, p3) => {
                    return p1 + p2 + p3.toUpperCase();
                });
            }

            // Tùy chọn: Viết hoa chữ cái đầu dòng
            if (this.dom.subCapitalization_firstLetter.checked) {
                tempLine = this._capitalizeFirstAlphabetic(tempLine);
            }
        }
        return tempLine;
    },
    
    _applyFilters(text) {
        if (this.state.cachedFilterRules.length === 0) return text;
        let currentText = text;
        this.state.cachedFilterRules.forEach(rule => {
            if (rule.enabled && rule.regex) {
                currentText = currentText.replace(rule.regex, rule.replace);
            }
        });
        return currentText;
    },

    _buildHtml(lines) {
        if (lines.length === 0) return '';
        let htmlOutput = '';
        let titleForHeader = '';
        const chapterPattern = /^(?:(thứ)\s*)?(chương)?\s*([\d]+|[a-zA-ZÀ-ỹ\s]+)(?:(?::\s*|\s+)(.*))?$/i;
        let firstMeaningfulProcessedLine = lines.find(l => l.trim()) || '';
        
        if (!firstMeaningfulProcessedLine) return '';

        let match = firstMeaningfulProcessedLine.match(chapterPattern);
        let isChapterLine = false;
        if (match) {
            const hasChapterKeyword = (match[1] && match[1].toLowerCase() === 'thứ') || (match[2] && match[2].toLowerCase() === 'chương');
            const hasNumberOrWord = match[3] && match[3].trim().length > 0;
            isChapterLine = hasChapterKeyword && hasNumberOrWord;
        }

        if (isChapterLine) {
            let chapterNumberDigits = this._convertVietnameseNumberWordsToDigits(match[3].trim());
            let chapterTitleRaw = match[4] ? match[4].trim() : '';

            if (chapterTitleRaw.toLowerCase().startsWith('chương: ')) {
                chapterTitleRaw = chapterTitleRaw.substring(8).trim();
            } else if (chapterTitleRaw.toLowerCase().startsWith('chương ')) {
                chapterTitleRaw = chapterTitleRaw.substring(7).trim();
            }

            titleForHeader = `Chương ${chapterNumberDigits}`;
            if (chapterTitleRaw) {
                titleForHeader += `: ${this._capitalizeFirstAlphabetic(chapterTitleRaw)}`;
            }
            titleForHeader = titleForHeader.replace(/\.$/, '');
            htmlOutput += `<h2>${titleForHeader}</h2>\n\n`;
            lines.slice(1).forEach(line => {
                if(line.trim()) htmlOutput += `<p>${line}</p>\n`;
            });
        } else {
            lines.forEach(line => {
                if(line.trim()) htmlOutput += `<p>${line}</p>\n`;
            });
        }

        if (!titleForHeader) {
            titleForHeader = firstMeaningfulProcessedLine.split(/\s+/).slice(0, 5).join(' ').replace(/\.$/, '') || 'Chuyển đổi văn bản';
        }

        if (this.dom.includeHeaderFooterToggle.checked) {
            let header = this.dom.htmlHeaderInput.value;
            header = header.replace(/<title>.*?<\/title>/, `<title>${titleForHeader}</title>`);
            htmlOutput = `${header}\n${htmlOutput.trim()}\n${this.dom.htmlFooterInput.value}`;
        }
        return htmlOutput.trim();
    },

    _handleFilterRuleActions(event) {
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
    },
    
    _addFilterRuleRow(ruleData = {}, insertAfterElement = null, isLoading = false) {
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
    },

    _switchRuleContentType(ruleItem, newType) {
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
    },
    
    _getRuleDataFromDOM(ruleItem) {
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
    },

    _updateFilterRulesCache() {
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
    },

    _clearAllFilterRules() {
        this.dom.filterRulesContainer.innerHTML = '';
        this.updateAndPerformConversion();
        this._showNotification("Đã xóa tất cả quy tắc lọc!");
    },

    _toggleAllFilterDetails() {
        const detailsElements = this.dom.filterRulesContainer.querySelectorAll('.rule-details');
        if (detailsElements.length === 0) return;
        const shouldOpen = ![...detailsElements].some(d => d.open);
        detailsElements.forEach(d => d.open = shouldOpen);
    },

    _exportFilterRules() {
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
    },

    _importFilterRules() {
        this.dom.exportImportTextarea.value = '';
        this.dom.exportImportArea.classList.remove('hidden');
        this.dom.importRulesFromFileBtn.classList.remove('hidden');
        this.dom.loadImportedRulesBtn.classList.remove('hidden');
        this.dom.exportRulesToFileBtn.classList.add('hidden');
        this.dom.exportImportTextarea.focus();
    },

    _loadImportedRules() {
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
    },

    _exportRulesToFile() {
        const content = this.dom.exportImportTextarea.value;
        if (!content.trim()) {
            this._showNotification("Không có quy tắc nào để lưu.", 3000);
            return;
        }
        this._downloadFile('filter_rules.json', content, 'application/json');
    },

    _importRulesFromFile(event) {
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
    },
    
    // --- Rule Movement ---
    _moveRuleUp(ruleItem) {
        const prevSibling = ruleItem.previousElementSibling;
        if (prevSibling) {
            this.dom.filterRulesContainer.insertBefore(ruleItem, prevSibling);
            this._updateMoveButtonVisibility();
        }
    },

    _moveRuleDown(ruleItem) {
        const nextSibling = ruleItem.nextElementSibling;
        if (nextSibling) {
            this.dom.filterRulesContainer.insertBefore(nextSibling, ruleItem);
            this._updateMoveButtonVisibility();
        }
    },

    _updateMoveButtonVisibility() {
        const ruleItems = this.dom.filterRulesContainer.querySelectorAll('.filter-rule-item');
        ruleItems.forEach((item, index) => {
            const upBtn = item.querySelector('.move-up-btn');
            const downBtn = item.querySelector('.move-down-btn');
            upBtn.classList.toggle('disabled', index === 0);
            downBtn.classList.toggle('disabled', index === ruleItems.length - 1);
        });
    },

    _setBusyState(isBusy) {
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
    },
    
    _showNotification(message, duration = 5000, dismissOnClick = true) {
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
    },

    _applyFontSize(size) {
        const newSize = Math.max(10, Math.min(size, 40));
        this.dom.inputText.style.fontSize = `${newSize}px`;
        this.dom.outputText.style.fontSize = `${newSize}px`;
        if (this.dom.currentFontSizeInput) {
            this.dom.currentFontSizeInput.value = `${newSize}px`;
        }
    },

    _adjustGlobalFontSize(action) {
        let currentSize = parseInt(this.dom.currentFontSizeInput.value, 10);
        let newSize = action === 'increase' ? currentSize + 1 : currentSize - 1;
        this._applyFontSize(newSize);
        this._saveState();
    },
    
    _handleFontSizeInputChange() {
        let newSize = parseInt(this.dom.currentFontSizeInput.value, 10);
        if (isNaN(newSize)) newSize = 22;
        this._applyFontSize(newSize);
        this._saveState();
    },

    _updateClock() {
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
    },

    _syncTextareaHeights() {},

    _updateTextareaStats() {
        const inputText = this.dom.inputText.value;
        const outputText = this.dom.outputText.value;
        const inputCharCount = inputText.length;
        const inputLineCount = inputText.split('\n').length;
        const outputCharCount = outputText.length;
        const outputLineCount = outputText.split('\n').length;
        this.dom.inputTextStats.textContent = `(Ký tự: ${inputCharCount} | Dòng: ${inputLineCount})`;
        this.dom.outputTextStats.textContent = `(Ký tự: ${outputCharCount} | Dòng: ${outputLineCount})`;
    },

    _copyToClipboard() {
        if (!this.dom.outputText.value) return;
        this.dom.outputText.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        this._showNotification("Đã sao chép vào clipboard!");
    },

    _clearAll() {
        this.dom.inputText.value = '';
        this.dom.outputText.value = '';
        this.updateAndPerformConversion();
        this._saveState();
    },

    _handleExport() {
        const option = this.dom.exportOptionSelect.value;
        const baseFileName = this._getFileName();
        let files = [];

        if (option === 'html' || option === 'both') {
            if (this.dom.outputText.value) {
                const isXhtml = this.dom.xhtmlConversionToggle.checked;
                const ext = isXhtml ? '.xhtml' : '.txt';
                const mime = isXhtml ? 'application/xhtml+xml' : 'text/plain';
                const fileName = `${baseFileName}${ext}`;
                this._downloadFile(fileName, this.dom.outputText.value, mime);
                files.push(fileName);
            }
        }
        if (option === 'original' || option === 'both') {
             if (this.dom.inputText.value) {
                const fileName = `${baseFileName}_original.txt`;
                this._downloadFile(fileName, this.dom.inputText.value, 'text/plain');
                files.push(fileName);
            }
        }
        
        if (files.length > 0) {
            const message = `Đã xuất tệp thành công!<br>Tên file: <strong>${files.join(' và ')}</strong>`;
            this._showNotification(message, 5000, true);
        }
    },

    _debounce(func, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    _capitalizeFirstAlphabetic(text) {
        const match = text.match(/[a-zA-ZÀ-ỹ]/u);
        if (match) {
            const index = text.indexOf(match[0]);
            return text.substring(0, index) + text.charAt(index).toUpperCase() + text.substring(index + 1);
        }
        return text;
    },
    
    _convertVietnameseNumberWordsToDigits(text) {
        const parsedInt = parseInt(text, 10);
        if (!isNaN(parsedInt) && String(parsedInt) === text.trim()) return text;
        const unitMap={'không':0,'một':1,'hai':2,'ba':3,'bốn':4,'năm':5,'sáu':6,'bảy':7,'tám':8,'chín':9},specialUnitMap={'mốt':1,'tư':4,'lăm':5},scaleWords={'nghìn':1e3,'ngàn':1e3,'triệu':1e6,'tỷ':1e9};
        let total=0,block=0,last=0;
        text.toLowerCase().split(/\s+/).filter(w=>w).forEach((word,i,words)=>{
            if(unitMap[word]!==void 0){last=unitMap[word];block+=last}
            else if(specialUnitMap[word]!==void 0){last=specialUnitMap[word];block=i>0&&("mươi"===words[i-1]||"mười"===words[i-1])?10*Math.floor(block/10)+last:block+last}
            else if("mười"===word){block+=10;last=10}
            else if("mươi"===word){block=block-last+10*last;last=10}
            else if("trăm"===word){block=block-last+100*last;last=100}
            else if(scaleWords[word]){const scale=scaleWords[word];0===block&&0===last&&(block=1);total+=block*scale;block=0;last=0}
            else if("lẻ"===word||"linh"===word)last=0
        });
        return String(total+block);
    },
    
    _sanitizeFileName(text) {
        if (!text) return '';
        return text.toString().replace(/[\\/:"*?<>|]+/g, '');
    },

    _parseCustomFilename(format, data) {
         return format.replace(/\[([^\]]+)\]/g, (match, key) => {
            const upperKey = key.toUpperCase();
            if (data.hasOwnProperty(upperKey)) {
                return data[upperKey];
            }

            let timeFormat = key;
            let hasTimeToken = false;

            if (timeFormat.includes('hh')) {
                hasTimeToken = true;
                timeFormat = timeFormat.replace(/hh/g, data.hh + data.ampm);
            }

            const otherTokens = {
                'YYYY': data.YYYY, 'MM': data.MM, 'DD': data.DD,
                'HH': data.HH, 'mm': data.mm, 'ss': data.ss
            };

            for (const token in otherTokens) {
                if (timeFormat.includes(token)) {
                    hasTimeToken = true;
                    timeFormat = timeFormat.replace(new RegExp(token, 'g'), otherTokens[token]);
                }
            }

            return hasTimeToken ? timeFormat : match;
        });
    },

    _getFileName() {
        const now = new Date();
        const dateParts = {
            YYYY: now.getFullYear(),
            MM: String(now.getMonth() + 1).padStart(2, '0'),
            DD: String(now.getDate()).padStart(2, '0'),
            HH: String(now.getHours()).padStart(2, '0'),
            hh: String(now.getHours() % 12 || 12).padStart(2, '0'),
            mm: String(now.getMinutes()).padStart(2, '0'),
            ss: String(now.getSeconds()).padStart(2, '0'),
            ampm: now.getHours() >= 12 ? 'pm' : 'am',
        };
        
        const titleMatch = this.dom.outputText.value.match(/<title>(.*?)<\/title>/i);
        let candidate = (titleMatch && titleMatch[1].trim()) || this.dom.inputText.value.trim().split(/\s+/).slice(0, 5).join(' ');
        const chapterMatch = candidate.match(/^(?:chương\s*(?:thứ\s*)?)\s*([\d]+|[a-zA-ZÀ-ỹ\s]+)/i);

        let chapterNumber = '';
        if (chapterMatch) {
            chapterNumber = this._convertVietnameseNumberWordsToDigits(chapterMatch[1].trim());
        }
        
        const data = {
            ...dateParts,
            CHUONG: chapterNumber ? `C${chapterNumber}` : '',
            TIEUDE: this._sanitizeFileName(candidate) || 'file',
            THOIGIAN: `${dateParts.YYYY}${dateParts.MM}${dateParts.DD}_${dateParts.HH}${dateParts.mm}${dateParts.ss}`
        };

        const formatOption = document.querySelector('input[name="nameFormat"]:checked').value;
        let finalName;

        if (formatOption === 'title') {
            const rawTitle = (titleMatch && titleMatch[1].trim()) || 'untitled';
            finalName = this._sanitizeFileName(rawTitle);
        } else {
            let formatString = '';
            switch (formatOption) {
                case 'chapter_prefix':
                    formatString = '[CHUONG]_[THOIGIAN]';
                    break;
                case 'timestamp_prefix':
                    formatString = '[THOIGIAN]_[CHUONG]';
                    break;
                case 'custom':
                    formatString = this.dom.customNameFormatInput.value;
                    break;
            }
            finalName = this._parseCustomFilename(formatString, data)
                .replace(/__+/g, '_')
                .replace(/^_+|_+$/g, '');
        }

        return finalName || data.THOIGIAN; 
    },
    
    _updateFileNamePreview() {
        if (!this.dom.fileNamePreview) return;
        const filename = this._getFileName();
        const exportOption = this.dom.exportOptionSelect.value;
        const isXhtml = this.dom.xhtmlConversionToggle.checked;
        const mainExt = isXhtml ? '.xhtml' : '.txt';
        
        let fullFilename;
        let titleText;

        switch (exportOption) {
            case 'html':
                fullFilename = `${filename}${mainExt}`;
                titleText = `Tên file đầy đủ: ${fullFilename}`;
                break;
            case 'original':
                fullFilename = `${filename}_original.txt`;
                titleText = `Tên file đầy đủ: ${fullFilename}`;
                break;
            case 'both':
                const mainFile = `${filename}${mainExt}`;
                const originalFile = `${filename}_original.txt`;
                fullFilename = mainFile;
                titleText = `Sẽ xuất 2 tệp: ${mainFile} và ${originalFile}`;
                break;
            default:
                fullFilename = `${filename}${mainExt}`;
                titleText = `Tên file đầy đủ: ${fullFilename}`;
        }

        this.dom.fileNamePreview.textContent = fullFilename;
        this.dom.fileNamePreview.title = titleText;
    },

    _handleNamingOptionChange() {
        const selectedFormat = document.querySelector('input[name="nameFormat"]:checked').value;
        const isCustom = selectedFormat === 'custom';
        this.dom.customNameFormatInput.disabled = !isCustom;
        this.dom.customNameFormatExample.classList.toggle('hidden', !isCustom);
    },

    _downloadFile(filename, content, mimeType) {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    _syncScroll(source, target) {
        if (!this.dom.syncScrollSettingToggle.checked || this.state.isSyncingScroll) return;
        this.state.isSyncingScroll = true;
        
        const sourceScrollHeight = source.scrollHeight - source.clientHeight;
        const targetScrollHeight = target.scrollHeight - target.clientHeight;

        if (sourceScrollHeight <= 0) {
            this.state.isSyncingScroll = false;
            return;
        }

        const scrollRatio = source.scrollTop / sourceScrollHeight;
        target.scrollTop = scrollRatio * targetScrollHeight;

        requestAnimationFrame(() => {
            this.state.isSyncingScroll = false;
        });
    },

    _handleHomeEndKeys(e, textarea) {
        if (e.key === 'Home') {
            e.preventDefault();
            textarea.selectionStart = textarea.selectionEnd = 0;
            textarea.scrollTop = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
            textarea.scrollTop = textarea.scrollHeight;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());