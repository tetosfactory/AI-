/**
 * AI Recipe Chef - Main Application Logic
 */

// Application State
const state = {
    apiKey: localStorage.getItem('gemini_api_key') || '',
    stream: null,
    facingMode: 'environment', // 'environment' (back) or 'user' (front)
    capturedImageBase64: null,
    capturedImageMimeType: null,
    uploadedImageBase64: null,
    uploadedImageMimeType: null,
    currentIngredients: [],
    currentRecipes: [],
    activeTab: 'tab-camera',
    mainIngredient: null
};

// DOM Elements
const elements = {
    // Sections
    sectionApiKey: document.getElementById('section-api-key'),
    sectionInput: document.getElementById('section-input'),
    sectionLoading: document.getElementById('section-loading'),
    loadingTitle: document.querySelector('#section-loading .loading-title'),
    loadingSubtitle: document.querySelector('#section-loading .loading-subtitle'),
    sectionResults: document.getElementById('section-results'),
    
    // API Key settings
    btnSettings: document.getElementById('btn-settings'),
    inputApiKey: document.getElementById('input-api-key'),
    btnToggleKey: document.getElementById('btn-toggle-key'),
    btnSaveKey: document.getElementById('btn-save-key'),
    
    // Tab switching
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Camera Elements
    webcam: document.getElementById('webcam'),
    photoCanvas: document.getElementById('photo-canvas'),
    cameraPlaceholder: document.getElementById('camera-placeholder'),
    btnRetryCamera: document.getElementById('btn-retry-camera'),
    capturedImagePreview: document.getElementById('captured-image-preview'),
    btnSwitchCamera: document.getElementById('btn-switch-camera'),
    btnCapture: document.getElementById('btn-capture'),
    btnRecapture: document.getElementById('btn-recapture'),
    
    // Upload Elements
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    btnSelectFile: document.getElementById('btn-select-file'),
    uploadedImagePreview: document.getElementById('uploaded-image-preview'),
    
    // Text Input Elements
    textareaIngredients: document.getElementById('textarea-ingredients'),
    
    // Universal Submit Button
    submitSection: document.getElementById('submit-section'),
    btnAnalyze: document.getElementById('btn-analyze'),
    
    // Results Elements
    ingredientsChips: document.getElementById('ingredients-chips'),
    inputAddIngredient: document.getElementById('input-add-ingredient'),
    btnAddIngredient: document.getElementById('btn-add-ingredient'),
    btnReanalyze: document.getElementById('btn-reanalyze'),
    btnZubora: document.getElementById('btn-zubora'),
    btnUpgrade: document.getElementById('btn-upgrade'),
    recipesGrid: document.getElementById('recipes-grid'),
    btnReset: document.getElementById('btn-reset'),
    resultImageWrapper: document.getElementById('result-image-wrapper'),
    resultImagePreview: document.getElementById('result-image-preview'),
    recipesHeaderWrapper: document.getElementById('recipes-header-wrapper'),
    
    // Modal Elements
    recipeModal: document.getElementById('recipe-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    modalRecipeHeader: document.getElementById('modal-recipe-header'),
    modalRecipeTime: document.getElementById('modal-recipe-time'),
    modalRecipeDifficulty: document.getElementById('modal-recipe-difficulty'),
    modalRecipeMatch: document.getElementById('modal-recipe-match'),
    modalRecipeMaterials: document.getElementById('modal-recipe-materials'),
    modalRecipeSteps: document.getElementById('modal-recipe-steps'),
    modalRecipeTips: document.getElementById('modal-recipe-tips'),
    modalRecipeTipsWrapper: document.getElementById('modal-recipe-tips-wrapper'),
    modalBackdrop: document.querySelector('.modal-backdrop')
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    // Populate API key input if stored
    if (state.apiKey) {
        elements.inputApiKey.value = state.apiKey;
        // Start webcam if default tab is camera
        if (state.activeTab === 'tab-camera') {
            startWebcam();
        }
    } else {
        // Force API key section if not available
        showSection(elements.sectionApiKey);
        elements.sectionInput.classList.add('hidden');
    }
}

/* ==========================================================================
   EVENT LISTENERS SETTINGS
   ========================================================================== */
function setupEventListeners() {
    // API Key toggles
    elements.btnSettings.addEventListener('click', () => {
        if (elements.sectionApiKey.classList.contains('hidden')) {
            showSection(elements.sectionApiKey);
            stopWebcam();
        } else {
            hideApiKeySection();
        }
    });

    elements.btnToggleKey.addEventListener('click', () => {
        const type = elements.inputApiKey.type === 'password' ? 'text' : 'password';
        elements.inputApiKey.type = type;
        const icon = elements.btnToggleKey.querySelector('i');
        if (type === 'password') {
            icon.className = 'fa-solid fa-eye';
        } else {
            icon.className = 'fa-solid fa-eye-slash';
        }
    });

    elements.btnSaveKey.addEventListener('click', saveApiKey);

    // Tab Switching
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Camera Events
    elements.btnCapture.addEventListener('click', capturePhoto);
    elements.btnRecapture.addEventListener('click', () => {
        resetCameraView();
        startWebcam();
    });
    elements.btnSwitchCamera.addEventListener('click', toggleCameraFacing);
    elements.btnRetryCamera.addEventListener('click', startWebcam);

    // File Upload Events
    elements.btnSelectFile.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    elements.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropzone.classList.add('dragover');
    });
    elements.dropzone.addEventListener('dragleave', () => {
        elements.dropzone.classList.remove('dragover');
    });
    elements.dropzone.addEventListener('drop', handleFileDrop);
    elements.dropzone.addEventListener('click', () => {
        // Only trigger file select if no preview is visible
        if (elements.uploadedImagePreview.classList.contains('hidden')) {
            elements.fileInput.click();
        }
    });

    // Text Input Events
    elements.textareaIngredients.addEventListener('input', () => {
        toggleSubmitButton();
    });

    // Analysis trigger
    elements.btnAnalyze.addEventListener('click', () => performAnalysis(false, false, false));
    elements.btnReanalyze.addEventListener('click', () => performAnalysis(true, false, false));
    elements.btnZubora.addEventListener('click', () => performAnalysis(true, false, true));
    elements.btnUpgrade.addEventListener('click', () => performAnalysis(true, true, false));

    // Results interactions
    elements.btnAddIngredient.addEventListener('click', addNewIngredientChip);
    elements.inputAddIngredient.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewIngredientChip();
        }
    });

    elements.btnReset.addEventListener('click', resetToInputScreen);

    // Modal Control
    elements.btnCloseModal.addEventListener('click', closeModal);
    elements.modalBackdrop.addEventListener('click', closeModal);
}

