document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO BIẾN GIAO DIỆN ---
    const viewer = document.getElementById('viewer');
    const fileInput = document.getElementById('file-input');
    const prevArea = document.getElementById('prev-area');
    const nextArea = document.getElementById('next-area');
    const bookTitleEl = document.getElementById('book-title');
    const chapterInfoEl = document.getElementById('chapter-info');
    
    // Modals & Sidebars
    const tocModal = document.getElementById('toc-modal');
    const historyModal = document.getElementById('history-modal');
    const settingsSidebar = document.getElementById('settings-sidebar');
    const alertModal = document.getElementById('custom-alert-overlay');
    const bookInfoModal = document.getElementById('book-info-modal');

    // Thông báo lưu cấu hình màu
    const promptModal = document.getElementById('custom-prompt-overlay');
    const promptMessage = document.getElementById('custom-prompt-message');
    const promptInput = document.getElementById('custom-prompt-input');
    const promptOkBtn = document.getElementById('custom-prompt-ok');
    const promptCancelBtn = document.getElementById('custom-prompt-cancel');

    // Nút điều khiển
    const homeBtn = document.getElementById('home-btn');
    const tocBtn = document.getElementById('toc-btn');
    const historyBtn = document.getElementById('history-btn');
    const settingsBtn = document.getElementById('settings-btn');

    // Nội dung động
    const tocList = document.getElementById('toc-list');
    const tocSearch = document.getElementById('toc-search');
    const historyList = document.getElementById('history-list');
    const importedFilesList = document.getElementById('imported-files-list');
    const sortBooksSelect = document.getElementById('sort-books-select');

    // Cài đặt
    const fontSizeInput = document.getElementById('font-size-input');
    const fontSizeValue = document.getElementById('font-size-value');
    const fontFamilySelect = document.getElementById('font-family-select');
    const colorThemesContainer = document.getElementById('color-themes-container');
    const bgColorPicker = document.getElementById('bg-color-picker');
    const textColorPicker = document.getElementById('text-color-picker');
    const deleteAllDataBtn = document.getElementById('delete-all-data');
    const originalFormatToggle = document.getElementById('original-format-toggle');
    const addThemeBtn = document.getElementById('add-theme-btn');

    // --- BIẾN TRẠNG THÁI ---
    let book, rendition, currentBookId, currentBookType;
    const dbName = 'EbookReaderDB_v2';
    let db;
    let settings = {
        fontSize: 32, fontFamily: 'Arial', activeThemeName: 'Hồng', keepOriginalFormat: false, sortOrder: 'lastOpened',
        customColors: { bg: '#1a1a1a', text: '#e0e0e0' },
        themes: [
        { name: 'Tối', bg: '#121212', text: '#E0E0E0', surface: '#1e1e1e', border: '#3a3a3a', isCustom: false },
        { name: 'Giấy', bg: '#FBF0D9', text: '#5B4636', surface: '#f4e8c8', border: '#e6d5b0', isCustom: false },
        { name: 'Xám', bg: '#D3D3D3', text: '#111111', surface: '#c0c0c0', border: '#aaaaaa', isCustom: false },
        { name: 'Xanh', bg: '#002B36', text: '#93A1A1', surface: '#003c4d', border: '#00556e', isCustom: false },
        { name: 'Hồng', bg: 'rgb(35, 38, 39)', text: 'rgb(247, 183, 183)', surface: '#36393a', border: '#4a4e4f', isCustom: false }
    ]
    };
    const popularFonts = [ 'Arial', 'Times New Roman', 'Helvetica', 'Courier New', 'Verdana', 'Georgia', 'Tahoma', 'Calibri', 'Garamond', 'Roboto', 'Open Sans', 'Montserrat' ];

    // =================================================================
    // KHỞI TẠO
    // =================================================================
    
    function initializeApp() {
        if (typeof ePub === 'undefined') { return showCustomAlert("Lỗi nghiêm trọng: Không thể tải thư viện ePub.js."); }
        initDB().then(() => {
            loadSettings();
            applyThemeToApp();
            populateFontSelector();
            renderColorThemes();
            updateUiWithSettings();
            setupEventListeners();
            displayImportedFiles();
        });
    }

    // =================================================================
    // QUẢN LÝ DATABASE
    // =================================================================
    function initDB() { return new Promise((resolve, reject) => { const request = indexedDB.open(dbName, 2); request.onupgradeneeded = event => { const db = event.target.result; if (!db.objectStoreNames.contains('ebooks')) { db.createObjectStore('ebooks', { keyPath: 'id' }); } }; request.onsuccess = event => { db = event.target.result; resolve(); }; request.onerror = event => reject(event.target.error); }); }
    function saveBookToDB(bookData) { return new Promise((resolve, reject) => { if (!db) return reject('DB not initialized'); const transaction = db.transaction(['ebooks'], 'readwrite'); const store = transaction.objectStore('ebooks'); const request = store.put(bookData); request.onsuccess = () => resolve(); request.onerror = (e) => reject(e.target.error); }); }
    function getBookFromDB(id) { return new Promise((resolve, reject) => { if (!db) return reject('DB not initialized'); const req = db.transaction(['ebooks'], 'readonly').objectStore('ebooks').get(id); req.onsuccess = () => resolve(req.result); req.onerror = (e) => reject(e.target.error); }); }
    function getAllBooksFromDB() { return new Promise((resolve, reject) => { if (!db) return reject('DB not initialized'); const req = db.transaction(['ebooks'], 'readonly').objectStore('ebooks').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = (e) => reject(e.target.error); }); }
    function deleteBookFromDB(id) { return new Promise((resolve, reject) => { if (!db) return reject('DB not initialized'); const req = db.transaction(['ebooks'], 'readwrite').objectStore('ebooks').delete(id); req.onsuccess = () => { localStorage.removeItem(`location-${id}`); resolve(); }; req.onerror = (e) => reject(e.target.error); }); }
    function clearDB() { return new Promise((resolve) => { if (!db) return; const req = db.transaction(['ebooks'], 'readwrite').objectStore('ebooks').clear(); req.onsuccess = () => resolve(); }); }

    // =================================================================
    // TẢI VÀ HIỂN THỊ SÁCH
    // =================================================================
    
    async function handleFileSelect(event) {
    const files = event.target.files; // Lấy danh sách các tệp đã chọn
    if (!files.length) return; // Nếu không có tệp nào thì dừng lại

    let importCount = 0;
    let errorCount = 0;

    // Vô hiệu hóa nút input để tránh người dùng nhấn lại khi đang xử lý
    fileInput.disabled = true;

    for (const file of files) { // Lặp qua từng tệp
        const bookId = `${file.name}-${file.size}`;
        const reader = new FileReader();

        // Sử dụng Promise để xử lý logic bất đồng bộ của FileReader trong vòng lặp
        await new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    if (file.name.toLowerCase().endsWith('.txt')) {
                        const bookData = { id: bookId, title: file.name, fileData: e.target.result, type: 'txt', lastOpened: new Date(), coverUrl: null, metadata: null };
                        await saveBookToDB(bookData);
                    } else if (file.name.toLowerCase().endsWith('.epub')) {
                        const buffer = e.target.result;
                        const tempBook = ePub(buffer);
                        await tempBook.ready;
                        const coverUrlBlob = await tempBook.coverUrl();
                        const coverUrl = coverUrlBlob ? await blobUrlToBase64(coverUrlBlob) : null;
                        const metadata = tempBook.packaging.metadata;
                        
                        const bookData = { id: bookId, title: metadata.title || file.name, fileData: buffer, type: 'epub', lastOpened: new Date(), coverUrl, metadata };
                        await saveBookToDB(bookData);
                        tempBook.destroy();
                    }
                    importCount++;
                } catch (err) { 
                    console.error(`Lỗi xử lý file: ${file.name}`, err);
                    errorCount++;
                } finally {
                    resolve(); // Báo cho Promise biết là đã xử lý xong tệp này
                }
            };

            reader.onerror = () => {
                console.error(`Không thể đọc file: ${file.name}`, reader.error);
                errorCount++;
                resolve(); // Vẫn tiếp tục xử lý các tệp khác dù có lỗi
            };

            if (file.name.toLowerCase().endsWith('.txt')) {
                reader.readAsText(file, 'UTF-8');
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    await displayImportedFiles();
    showCustomAlert(`Hoàn tất! Đã nhập thành công ${importCount} sách. ${errorCount > 0 ? `Bỏ qua ${errorCount} sách bị lỗi.` : ''}`);
    
    fileInput.disabled = false;
    event.target.value = '';
}
    
    async function openBookFromDB(bookId) {
        try {
            const bookData = await getBookFromDB(bookId);
            if (bookData) {
                bookData.lastOpened = new Date();
                await saveBookToDB(bookData);
                
                currentBookId = bookId;
                currentBookType = bookData.type;
                if (bookData.type === 'epub') renderEpub(bookData.fileData, bookData.title);
                else if (bookData.type === 'txt') renderTxt(bookData.fileData, bookData.title);
            } else {
                showCustomAlert("Không tìm thấy sách. Có thể đã bị xóa.");
                displayImportedFiles();
            }
        } catch (err) { showCustomAlert(`Lỗi khi mở sách: ${err.message}`); }
    }

    function cleanupViewer() {
        if (rendition) rendition.destroy();
        rendition = null;
        viewer.innerHTML = '';
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.style.display = 'none';
    }

    function renderEpub(bookData, title) {
        cleanupViewer();
        try {
            book = ePub(bookData);
            rendition = book.renderTo(viewer, { flow: "scrolled", width: "100%", height: "100%" });
            const savedLocation = localStorage.getItem(`location-${currentBookId}`);
            rendition.display(savedLocation || undefined);
            book.ready.then(() => { updateBookInfo(title); populateTOC(book.navigation.toc); loadSettings(); applyReaderSettings(); });
            rendition.on('relocated', location => { localStorage.setItem(`location-${currentBookId}`, location.start.cfi); updateChapterInfo(location); });
        } catch (err) { showCustomAlert(`Không thể tải file EPUB. Lỗi: ${err.message}`); }
    }

    function renderTxt(textContent, title) {
        cleanupViewer();
        const pre = document.createElement('pre');
        pre.id = 'txt-content';
        pre.textContent = textContent;
        viewer.appendChild(pre);
        updateBookInfo(title, "File TXT");
        loadSettings();
        applyReaderSettings();
    }
    
    // =================================================================
    // CÀI ĐẶT & GIAO DIỆN
    // =================================================================
    
    function loadSettings() { const savedSettings = JSON.parse(localStorage.getItem('ebookReaderSettings_v2')); if (savedSettings) settings = { ...settings, ...savedSettings }; }
    function saveSettings() { localStorage.setItem('ebookReaderSettings_v2', JSON.stringify(settings)); }
    function applyThemeToApp() { const theme = settings.themes.find(t => t.name === settings.activeThemeName) || settings.themes[0]; const root = document.documentElement; root.style.setProperty('--app-bg', theme.bg); root.style.setProperty('--app-text', theme.text); root.style.setProperty('--surface-bg', theme.surface); root.style.setProperty('--border-color', theme.border); }
    
    function applyReaderSettings() {
        const themeColors = (settings.activeThemeName === 'custom') ? settings.customColors : settings.themes.find(t => t.name === settings.activeThemeName) || settings.themes[0];
        if (currentBookType === 'epub' && rendition) {
            rendition.themes.register("baseLayout", { "body": { 'padding': '20px !important', 'box-sizing': 'border-box !important' } });
            const customThemeRules = {
                "body": { 'max-width': '1140px !important', 'margin-left': 'auto !important', 'margin-right': 'auto !important', 'padding': '20px !important', 'box-sizing': 'border-box !important', 'background': `${themeColors.bg} !important` },
                "p, li, a, span, div, td, th, h1, h2, h3, h4, h5, h6, blockquote, pre": { 'color': `${themeColors.text} !important`, 'font-family': `${settings.fontFamily} !important`, 'font-size': `${settings.fontSize}px !important`, 'line-height': '1.6 !important', 'background-color': 'transparent !important' },
                "p": { 'text-indent': '0 !important', 'margin-top': '0 !important', 'margin-bottom': '1em !important' },
                "a": { 'color': 'inherit !important', 'text-decoration': 'underline !important' }
            };
            rendition.themes.register("customTheme", customThemeRules);
            if (settings.keepOriginalFormat) { rendition.themes.select("baseLayout"); } else { rendition.themes.select("customTheme"); }
        } else if (currentBookType === 'txt') {
            const txtContent = document.getElementById('txt-content');
            if (txtContent) { txtContent.style.backgroundColor = themeColors.bg; txtContent.style.color = themeColors.text; txtContent.style.fontSize = `${settings.fontSize}px`; txtContent.style.fontFamily = settings.fontFamily; txtContent.style.lineHeight = '1.6'; }
        }
    }
    
    function updateUiWithSettings() {
        fontSizeInput.value = settings.fontSize; fontSizeValue.textContent = settings.fontSize; fontFamilySelect.value = settings.fontFamily;
        bgColorPicker.value = settings.customColors.bg; textColorPicker.value = settings.customColors.text;
        originalFormatToggle.checked = settings.keepOriginalFormat; sortBooksSelect.value = settings.sortOrder;
        updateActiveThemeButton(); updateSettingsControlsState();
    }

    function updateSettingsControlsState() { const isDisabled = settings.keepOriginalFormat; document.querySelectorAll('[data-setting-control]').forEach(controlContainer => { controlContainer.classList.toggle('disabled', isDisabled); const inputs = controlContainer.querySelectorAll('input, select'); inputs.forEach(input => input.disabled = isDisabled); }); }
    function renderColorThemes() {
        colorThemesContainer.innerHTML = '';
        settings.themes.forEach(theme => {
            const themeDiv = document.createElement('div');
            themeDiv.className = 'theme-option';
            themeDiv.title = theme.name;
            themeDiv.style.backgroundColor = theme.bg;
            themeDiv.style.borderColor = theme.text;
            themeDiv.addEventListener('click', () => {
                if (settings.keepOriginalFormat) return;
                settings.activeThemeName = theme.name;
                applyThemeToApp();
                applyReaderSettings();
                updateActiveThemeButton();
                saveSettings();
            });

            // Thêm nút xóa cho các theme tùy chỉnh
            if (theme.isCustom) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-theme-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.title = `Xóa giao diện "${theme.name}"`;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Ngăn không cho sự kiện click lan ra themeDiv
                    deleteTheme(theme.name);
                });
                themeDiv.appendChild(deleteBtn);
            }

            colorThemesContainer.appendChild(themeDiv);
        });
    }
    function updateActiveThemeButton() { document.querySelectorAll('.theme-option').forEach(btn => btn.classList.toggle('active', btn.title === settings.activeThemeName)); }
    function populateFontSelector() { fontFamilySelect.innerHTML = ''; popularFonts.forEach(font => { const option = document.createElement('option'); option.value = font; option.textContent = font; fontFamilySelect.appendChild(option); }); }
    
    async function addTheme() {
        try {
            const name = await showCustomPrompt("Nhập tên cho giao diện mới:");
            
            if (!name || name.trim() === '') {
                showCustomAlert("Tên giao diện không được để trống.");
                return;
            }

            if (settings.themes.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
                showCustomAlert("Lỗi", "Tên giao diện này đã tồn tại.");
                return;
            }

            const bg = bgColorPicker.value;
            const text = textColorPicker.value;

            const isDark = (parseInt(bg.substring(1, 3), 16) * 0.299 + parseInt(bg.substring(3, 5), 16) * 0.587 + parseInt(bg.substring(5, 7), 16) * 0.114) < 186;
            const surfacePercent = isDark ? 15 : -10;
            const borderPercent = isDark ? 30 : -20;
            
            const newTheme = {
                name: name.trim(),
                bg: bg,
                text: text,
                surface: adjustColor(bg, surfacePercent),
                border: adjustColor(bg, borderPercent),
                isCustom: true
            };

            settings.themes.push(newTheme);
            saveSettings();
            renderColorThemes();
            updateActiveThemeButton();

        } catch (error) {
            // Người dùng đã bấm "Hủy" hoặc nhấn ESC, không làm gì cả.
            console.log("Thao tác thêm giao diện đã bị hủy.");
        }
    }

    function deleteTheme(themeName) {
        showCustomAlert(`Bạn có chắc chắn muốn xóa giao diện "${themeName}" không?`, {
            showCancelButton: true,
            onOk: () => {
                settings.themes = settings.themes.filter(t => t.name !== themeName);
                
                // Nếu giao diện đang hoạt động bị xóa, chuyển về giao diện mặc định
                if (settings.activeThemeName === themeName) {
                    settings.activeThemeName = 'Hồng'; // hoặc settings.themes[0].name
                    applyThemeToApp();
                    applyReaderSettings();
                }

                saveSettings();       // Lưu lại thay đổi
                renderColorThemes();  // Cập nhật lại UI
                updateActiveThemeButton();
            }
        });
    }

    // =================================================================
    // CÁC CHỨC NĂNG PHỤ
    // =================================================================
    
    async function displayImportedFiles() {
        const container = document.getElementById('imported-files-container');
        if (!container) return;
        const allBooks = await getAllBooksFromDB();
        if (allBooks && allBooks.length > 0) {
            container.style.display = 'block';
            importedFilesList.innerHTML = '';
            if (settings.sortOrder === 'lastOpened') { allBooks.sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened)); } 
            else if (settings.sortOrder === 'title-asc') { allBooks.sort((a, b) => a.title.localeCompare(b.title, 'vi')); }
            else if (settings.sortOrder === 'title-desc') { allBooks.sort((a, b) => b.title.localeCompare(a.title, 'vi')); }
            allBooks.forEach(bookMeta => {
                const li = document.createElement('li');
                li.dataset.bookId = bookMeta.id; // Thêm id vào li để delegate event
                li.innerHTML = `
                    <button class="delete-book-btn" title="Xóa sách">&times;</button>
                    <div class="book-card-cover">
                        <img src="${bookMeta.coverUrl || './img/logo.png'}" alt="Bìa sách">
                    </div>
                    <div class="book-card-title">${bookMeta.title}</div>
                    <div class="book-card-actions">
                        <button class="info-btn">Thông tin</button>
                        <button class="read-btn">Đọc</button>
                    </div>`;
                importedFilesList.appendChild(li);
            });
        } else { container.style.display = 'none'; }
    }
    
    async function showBookInfo(bookId) {
        const bookData = await getBookFromDB(bookId);
        const detailsContainer = document.getElementById('book-info-details');
        if (!bookData || !bookData.metadata) {
            detailsContainer.innerHTML = '<p>Không có thông tin chi tiết cho sách này.</p>';
        } else {
            const md = bookData.metadata;
            detailsContainer.innerHTML = `
                <p><strong>Tên sách:</strong> ${md.title || 'Không có'}</p>
                <p><strong>Tác giả:</strong> ${md.creator || 'Không có'}</p>
                <p><strong>Nhà xuất bản:</strong> ${md.publisher || 'Không có'}</p>
                <p><strong>Ngày xuất bản:</strong> ${md.pubdate || 'Không có'}</p>
                <p class="description"><strong>Mô tả:</strong> ${md.description || 'Không có'}</p>
            `;
        }
        bookInfoModal.classList.remove('hidden');
    }

    function updateBookInfo(title, chapterText = "") { bookTitleEl.textContent = title; chapterInfoEl.textContent = chapterText; localStorage.setItem('lastOpenedBook', currentBookId); }
    function updateChapterInfo(location) { const currentChapter = book.navigation.get(location.start.href); if (currentChapter && currentChapter.label) { const totalChapters = book.navigation.toc.length; const currentIndex = book.navigation.toc.findIndex(item => item.href === currentChapter.href) + 1; chapterInfoEl.textContent = `${currentIndex}/${totalChapters} - ${currentChapter.label.trim()}`; } }
    function populateTOC(toc) { tocList.innerHTML = ''; if (!toc || toc.length === 0) { tocList.innerHTML = '<li>Không có mục lục.</li>'; return; } toc.forEach(item => { const li = document.createElement('li'); li.textContent = item.label.trim(); li.dataset.href = item.href; li.addEventListener('click', () => { if (rendition) rendition.display(item.href); tocModal.classList.add('hidden'); }); tocList.appendChild(li); }); }
    function filterTOC() { const filter = tocSearch.value.toUpperCase(); const items = tocList.getElementsByTagName('li'); for (let i = 0; i < items.length; i++) { items[i].style.display = items[i].textContent.toUpperCase().includes(filter) ? "" : "none"; } }
    async function loadHistory() { historyList.innerHTML = '<li>Đang tải...</li>'; const allBooks = await getAllBooksFromDB(); allBooks.sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened)); historyList.innerHTML = ''; if (allBooks.length === 0) { historyList.innerHTML = '<li>Chưa có sách nào.</li>'; return; } allBooks.forEach(bookMeta => { const li = document.createElement('li'); li.dataset.bookId = bookMeta.id; li.innerHTML = `<div class="history-item-info"><span class="history-title">${bookMeta.title}</span><span class="history-date">${new Date(bookMeta.lastOpened).toLocaleString('vi-VN')}</span></div><button class="delete-history-btn" title="Xóa khỏi lịch sử">&times;</button>`; li.querySelector('.history-item-info').addEventListener('click', () => { openBookFromDB(bookMeta.id); historyModal.classList.add('hidden'); }); historyList.appendChild(li); }); }
    function deleteBookFromHistory(bookId) { showCustomAlert(`Bạn có chắc muốn xóa sách này khỏi lịch sử? Thao tác này không thể hoàn tác.`, { showCancelButton: true, onOk: () => { deleteBookFromDB(bookId).then(() => { const itemToRemove = historyList.querySelector(`li[data-book-id="${bookId}"]`); if (itemToRemove) itemToRemove.remove(); if (historyList.children.length === 0) { historyList.innerHTML = '<li>Chưa có sách nào.</li>'; } if (currentBookId === bookId) { window.location.reload(); } else { displayImportedFiles(); } }).catch(err => { showCustomAlert(`Lỗi khi xóa sách: ${err.message}`); }); } }); }

    function deleteBookFromWelcomeScreen(bookId) {
    showCustomAlert(`Bạn có chắc muốn xóa vĩnh viễn sách này? Thao tác này không thể hoàn tác.`, {
        showCancelButton: true,
        onOk: () => {
            deleteBookFromDB(bookId)
                .then(() => {
                    // Nếu sách đang xóa cũng là sách đang mở, tải lại trang
                    if (currentBookId === bookId) {
                        window.location.reload();
                    } else {
                        // Nếu không, chỉ cần vẽ lại danh sách sách
                        displayImportedFiles();
                    }
                })
                .catch(err => {
                    showCustomAlert(`Lỗi khi xóa sách: ${err.message}`);
                });
        }
    });
}

    // =================================================================
    // QUẢN LÝ MODAL & SIDEBAR
    // =================================================================
    function setupModal(modal, openBtn = null) {
        if (!modal) return;
        const closeModal = () => modal.classList.add('hidden');
        if (openBtn) {
            openBtn.addEventListener('click', (e) => { e.stopPropagation(); if(modal.id === 'history-modal') loadHistory(); modal.classList.remove('hidden'); });
        }
        document.querySelectorAll(`.close-btn[data-target="${modal.id}"]`).forEach(btn => { btn.addEventListener('click', closeModal); });
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    // 
    function showCustomPrompt(message) {
    return new Promise((resolve, reject) => {
        promptMessage.textContent = message;
        promptInput.value = '';
        promptModal.classList.remove('hidden');
        promptInput.focus();

        // Lấy các nút HIỆN TẠI đang có trên trang
        let currentOkBtn = document.getElementById('custom-prompt-ok');
        let currentCancelBtn = document.getElementById('custom-prompt-cancel');
        let currentInput = document.getElementById('custom-prompt-input');

        // Tạo bản sao sạch sẽ, không có sự kiện nào
        let newOkBtn = currentOkBtn.cloneNode(true);
        let newCancelBtn = currentCancelBtn.cloneNode(true);

        // Định nghĩa các hàm xử lý
        const handleOk = () => {
            promptModal.classList.add('hidden');
            resolve(currentInput.value); // Sử dụng currentInput để lấy giá trị
        };

        const handleCancel = () => {
            promptModal.classList.add('hidden');
            reject();
        };
        
        const handleKeydown = (e) => {
            if (e.key === 'Enter') handleOk();
            else if (e.key === 'Escape') handleCancel();
        };
        
        newOkBtn.addEventListener('click', handleOk);
        newCancelBtn.addEventListener('click', handleCancel);
        currentInput.addEventListener('keydown', handleKeydown);

        currentOkBtn.parentNode.replaceChild(newOkBtn, currentOkBtn);
        currentCancelBtn.parentNode.replaceChild(newCancelBtn, currentCancelBtn);

        const observer = new MutationObserver((mutations) => {
            if (mutations[0].attributeName === 'class' && promptModal.classList.contains('hidden')) {
                currentInput.removeEventListener('keydown', handleKeydown);
                observer.disconnect();
            }
        });
        observer.observe(promptModal, { attributes: true });
    });
}

    function showCustomAlert(message, options = {}) { const okBtn = document.getElementById('custom-alert-ok'); const cancelBtn = document.getElementById('custom-alert-cancel'); document.getElementById('custom-alert-message').textContent = message; const newOkBtn = okBtn.cloneNode(true); okBtn.parentNode.replaceChild(newOkBtn, okBtn); newOkBtn.addEventListener('click', () => { alertModal.classList.add('hidden'); if (options.onOk) options.onOk(); }); const newCancelBtn = cancelBtn.cloneNode(true); cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn); newCancelBtn.addEventListener('click', () => { alertModal.classList.add('hidden'); }); newCancelBtn.style.display = options.showCancelButton ? 'inline-block' : 'none'; alertModal.classList.remove('hidden'); }
    function deleteAllData() { showCustomAlert("Bạn có chắc chắn muốn xoá toàn bộ dữ liệu?", { showCancelButton: true, onOk: () => { clearDB().then(() => { localStorage.clear(); showCustomAlert('Đã xoá toàn bộ dữ liệu.', { onOk: () => window.location.reload() }); }); } }); }

    // =================================================================
    // GẮN EVENT LISTENERS
    // =================================================================
    function setupEventListeners() {
        homeBtn.addEventListener('click', () => { window.location.reload(); });
        fileInput.addEventListener('change', handleFileSelect);
        prevArea.addEventListener('click', () => rendition && rendition.prev());
        nextArea.addEventListener('click', () => rendition && rendition.next());
        
        setupModal(tocModal, tocBtn);
        setupModal(historyModal, historyBtn);
        setupModal(settingsSidebar, settingsBtn);
        setupModal(bookInfoModal);

        addThemeBtn.addEventListener('click', addTheme);
        tocSearch.addEventListener('input', filterTOC);
        deleteAllDataBtn.addEventListener('click', deleteAllData);
        historyList.addEventListener('click', (event) => { if (event.target.classList.contains('delete-history-btn')) { const bookId = event.target.closest('li').dataset.bookId; if (bookId) deleteBookFromHistory(bookId); } });
        
        importedFilesList.addEventListener('click', (e) => {
            const card = e.target.closest('li');
            if (!card) return;
            const bookId = card.dataset.bookId;
            if (!bookId) return;

            if (e.target.classList.contains('delete-book-btn')) {
               deleteBookFromWelcomeScreen(bookId);
            } else if (e.target.closest('.info-btn')) {
               showBookInfo(bookId);
            } else {
             openBookFromDB(bookId);
    }
});

        sortBooksSelect.addEventListener('change', (e) => { settings.sortOrder = e.target.value; saveSettings(); displayImportedFiles(); });
        originalFormatToggle.addEventListener('change', e => { settings.keepOriginalFormat = e.target.checked; applyReaderSettings(); updateSettingsControlsState(); saveSettings(); });
        fontSizeInput.addEventListener('input', e => { settings.fontSize = parseInt(e.target.value); fontSizeValue.textContent = e.target.value; applyReaderSettings(); });
        fontSizeInput.addEventListener('change', saveSettings);
        fontFamilySelect.addEventListener('change', e => { settings.fontFamily = e.target.value; applyReaderSettings(); saveSettings(); });
        bgColorPicker.addEventListener('input', e => { settings.customColors.bg = e.target.value; settings.activeThemeName = 'custom'; applyReaderSettings(); updateActiveThemeButton(); });
        textColorPicker.addEventListener('input', e => { settings.customColors.text = e.target.value; settings.activeThemeName = 'custom'; applyReaderSettings(); updateActiveThemeButton(); });
        bgColorPicker.addEventListener('change', saveSettings);
        textColorPicker.addEventListener('change', saveSettings);
    }
    
    // --- HÀM HỖ TRỢ ---
    function adjustColor(hex, percent) {
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
    
        r = Math.min(255, Math.max(0, r + (r * percent / 100)));
        g = Math.min(255, Math.max(0, g + (g * percent / 100)));
        b = Math.min(255, Math.max(0, b + (b * percent / 100)));
    
        const toHex = c => ('0' + Math.round(c).toString(16)).slice(-2);
    
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function blobUrlToBase64(blobUrl) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', blobUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(xhr.response);
                } else { resolve(null); }
            };
            xhr.onerror = () => resolve(null);
            xhr.send();
        });
    }

    // --- BẮT ĐẦU ---
    initializeApp();
});