/* ==========================================================================
   NAVIGATION & UI STATE MANAGEMENT
   ========================================================================== */
function showSection(sectionToShow) {
    [elements.sectionApiKey, elements.sectionInput, elements.sectionLoading, elements.sectionResults].forEach(sec => {
        if (sec === sectionToShow) {
            sec.classList.remove('hidden');
        } else {
            sec.classList.add('hidden');
        }
    });
}

function hideApiKeySection() {
    if (!state.apiKey) {
        showToast('アプリを利用するにはGemini APIキーを設定してください。', 'error');
        return;
    }
    elements.sectionApiKey.classList.add('hidden');
    elements.sectionInput.classList.remove('hidden');
    
    if (state.activeTab === 'tab-camera' && !state.capturedImageBase64) {
        startWebcam();
    }
}

function saveApiKey() {
    const key = elements.inputApiKey.value.trim();
    if (!key) {
        showToast('有効なAPIキーを入力してください。', 'error');
        return;
    }
    state.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
    showToast('APIキーを保存しました。', 'success');
    hideApiKeySection();
}

function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Toggle active tab buttons
    elements.tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle active tab content
    elements.tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Webcam Control based on current tab
    if (tabId === 'tab-camera') {
        if (!state.capturedImageBase64) {
            startWebcam();
        }
    } else {
        stopWebcam();
    }

    toggleSubmitButton();
}

function toggleSubmitButton() {
    let showSubmit = false;
    let buttonText = '';
    let buttonIcon = '';

    if (state.activeTab === 'tab-camera') {
        showSubmit = !!state.capturedImageBase64;
        buttonText = '写真から食材を認識する';
        buttonIcon = '<i class="fa-solid fa-magnifying-glass-chart"></i> ';
    } else if (state.activeTab === 'tab-upload') {
        showSubmit = !!state.uploadedImageBase64;
        buttonText = '画像から食材を認識する';
        buttonIcon = '<i class="fa-solid fa-magnifying-glass-chart"></i> ';
    } else if (state.activeTab === 'tab-text') {
        showSubmit = elements.textareaIngredients.value.trim().length > 0;
        buttonText = '入力した食材を確認する';
        buttonIcon = '<i class="fa-solid fa-clipboard-list"></i> ';
    }

    if (showSubmit) {
        elements.btnAnalyze.innerHTML = buttonIcon + buttonText;
        elements.submitSection.classList.remove('hidden');
    } else {
        elements.submitSection.classList.add('hidden');
    }
}

/* ==========================================================================
   CAMERA ACCESS & PICTURE TAKING
   ========================================================================== */
async function startWebcam() {
    stopWebcam(); // Clean up existing streams first
    
    elements.cameraPlaceholder.classList.add('hidden');
    elements.webcam.classList.remove('hidden');
    elements.btnSwitchCamera.classList.remove('hidden');
    
    // If photo is already captured, don't restart video feed
    if (state.capturedImageBase64) return;

    try {
        const constraints = {
            video: {
                facingMode: state.facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.webcam.srcObject = state.stream;
    } catch (err) {
        console.warn("Failed to get video constraints. Retrying with basic video support...", err);
        try {
            // Fallback for devices that don't support facingMode constraints correctly
            state.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            elements.webcam.srcObject = state.stream;
        } catch (fallbackErr) {
            console.error("Camera access denied or unavailable:", fallbackErr);
            elements.webcam.classList.add('hidden');
            elements.btnSwitchCamera.classList.add('hidden');
            elements.cameraPlaceholder.classList.remove('hidden');
        }
    }
}

function stopWebcam() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    elements.webcam.srcObject = null;
}

function toggleCameraFacing() {
    state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';
    startWebcam();
}

function capturePhoto() {
    if (!state.stream) return;

    const video = elements.webcam;
    const canvas = elements.photoCanvas;
    const ctx = canvas.getContext('2d');

    // Match canvas dimensions to the video stream resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame on the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas image to Base64 data URI
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    state.capturedImageBase64 = dataUrl.split(',')[1];
    state.capturedImageMimeType = 'image/jpeg';

    // Update UI previews
    elements.capturedImagePreview.src = dataUrl;
    elements.capturedImagePreview.classList.remove('hidden');
    video.classList.add('hidden');
    
    // Adjust control buttons
    elements.btnCapture.classList.add('hidden');
    elements.btnRecapture.classList.remove('hidden');
    elements.btnSwitchCamera.classList.add('hidden');

    stopWebcam();
    toggleSubmitButton();
}

function resetCameraView() {
    state.capturedImageBase64 = null;
    state.capturedImageMimeType = null;
    elements.capturedImagePreview.src = '';
    elements.capturedImagePreview.classList.add('hidden');
    elements.btnCapture.classList.remove('hidden');
    elements.btnRecapture.classList.add('hidden');
    elements.btnSwitchCamera.classList.remove('hidden');
    toggleSubmitButton();
}

/* ==========================================================================
   IMAGE UPLOAD (DRAG AND DROP)
   ========================================================================== */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processUploadFile(file);
    }
}

function handleFileDrop(e) {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processUploadFile(file);
    } else {
        showToast('画像ファイル（PNG/JPEG等）をドロップしてください。', 'error');
    }
}

function processUploadFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const dataUrl = event.target.result;
        state.uploadedImageBase64 = dataUrl.split(',')[1];
        state.uploadedImageMimeType = file.type;

        // Display preview
        elements.uploadedImagePreview.src = dataUrl;
        elements.uploadedImagePreview.classList.remove('hidden');
        
        // Hide dropzone content text
        elements.dropzone.querySelector('.dropzone-content').classList.add('hidden');
        
        toggleSubmitButton();
    };
    reader.readAsDataURL(file);
}

function resetUploadView() {
    state.uploadedImageBase64 = null;
    state.uploadedImageMimeType = null;
    elements.uploadedImagePreview.src = '';
    elements.uploadedImagePreview.classList.add('hidden');
    elements.dropzone.querySelector('.dropzone-content').classList.remove('hidden');
    elements.fileInput.value = '';
    toggleSubmitButton();
}

/* ==========================================================================
   GEMINI API ANALYSIS COORDINATOR
   ========================================================================== */
async function performAnalysis(isReanalysis = false, isUpgrade = false, isZubora = false) {
    if (!state.apiKey) {
        showToast('APIキーが設定されていません。右上のギアマークから設定してください。', 'error');
        showSection(elements.sectionApiKey);
        return;
    }

    // Update loading text dynamically based on the step
    if (isReanalysis) {
        if (isUpgrade) {
            elements.loadingTitle.textContent = '豪華なレシピを考案中...';
            elements.loadingSubtitle.textContent = '食材をプラスしたごちそうレシピを考えています。しばらくお待ちください。';
        } else if (isZubora) {
            elements.loadingTitle.textContent = 'ズボラレシピを考案中...';
            elements.loadingSubtitle.textContent = '最高に簡単で美味しい時短レシピを考えています。しばらくお待ちください。';
        } else {
            elements.loadingTitle.textContent = 'レシピを考案中...';
            elements.loadingSubtitle.textContent = 'シェフが美味しいレシピを考えています。しばらくお待ちください。';
        }
    } else {
        if (state.activeTab === 'tab-camera' || state.activeTab === 'tab-upload') {
            elements.loadingTitle.textContent = '画像認識中...';
            elements.loadingSubtitle.textContent = '写真から食材を読み取っています。しばらくお待ちください。';
        } else {
            elements.loadingTitle.textContent = '食材を整理中...';
            elements.loadingSubtitle.textContent = '入力された食材を整理しています。しばらくお待ちください。';
        }
    }

    showSection(elements.sectionLoading);

    try {
        let result = null;

        if (isReanalysis) {
            // Re-analyze / recipe generation using the current chips list (Step 2)
            if (state.currentIngredients.length === 0) {
                throw new Error('食材リストが空です。レシピを提案するために食材を1つ以上指定してください。');
            }
            result = await GeminiService.analyzeTextIngredients(
                state.currentIngredients, 
                state.apiKey, 
                state.mainIngredient, 
                isUpgrade,
                isZubora
            );
            
            if (!result) throw new Error('レシピデータを取得できませんでした。');
            
            // Update Recipes
            state.currentRecipes = result.recipes || [];
        } else {
            // Step 1: Ingredient Recognition only (do not generate recipes yet!)
            if (state.activeTab === 'tab-camera') {
                if (!state.capturedImageBase64) throw new Error('撮影された写真がありません。');
                result = await GeminiService.recognizeIngredients(
                    state.capturedImageBase64, 
                    state.capturedImageMimeType, 
                    state.apiKey
                );
            } else if (state.activeTab === 'tab-upload') {
                if (!state.uploadedImageBase64) throw new Error('選択された画像ファイルがありません。');
                result = await GeminiService.recognizeIngredients(
                    state.uploadedImageBase64, 
                    state.uploadedImageMimeType, 
                    state.apiKey
                );
            } else if (state.activeTab === 'tab-text') {
                const rawText = elements.textareaIngredients.value.trim();
                if (!rawText) throw new Error('食材が入力されていません。');
                
                // Parse ingredients list from text (split by commas, spaces, or lines)
                const items = rawText.split(/[,\n、\s]+/).map(i => i.trim()).filter(i => i.length > 0);
                if (items.length === 0) throw new Error('有効な食材が入力されていません。');
                
                // Text ingredients can be recognized directly without API call
                result = { ingredients: items };
            }
            
            if (!result) throw new Error('食材を認識できませんでした。');
            
            // Update Ingredients and clear recipes for Step 2
            state.currentIngredients = result.ingredients || [];
            state.currentRecipes = []; // Empty, waiting for Step 2
            state.mainIngredient = null; // Reset main ingredient
        }

        if (!result) throw new Error('レシピデータを取得できませんでした。');

        // Update State
        state.currentIngredients = result.ingredients || [];
        state.currentRecipes = result.recipes || [];

        // Render Results
        renderResults();
        showSection(elements.sectionResults);

    } catch (error) {
        console.error(error);
        
        let friendlyMessage = error.message;
        
        // Translate common Gemini API errors to user-friendly Japanese
        if (friendlyMessage.includes('Quota exceeded') || friendlyMessage.includes('exceeded your current quota') || friendlyMessage.includes('limit:')) {
            friendlyMessage = 'Gemini APIの無料枠の制限（1分間あたりの利用上限）を超えました。約1分間待ってから再度お試しください。';
        } else if (friendlyMessage.includes('API key not valid') || friendlyMessage.includes('API keyExpired')) {
            friendlyMessage = 'APIキーが正しくないか、有効期限が切れています。右上のギアマークから正しいキーが設定されているかご確認ください。';
        } else if (friendlyMessage.includes('experiencing high demand') || friendlyMessage.includes('Service Unavailable') || friendlyMessage.includes('503')) {
            friendlyMessage = '現在、AIのアクセスが非常に集中しています。一時的なものですので、数十秒後に再度お試しください。';
        } else if (friendlyMessage.includes('safety') || friendlyMessage.includes('blocked')) {
            friendlyMessage = '写真またはテキストが安全設定に引っかかり、ブロックされました。別の角度から撮影するか、食材を変更してください。';
        }
        
        showToast(`エラーが発生しました: ${friendlyMessage}`, 'error');
        
        // Go back to input screen
        showSection(elements.sectionInput);
        if (state.activeTab === 'tab-camera') {
            startWebcam();
        }
    }
}

/* ==========================================================================
   RESULTS & RECIPES RENDERING
   ========================================================================== */
function renderResults() {
    // 0. Render Uploaded/Captured Image Preview if available
    if (state.activeTab === 'tab-camera' && state.capturedImageBase64) {
        elements.resultImagePreview.src = `data:${state.capturedImageMimeType};base64,${state.capturedImageBase64}`;
        elements.resultImageWrapper.classList.remove('hidden');
    } else if (state.activeTab === 'tab-upload' && state.uploadedImageBase64) {
        elements.resultImagePreview.src = `data:${state.uploadedImageMimeType};base64,${state.uploadedImageBase64}`;
        elements.resultImageWrapper.classList.remove('hidden');
    } else {
        elements.resultImageWrapper.classList.add('hidden');
        elements.resultImagePreview.src = '';
    }

    // 1. Render Ingredients Chips
    elements.ingredientsChips.innerHTML = '';
    state.currentIngredients.forEach((ingredient, index) => {
        const isMain = state.mainIngredient === ingredient;
        const chip = document.createElement('div');
        chip.className = `chip ${isMain ? 'chip-main' : ''}`;
        chip.innerHTML = `
            <button class="chip-main-btn" onclick="toggleMainIngredient('${escapeHTML(ingredient)}')" title="${isMain ? 'メイン食材から除外' : 'メイン食材に指定'}">
                <i class="fa-solid fa-crown"></i>
            </button>
            <span>${escapeHTML(ingredient)}${isMain ? ' (主役)' : ''}</span>
            <button class="chip-delete" onclick="removeIngredient(${index})" aria-label="${escapeHTML(ingredient)}を削除">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        elements.ingredientsChips.appendChild(chip);
    });

    // 2. Control visibility of Recipes Header and Grid based on whether we have recipes (Step 2)
    elements.recipesGrid.innerHTML = '';
    
    if (state.currentRecipes.length === 0) {
        // Hide recipes section and show call-to-action on buttons
        elements.recipesHeaderWrapper.classList.add('hidden');
        elements.recipesGrid.classList.add('hidden');
        
        // Show all proposal buttons for user selection
        elements.btnReanalyze.innerHTML = `<i class="fa-solid fa-utensils"></i> 通常レシピを提案してもらう`;
        elements.btnReanalyze.className = 'btn btn-primary btn-block';
        
        elements.btnZubora.innerHTML = `<i class="fa-solid fa-bolt"></i> ズボラレシピを提案（超簡単）`;
        elements.btnZubora.className = 'btn btn-warning btn-block';
        
        elements.btnUpgrade.innerHTML = `<i class="fa-solid fa-crown"></i> アップグレードレシピを提案（食材プラス）`;
        elements.btnUpgrade.className = 'btn btn-success btn-block';
        
        elements.btnZubora.classList.remove('hidden');
        elements.btnUpgrade.classList.remove('hidden');
        return;
    }

    // We have recipes! Show the sections
    elements.recipesHeaderWrapper.classList.remove('hidden');
    elements.recipesGrid.classList.remove('hidden');
    
    // Set search buttons text for re-search behavior
    elements.btnReanalyze.innerHTML = `<i class="fa-solid fa-rotate-right"></i> 通常レシピで再検索`;
    elements.btnReanalyze.className = 'btn btn-primary btn-block';
    
    elements.btnZubora.innerHTML = `<i class="fa-solid fa-bolt"></i> ズボラレシピで再検索`;
    elements.btnZubora.className = 'btn btn-warning btn-block';
    
    elements.btnUpgrade.innerHTML = `<i class="fa-solid fa-crown"></i> アップグレードレシピで再検索`;
    elements.btnUpgrade.className = 'btn btn-success btn-block';
    
    elements.btnZubora.classList.remove('hidden');
    elements.btnUpgrade.classList.remove('hidden');

    state.currentRecipes.forEach((recipe, index) => {
        // Check if this recipe requires added ingredients or is a lazy recipe
        const matchStatusText = recipe.match_status || '';
        const isUpgradeRecipe = matchStatusText.includes('追加食材') || matchStatusText.includes('追加');
        const isZuboraRecipe = matchStatusText.includes('ズボラ') || matchStatusText.includes('限界ずぼら') || matchStatusText.includes('簡単') || matchStatusText.includes('ワンパン') || matchStatusText.includes('レンジ') || matchStatusText.includes('時短');
        
        const card = document.createElement('div');
        card.className = `recipe-card ${isUpgradeRecipe ? 'recipe-card-upgrade' : ''}`;
        card.addEventListener('click', () => openRecipeModal(index));
        
        let upgradeBadgeHtml = '';
        if (isUpgradeRecipe) {
            const addedIngredients = matchStatusText.replace(/追加食材:?|追加:?/g, '').trim();
            upgradeBadgeHtml = `
                <div class="super-upgrade-container animate-rainbow-glow">
                    <div class="super-upgrade-label">
                        <i class="fa-solid fa-basket-shopping fa-bounce" style="color: #ff3366;"></i> 🛒 【買い足す必要のある食材】 ✨
                    </div>
                    <div class="super-upgrade-food-names">
                        ${escapeHTML(addedIngredients)}
                    </div>
                </div>
            `;
        }

        let ribbonHtml = '';
        if (isUpgradeRecipe) {
            ribbonHtml = '<span class="ribbon-upgrade"><i class="fa-solid fa-wand-magic-sparkles"></i> ごちそう</span>';
        } else if (isZuboraRecipe) {
            ribbonHtml = '<span class="ribbon-zubora"><i class="fa-solid fa-bolt"></i> 超簡単ズボラ</span>';
        }

        card.innerHTML = `
            <div class="recipe-card-header">
                <h3 class="recipe-card-title">${escapeHTML(recipe.name)}</h3>
                ${ribbonHtml}
            </div>
            ${upgradeBadgeHtml}
            <div class="recipe-card-meta">
                <span class="meta-tag"><i class="fa-regular fa-clock"></i> ${escapeHTML(recipe.time)}</span>
                <span class="meta-tag"><i class="fa-solid fa-gauge-high"></i> ${escapeHTML(recipe.difficulty)}</span>
                ${!isUpgradeRecipe ? `<span class="meta-tag highlight"><i class="fa-solid fa-circle-check"></i> ${escapeHTML(recipe.match_status)}</span>` : ''}
            </div>
            <p class="recipe-card-desc">${escapeHTML(recipe.description)}</p>
            <div class="recipe-card-footer">
                <span>作り方を見る</span> <i class="fa-solid fa-arrow-right"></i>
            </div>
        `;
        elements.recipesGrid.appendChild(card);
    });
}

// Global scope removal function linked in string template
window.removeIngredient = function(index) {
    const removed = state.currentIngredients.splice(index, 1)[0];
    if (state.mainIngredient === removed) {
        state.mainIngredient = null;
    }
    renderResults();
};

window.toggleMainIngredient = function(ingredient) {
    if (state.mainIngredient === ingredient) {
        state.mainIngredient = null;
    } else {
        state.mainIngredient = ingredient;
    }
    renderResults();
};

function addNewIngredientChip() {
    const input = elements.inputAddIngredient;
    const value = input.value.trim();
    if (!value) return;

    if (!state.currentIngredients.includes(value)) {
        state.currentIngredients.push(value);
        renderResults();
    }
    input.value = '';
    input.focus();
}

function resetToInputScreen() {
    resetCameraView();
    resetUploadView();
    elements.textareaIngredients.value = '';
    state.mainIngredient = null;
    showSection(elements.sectionInput);
    
    if (state.activeTab === 'tab-camera') {
        startWebcam();
    }
}

/* ==========================================================================
   RECIPE DETAIL MODAL DISPLAY
   ========================================================================== */
function openRecipeModal(index) {
    const recipe = state.currentRecipes[index];
    if (!recipe) return;

    // Header Details
    elements.modalRecipeHeader.innerHTML = `
        <h2>${escapeHTML(recipe.name)}</h2>
        <p>${escapeHTML(recipe.description)}</p>
    `;

    // Metadata tags
    elements.modalRecipeTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${escapeHTML(recipe.time)}`;
    elements.modalRecipeDifficulty.innerHTML = `<i class="fa-solid fa-gauge-high"></i> ${escapeHTML(recipe.difficulty)}`;
    const matchStatusText = recipe.match_status || '';
    const isUpgradeRecipe = matchStatusText.includes('追加食材') || matchStatusText.includes('追加');
    if (isUpgradeRecipe) {
        elements.modalRecipeMatch.className = 'meta-tag super-upgrade-modal-badge';
        elements.modalRecipeMatch.innerHTML = `<i class="fa-solid fa-basket-shopping fa-beat"></i> 【買い足し】 ${escapeHTML(matchStatusText.replace(/追加食材:?|追加:?/g, '').trim())}`;
    } else {
        elements.modalRecipeMatch.className = 'meta-tag highlight';
        elements.modalRecipeMatch.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${escapeHTML(recipe.match_status)}`;
    }

    // Materials list
    elements.modalRecipeMaterials.innerHTML = '';
    recipe.materials.forEach(mat => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHTML(mat.name)}</span>
            <span>${escapeHTML(mat.amount)}</span>
        `;
        elements.modalRecipeMaterials.appendChild(li);
    });

    // Steps list
    elements.modalRecipeSteps.innerHTML = '';
    recipe.steps.forEach((step, idx) => {
        const li = document.createElement('li');
        li.setAttribute('data-step', idx + 1);
        li.textContent = step;
        elements.modalRecipeSteps.appendChild(li);
    });

    // Tips section
    if (recipe.tips) {
        elements.modalRecipeTips.textContent = recipe.tips;
        elements.modalRecipeTipsWrapper.classList.remove('hidden');
    } else {
        elements.modalRecipeTipsWrapper.classList.add('hidden');
    }

    // Display modal
    elements.recipeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scrolling
}

function closeModal() {
    elements.recipeModal.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock background scrolling
}

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Toast Notification system for modern UI feedback
 */
function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconClass = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    
    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <div class="toast-message">${escapeHTML(message)}</div>
        <button class="toast-close" aria-label="閉じる">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    
    // Add close event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    });
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }
    }, 5000);
}
