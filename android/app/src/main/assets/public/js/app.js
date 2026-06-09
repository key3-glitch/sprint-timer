/**
 * MAIN APPLICATION MODULE
 * Coordinates all components
 */

// Race Counter for Ad Management
class RaceCounter {
    constructor() {
        this.count = parseInt(localStorage.getItem('raceCount') || '0');
        this.isPremium = localStorage.getItem('isPremium') === 'true';
        console.log(`[RaceCounter] Initialized: count=${this.count}, premium=${this.isPremium}`);
    }
    
    increment() {
        this.count++;
        localStorage.setItem('raceCount', this.count);
        console.log(`[RaceCounter] Race count: ${this.count}`);
        return this.count;
    }
    
    shouldShowAd() {
        const show = !this.isPremium && this.count % 3 === 0 && this.count > 0;
        console.log(`[RaceCounter] Should show ad: ${show} (count=${this.count}, premium=${this.isPremium})`);
        return show;
    }
    
    setPremium() {
        this.isPremium = true;
        localStorage.setItem('isPremium', 'true');
        console.log('[RaceCounter] Premium activated!');
    }
    
    getCount() {
        return this.count;
    }
    
    isPremiumUser() {
        return this.isPremium;
    }
}

class SprintTimerApp {
    constructor() {
        this.timer = new HighPrecisionTimer();
        this.connection = new ConnectionManager();
        this.sync = new TimeSyncManager(this.timer, this.connection);
        this.detector = null; // Will be initialized when camera is needed
        this.ui = new UIController();
        this.raceCounter = new RaceCounter(); // Race counter for ads
        
        this.state = 'INIT'; // INIT, CONNECTED, IDLE, PREPARING, READY, RUNNING, FINISHED
        this.phoneCount = 2; // Total number of phones (2-5)
        this.phoneRole = null; // 'start', 'phone1', 'phone2', 'phone3', 'finish'
        this.phoneIndex = null; // 0 (start), 1, 2, 3, 4 (finish)
        this.isStart = false; // Is this the start phone?
        this.isFinish = false; // Is this the finish phone?
        this.roomCode = null; // Room code for pairing
        this.raceStartTime = null;
        this.raceData = null;
        this.startPhoto = null; // Start line photo
        this.finishPhoto = null; // Finish line photo
        this.splitTimes = {}; // Store split times from all phones
        this.distances = []; // Distance for each phone in meters [0, 20, 30, 60, ...]
        this.readyPhones = new Set(); // Track which phones are ready
        
        // Onboarding
        this.hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
        
        // Legacy support
        this.isPhone1 = null;
        
        // Check for saved role in localStorage
        this.savedRole = localStorage.getItem('phoneRole');
        this.savedRoomCode = localStorage.getItem('roomCode');
    }

    /**
     * Initialize application
     */
    async initialize() {
        console.log('[App] Initializing...');
        
        // Initialize UI
        this.ui.initialize();
        
        // Setup install prompt for PWA
        this.setupInstallPrompt();
        
        // Show premium badge if user is premium
        if (this.raceCounter.isPremiumUser()) {
            // Will be shown when idle screen is displayed
            setTimeout(() => this.showPremiumBadge(), 100);
        }
        
        // Show splash screen
        this.ui.showScreen('splash');
        
        // Wait 2 seconds
        await this.sleep(2000);
        
        // Check if user has seen onboarding
        if (!this.hasSeenOnboarding) {
            this.showOnboarding();
        } else {
            // Show phone selection screen
            this.showPhoneSelection();
        }
    }

    /**
     * Show phone selection screen
     */
    showPhoneSelection() {
        this.ui.showScreen('connection');
        
        // Show simple 2-phone selection by default
        document.getElementById('simple-phone-selection').style.display = 'flex';
        document.getElementById('phone-count-selection').style.display = 'none';
        document.querySelector('.phone-selection').style.display = 'none';
        document.getElementById('distance-config').style.display = 'none';
        document.getElementById('connecting-info').style.display = 'none';
        
        // Setup simple role selection (2 phones)
        const roleButtons = document.querySelectorAll('.role-btn');
        roleButtons.forEach(btn => {
            btn.onclick = () => {
                const role = btn.dataset.role;
                this.selectSimpleRole(role);
            };
        });
        
        // Setup advanced settings button
        const advancedBtn = document.getElementById('advanced-settings-btn');
        advancedBtn.onclick = () => {
            this.showAdvancedSettings();
        };
    }
    
    /**
     * Select role in simple 2-phone mode
     */
    selectSimpleRole(role) {
        this.phoneCount = 2;
        this.distances = [0, 30]; // Default: 0m start, 30m finish
        
        if (role === 'start') {
            this.phoneRole = 'start';
            this.phoneIndex = 0;
            this.isStart = true;
            this.isFinish = false;
            
            // Start phone: Show distance config
            this.showSimpleDistanceConfig();
        } else {
            // Finish phone
            this.phoneRole = 'finish';
            this.phoneIndex = 1;
            this.isStart = false;
            this.isFinish = true;
            
            // Finish phone: Ask for room code
            this.joinRoom();
        }
    }
    
    /**
     * Show simple distance config (2 phones)
     */
    async showSimpleDistanceConfig() {
        document.getElementById('simple-phone-selection').style.display = 'none';
        
        const distanceConfig = document.getElementById('distance-config');
        distanceConfig.style.display = 'block';
        
        const container = document.getElementById('distance-inputs-container');
        container.innerHTML = `
            <div class="distance-input-group">
                <label class="distance-label">
                    <span class="distance-icon">🏁</span>
                    <span class="distance-name">Start Telefonu</span>
                </label>
                <div class="distance-value-fixed">0 m</div>
            </div>
            <div class="distance-input-group">
                <label class="distance-label">
                    <span class="distance-icon">🎯</span>
                    <span class="distance-name">Finish Telefonu</span>
                </label>
                <input type="number" 
                       class="distance-input" 
                       id="distance-finish" 
                       placeholder="Mesafe (m)" 
                       value="30"
                       min="1" 
                       step="1">
            </div>
        `;
        
        const confirmBtn = document.getElementById('confirm-distances-btn');
        confirmBtn.onclick = () => {
            const finishDistance = parseInt(document.getElementById('distance-finish').value);
            
            if (!finishDistance || finishDistance <= 0) {
                this.ui.showToast('Lütfen geçerli bir mesafe girin', 'error');
                return;
            }
            
            this.distances = [0, finishDistance];
            console.log('[App] Distances configured:', this.distances);
            
            // Start connection
            this.startConnection();
        };
    }
    
    /**
     * Join room (Finish phone in 2-phone mode)
     */
    async joinRoom() {
        document.getElementById('simple-phone-selection').style.display = 'none';
        document.getElementById('connecting-info').style.display = 'block';
        
        // Ask for room code
        try {
            const roomCode = await this.showRoomCodeInput();
            
            this.ui.updateConnectionProgress(0, 'Başlatılıyor...');
            
            const phoneRole = this.getRoleDisplayName();
            this.ui.updateConnectionInfo(phoneRole, 'Bağlanıyor...');
            this.ui.updateConnectionProgress(20, 'Bağlantı kuruluyor...');
            
            // Connect to server
            this.ui.showToast('Sunucuya bağlanılıyor...', 'info');
            const connectionType = await this.connection.connect(false);
            this.ui.updateConnectionInfo(phoneRole, connectionType.toUpperCase());
            this.ui.updateConnectionProgress(50, 'Bağlantı kuruldu');
            
            // Join room
            this.ui.updateConnectionProgress(60, 'Odaya katılınıyor...');
            this.ui.showToast(`Oda kodu: ${roomCode}`, 'info');
            
            const roomData = await this.connection.joinRoom(roomCode);
            
            // Get room configuration
            this.phoneCount = roomData.phoneCount;
            this.distances = roomData.distances;
            this.roomCode = roomCode;
            
            console.log('[App] Joined room:', roomCode, 'with', this.phoneCount, 'phones');
            console.log('[App] Distances:', this.distances);
            
            this.ui.updateConnectionProgress(90, 'Senkronizasyon başlatılıyor...');
            
            // Initialize sync
            await this.sync.initialize(false);
            
            this.ui.updateConnectionProgress(100, 'Hazır!');
            this.ui.showToast('Bağlantı başarılı!', 'success');
            
            // Wait a moment
            await this.sleep(500);
            
            // Go to idle screen
            this.goToIdleScreen();
            
        } catch (error) {
            console.error('[App] Join room failed:', error);
            
            // Show user-friendly error message
            let errorMsg = 'Bağlantı hatası';
            if (error.message.includes('Zaman aşımı')) {
                errorMsg = 'Sunucu yanıt vermiyor. Lütfen tekrar deneyin.';
            } else if (error.message.includes('Sunucuya bağlı değil')) {
                errorMsg = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
            } else if (error.message.includes('Oda bulunamadı')) {
                errorMsg = 'Oda bulunamadı. Kodu kontrol edin.';
            } else {
                errorMsg = `Hata: ${error.message}`;
            }
            
            this.ui.showError(errorMsg);
            
            // Reset and show selection again
            await this.sleep(3000);
            this.showPhoneSelection();
        }
    }
    
    /**
     * Show advanced settings (3+ phones)
     */
    showAdvancedSettings() {
        document.getElementById('simple-phone-selection').style.display = 'none';
        document.getElementById('phone-count-selection').style.display = 'block';
        
        // Setup back button
        const backBtn = document.getElementById('back-to-simple-btn');
        backBtn.onclick = () => {
            this.showPhoneSelection();
        };
        
        // Setup phone count selection
        const countButtons = document.querySelectorAll('.phone-count-btn');
        countButtons.forEach(btn => {
            btn.onclick = () => {
                const count = parseInt(btn.dataset.count);
                this.selectPhoneCount(count);
            };
        });
    }
    
    /**
     * Select phone count and show next step
     */
    selectPhoneCount(count) {
        this.phoneCount = count;
        console.log(`[App] Phone count selected: ${count}`);
        
        // Hide count selection
        document.getElementById('phone-count-selection').style.display = 'none';
        
        // Show role selection (distance config will be shown only for Start phone after role selection)
        document.querySelector('.phone-selection').style.display = 'block';
        
        // Generate role buttons (with placeholder distances for now)
        this.generateRoleButtonsWithoutDistances();
    }
    
    /**
     * Generate distance input fields
     */
    generateDistanceInputs() {
        const container = document.getElementById('distance-inputs-container');
        container.innerHTML = '';
        
        // Start phone is always 0m
        const startInput = document.createElement('div');
        startInput.className = 'distance-input-group';
        startInput.innerHTML = `
            <label class="distance-label">
                <span class="distance-icon">🏁</span>
                <span class="distance-name">Start Telefonu</span>
            </label>
            <div class="distance-value-fixed">0 m</div>
        `;
        container.appendChild(startInput);
        
        // Intermediate phones
        for (let i = 1; i < this.phoneCount - 1; i++) {
            const input = document.createElement('div');
            input.className = 'distance-input-group';
            input.innerHTML = `
                <label class="distance-label">
                    <span class="distance-icon">📍</span>
                    <span class="distance-name">${i}. Telefon</span>
                </label>
                <input type="number" 
                       class="distance-input" 
                       id="distance-phone-${i}" 
                       placeholder="Mesafe (m)" 
                       min="1" 
                       step="1">
            `;
            container.appendChild(input);
        }
        
        // Finish phone
        const finishInput = document.createElement('div');
        finishInput.className = 'distance-input-group';
        finishInput.innerHTML = `
            <label class="distance-label">
                <span class="distance-icon">🎯</span>
                <span class="distance-name">Finish Telefonu</span>
            </label>
            <input type="number" 
                   class="distance-input" 
                   id="distance-finish" 
                   placeholder="Mesafe (m)" 
                   min="1" 
                   step="1">
        `;
        container.appendChild(finishInput);
        
        // Setup confirm button
        const confirmBtn = document.getElementById('confirm-distances-btn');
        confirmBtn.onclick = () => this.confirmDistances();
    }
    
    /**
     * Confirm distances and start connection (Start phone only)
     */
    confirmDistances() {
        // Collect distances
        this.distances = [0]; // Start is always 0m
        
        // Get intermediate phone distances
        for (let i = 1; i < this.phoneCount - 1; i++) {
            const input = document.getElementById(`distance-phone-${i}`);
            const value = parseInt(input.value);
            
            if (!value || value <= 0) {
                this.ui.showToast(`Lütfen ${i}. telefon için geçerli bir mesafe girin`, 'error');
                input.focus();
                return;
            }
            
            this.distances.push(value);
        }
        
        // Get finish distance
        const finishInput = document.getElementById('distance-finish');
        const finishValue = parseInt(finishInput.value);
        
        if (!finishValue || finishValue <= 0) {
            this.ui.showToast('Lütfen Finish telefonu için geçerli bir mesafe girin', 'error');
            finishInput.focus();
            return;
        }
        
        this.distances.push(finishValue);
        
        // Validate distances are in ascending order
        for (let i = 1; i < this.distances.length; i++) {
            if (this.distances[i] <= this.distances[i - 1]) {
                this.ui.showToast('Mesafeler artan sırada olmalıdır', 'error');
                return;
            }
        }
        
        console.log('[App] Distances configured:', this.distances);
        
        // Start connection directly (no need to show role selection again)
        this.startConnection();
    }
    
    /**
     * Generate role selection buttons WITHOUT distances (before distance config)
     */
    generateRoleButtonsWithoutDistances() {
        const container = document.getElementById('role-buttons-container');
        container.innerHTML = '';
        
        const roles = [
            { role: 'start', index: 0, icon: '🏁', title: 'Start Telefonu', subtitle: 'Başlangıç Çizgisi' }
        ];
        
        // Add intermediate phones
        for (let i = 1; i < this.phoneCount - 1; i++) {
            roles.push({
                role: `phone${i}`,
                index: i,
                icon: '📍',
                title: `${i}. Telefon`,
                subtitle: 'Ara Nokta'
            });
        }
        
        // Add finish phone
        roles.push({
            role: 'finish',
            index: this.phoneCount - 1,
            icon: '🎯',
            title: 'Finish Telefonu',
            subtitle: 'Bitiş Çizgisi'
        });
        
        // Create buttons
        roles.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-large phone-select-btn';
            btn.innerHTML = `
                <span class="btn-icon">${r.icon}</span>
                <div class="btn-content">
                    <span class="btn-title">${r.title}</span>
                    <span class="btn-subtitle">${r.subtitle}</span>
                </div>
            `;
            btn.onclick = () => this.selectPhoneRole(r.role, r.index);
            container.appendChild(btn);
        });
    }
    
    /**
     * Generate role selection buttons WITH distances (after distance config)
     */
    generateRoleButtons() {
        const container = document.getElementById('role-buttons-container');
        container.innerHTML = '';
        
        const roles = [
            { role: 'start', index: 0, icon: '🏁', title: 'Start Telefonu', subtitle: `Başlangıç Çizgisi (${this.distances[0]}m)` }
        ];
        
        // Add intermediate phones
        for (let i = 1; i < this.phoneCount - 1; i++) {
            roles.push({
                role: `phone${i}`,
                index: i,
                icon: '📍',
                title: `${i}. Telefon`,
                subtitle: `Ara Nokta (${this.distances[i]}m)`
            });
        }
        
        // Add finish phone
        roles.push({
            role: 'finish',
            index: this.phoneCount - 1,
            icon: '🎯',
            title: 'Finish Telefonu',
            subtitle: `Bitiş Çizgisi (${this.distances[this.phoneCount - 1]}m)`
        });
        
        // Create buttons
        roles.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-large phone-select-btn';
            btn.innerHTML = `
                <span class="btn-icon">${r.icon}</span>
                <div class="btn-content">
                    <span class="btn-title">${r.title}</span>
                    <span class="btn-subtitle">${r.subtitle}</span>
                </div>
            `;
            btn.onclick = () => this.selectPhoneRole(r.role, r.index);
            container.appendChild(btn);
        });
    }
    
    /**
     * Select phone role
     */
    selectPhoneRole(role, index) {
        this.phoneRole = role;
        this.phoneIndex = index;
        this.isStart = (role === 'start');
        this.isFinish = (role === 'finish');
        
        // Legacy support
        this.isPhone1 = this.isStart;
        
        console.log(`[App] Role selected: ${role} (index: ${index})`);
        
        // If START phone, show distance configuration first
        if (this.isStart) {
            this.showDistanceConfiguration();
        } else {
            // Other phones go directly to connection
            this.startConnection();
        }
    }
    
    /**
     * Show distance configuration (Start phone only)
     */
    showDistanceConfiguration() {
        // Hide role selection
        document.querySelector('.phone-selection').style.display = 'none';
        
        // Show distance config
        document.getElementById('distance-config').style.display = 'block';
        
        // Generate distance input fields
        this.generateDistanceInputs();
    }

    /**
     * Get role display name
     */
    getRoleDisplayName() {
        if (this.isStart) return `Start Telefonu (${this.distances[0]}m)`;
        if (this.isFinish) return `Finish Telefonu (${this.distances[this.phoneCount - 1]}m)`;
        const phoneNum = this.phoneIndex;
        return `${phoneNum}. Telefon (${this.distances[phoneNum]}m)`;
    }
    
    /**
     * Start connection process
     */
    async startConnection() {
        // Hide phone selection, show connecting info
        document.querySelector('.phone-selection').style.display = 'none';
        document.getElementById('connecting-info').style.display = 'block';
        
        this.ui.updateConnectionProgress(0, 'Başlatılıyor...');
        
        try {
            const phoneRole = this.getRoleDisplayName();
            this.ui.updateConnectionInfo(phoneRole, 'Bağlanıyor...');
            this.ui.updateConnectionProgress(20, 'Bağlantı kuruluyor...');
            
            // Connect to server
            const connectionType = await this.connection.connect(this.isPhone1);
            this.ui.updateConnectionInfo(phoneRole, connectionType.toUpperCase());
            this.ui.updateConnectionProgress(50, 'Bağlantı kuruldu');
            
            // Create or join room
            if (this.isStart) {
                // START PHONE: Creates room
                this.ui.updateConnectionProgress(60, 'Oda oluşturuluyor...');
                console.log(`[App] Creating room with ${this.phoneCount} phones and distances:`, this.distances);
                this.roomCode = await this.connection.createRoom(this.phoneCount, this.distances);
                console.log(`[App] Room created: ${this.roomCode} (${this.phoneCount} phones)`);
                this.ui.updateConnectionProgress(70, `Oda Kodu: ${this.roomCode}`);
                
                // Save role and room code
                localStorage.setItem('phoneRole', this.phoneRole);
                localStorage.setItem('phoneCount', this.phoneCount.toString());
                localStorage.setItem('roomCode', this.roomCode);
                localStorage.setItem('distances', JSON.stringify(this.distances));
                
                // Show room code modal IMMEDIATELY
                console.log('[App] Showing room code modal...');
                this.showRoomCodeDisplay(this.roomCode);
                
                // ALSO show inline (backup)
                const inlineDisplay = document.getElementById('room-code-display-inline');
                const inlineValue = document.getElementById('room-code-value-inline');
                if (inlineDisplay && inlineValue) {
                    inlineValue.textContent = this.roomCode;
                    inlineDisplay.style.display = 'block';
                    console.log('[App] Inline room code shown');
                }
                
                console.log('[App] Room code modal shown');
                
                // Wait for all other phones
                this.ui.updateConnectionProgress(80, `${this.phoneCount - 1} telefon bekleniyor...`);
                await this.waitForAllPeers();
                
                // Hide modal
                this.hideRoomCodeDisplay();
                
            } else {
                // OTHER PHONES: Join room
                this.ui.updateConnectionProgress(60, 'Oda kodu bekleniyor...');
                
                // Show room code input modal
                const roomCode = await this.showRoomCodeInput();
                
                if (!roomCode || roomCode.length !== 4) {
                    throw new Error('Geçersiz oda kodu');
                }
                
                this.ui.updateConnectionProgress(70, 'Odaya katılınıyor...');
                const roomConfig = await this.connection.joinRoom(roomCode, this.phoneRole);
                
                if (!roomConfig) {
                    throw new Error('Odaya katılınamadı');
                }
                
                this.roomCode = roomCode;
                
                // Receive room configuration (distances, phoneCount)
                if (roomConfig.distances) {
                    this.distances = roomConfig.distances;
                    console.log(`[App] Received distances from room:`, this.distances);
                }
                if (roomConfig.phoneCount) {
                    this.phoneCount = roomConfig.phoneCount;
                }
                
                console.log(`[App] Joined room: ${this.roomCode}`);
                
                // Save role and room code
                localStorage.setItem('phoneRole', this.phoneRole);
                localStorage.setItem('phoneCount', this.phoneCount.toString());
                localStorage.setItem('roomCode', this.roomCode);
                localStorage.setItem('distances', JSON.stringify(this.distances));
            }
            
            this.ui.updateConnectionProgress(90, 'Senkronizasyon başlatılıyor...');
            
            // Initialize sync
            await this.sync.initialize(this.isPhone1);
            
            this.ui.updateConnectionProgress(100, 'Hazır!');
            
            // NON-FINISH PHONES: Setup PREPARE listener EARLY
            if (!this.isFinish) {
                console.log(`[App] ${this.getRoleDisplayName()}: Setting up PREPARE listener (early)`);
                
                const prepareHandler = (message) => {
                    if (message.type === 'PREPARE' && this.state === 'IDLE') {
                        console.log(`[App] ${this.getRoleDisplayName()}: Received PREPARE signal from Finish phone`);
                        this.startPreparation();
                    }
                };
                
                // Remove old handler if exists
                if (this._prepareHandler) {
                    this.connection.off('message', this._prepareHandler);
                }
                
                // Store and add new handler
                this._prepareHandler = prepareHandler;
                this.connection.on('message', prepareHandler);
            }
            
            // Wait a moment
            await this.sleep(500);
            
            // Go to idle screen
            this.goToIdleScreen();
            
        } catch (error) {
            console.error('[App] Connection failed:', error);
            this.ui.showError(`Bağlantı hatası: ${error.message}`);
            
            // Reset and show selection again
            await this.sleep(2000);
            document.querySelector('.phone-selection').style.display = 'block';
            document.getElementById('connecting-info').style.display = 'none';
        }
    }
    
    /**
     * Wait for peer to connect (Phone 1 only)
     */
    waitForPeer() {
        return new Promise((resolve) => {
            // Setup one-time listener for peer connection
            const handler = (message) => {
                if (message.type === 'peer-connected') {
                    console.log('[App] Peer connected, continuing...');
                    this.connection.off('message', handler);
                    resolve();
                }
            };
            
            this.connection.on('message', handler);
        });
    }
    
    /**
     * Wait for all peers to connect (Start phone only)
     */
    waitForAllPeers() {
        return new Promise((resolve) => {
            let connectedCount = 0;
            const expectedCount = this.phoneCount - 1; // All except start phone
            
            const handler = (message) => {
                if (message.type === 'peer-connected') {
                    connectedCount++;
                    console.log(`[App] Peer ${connectedCount}/${expectedCount} connected`);
                    
                    if (connectedCount >= expectedCount) {
                        console.log('[App] All peers connected!');
                        this.connection.off('message', handler);
                        resolve();
                    }
                }
            };
            
            this.connection.on('message', handler);
        });
    }
    
    /**
     * Show room code display modal (Start Phone)
     */
    showRoomCodeDisplay(roomCode) {
        console.log('[App] showRoomCodeDisplay called with code:', roomCode);
        
        const modal = document.getElementById('room-code-display-modal');
        const codeDisplay = document.getElementById('room-code-display');
        
        if (!modal) {
            console.error('[App] Modal element not found!');
            return;
        }
        
        if (!codeDisplay) {
            console.error('[App] Code display element not found!');
            return;
        }
        
        codeDisplay.textContent = roomCode;
        modal.classList.add('active');
        
        console.log('[App] Room code display shown:', roomCode);
        console.log('[App] Modal classes:', modal.className);
    }
    
    /**
     * Hide room code display modal
     */
    hideRoomCodeDisplay() {
        const modal = document.getElementById('room-code-display-modal');
        modal.classList.remove('active');
    }
    
    /**
     * Show room code input modal (Finish Phone)
     */
    showRoomCodeInput() {
        return new Promise((resolve, reject) => {
            const modal = document.getElementById('room-code-modal');
            const input = document.getElementById('room-code-input');
            const submitBtn = document.getElementById('room-code-submit-btn');
            const cancelBtn = document.getElementById('room-code-cancel-btn');
            
            // Clear previous input
            input.value = '';
            
            // Show modal
            modal.classList.add('active');
            
            // Focus input
            setTimeout(() => input.focus(), 300);
            
            // Auto-format input (only numbers)
            input.oninput = (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            };
            
            // Submit handler
            const handleSubmit = () => {
                const code = input.value.trim();
                
                if (code.length !== 4) {
                    this.ui.showToast('Lütfen 4 haneli kod girin', 'error');
                    input.focus();
                    return;
                }
                
                cleanup();
                modal.classList.remove('active');
                resolve(code);
            };
            
            // Cancel handler
            const handleCancel = () => {
                cleanup();
                modal.classList.remove('active');
                reject(new Error('Kullanıcı iptal etti'));
            };
            
            // Cleanup function
            const cleanup = () => {
                submitBtn.onclick = null;
                cancelBtn.onclick = null;
                input.onkeypress = null;
            };
            
            // Attach handlers
            submitBtn.onclick = handleSubmit;
            cancelBtn.onclick = handleCancel;
            
            // Enter key to submit
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            };
        });
    }
    
    /**
     * Disconnect and reset
     */
    disconnect() {
        console.log('[App] Disconnecting...');
        
        // Clear saved data
        localStorage.removeItem('phoneRole');
        localStorage.removeItem('roomCode');
        
        // Disconnect connection
        this.connection.disconnect();
        
        // Reset state
        this.state = 'INIT';
        this.isPhone1 = null;
        this.roomCode = null;
        this.raceStartTime = null;
        this.raceData = null;
        
        // Show selection screen
        this.showPhoneSelection();
        
        this.ui.showToast('Bağlantı kesildi', 'info');
    }

    /**
     * Go to idle screen
     */
    goToIdleScreen() {
        this.state = 'IDLE';
        this.ui.showScreen('idle');
        
        // Update phone info based on role
        let position, location;
        
        if (this.isStart) {
            position = 'Start Telefonu';
            location = `Başlangıç Çizgisi (${this.distances[0]}m)`;
        } else if (this.isFinish) {
            position = 'Finish Telefonu';
            location = `Bitiş Çizgisi (${this.distances[this.distances.length - 1]}m)`;
        } else {
            // Intermediate phone
            position = `${this.phoneIndex}. Telefon`;
            location = `Ara Nokta (${this.distances[this.phoneIndex]}m)`;
        }
        
        this.ui.updatePhoneInfo(position, location);
        
        // Update sync status
        this.updateSyncDisplay();
        
        // Setup button handlers
        this.setupIdleHandlers();
        
        // Start sync status updates
        this.startSyncUpdates();
        
        // NON-FINISH PHONES: PREPARE listener is already set up in startConnection
        // No need to set it up again here
    }

    /**
     * Setup idle screen handlers
     */
    setupIdleHandlers() {
        const prepareBtn = this.ui.getButton('prepare');
        
        if (this.isStart) {
            // START PHONE: Hide prepare button, show waiting message
            prepareBtn.style.display = 'none';
            
            // Remove old waiting message if exists
            const oldWaitingMsg = document.getElementById('waiting-message');
            if (oldWaitingMsg) {
                oldWaitingMsg.remove();
            }
            
            // Show waiting message
            const waitingMsg = document.createElement('div');
            waitingMsg.id = 'waiting-message';
            waitingMsg.className = 'waiting-message';
            waitingMsg.innerHTML = `
                <div class="waiting-icon">⏳</div>
                <h3>Finish Telefonunu Bekliyor</h3>
                <p>Finish telefonundan "HAZIRLA" butonuna basılmasını bekleyin</p>
            `;
            prepareBtn.parentElement.insertBefore(waitingMsg, prepareBtn);
            
        } else if (this.isFinish) {
            // FINISH PHONE: Show prepare button
            prepareBtn.style.display = 'block';
            prepareBtn.onclick = () => this.startPreparation();
            
            // Remove waiting message if exists
            const oldWaitingMsg = document.getElementById('waiting-message');
            if (oldWaitingMsg) {
                oldWaitingMsg.remove();
            }
            
        } else {
            // INTERMEDIATE PHONES: Hide prepare button, show waiting message
            prepareBtn.style.display = 'none';
            
            // Remove old waiting message if exists
            const oldWaitingMsg = document.getElementById('waiting-message');
            if (oldWaitingMsg) {
                oldWaitingMsg.remove();
            }
            
            // Show waiting message
            const waitingMsg = document.createElement('div');
            waitingMsg.id = 'waiting-message';
            waitingMsg.className = 'waiting-message';
            waitingMsg.innerHTML = `
                <div class="waiting-icon">⏳</div>
                <h3>Finish Telefonunu Bekliyor</h3>
                <p>Finish telefonundan "HAZIRLA" butonuna basılmasını bekleyin</p>
            `;
            prepareBtn.parentElement.insertBefore(waitingMsg, prepareBtn);
        }
        
        const settingsBtn = this.ui.getButton('settings');
        settingsBtn.onclick = () => this.ui.showToast('Ayarlar yakında gelecek', 'info');
        
        const historyBtn = this.ui.getButton('history');
        historyBtn.onclick = () => this.ui.showToast('Geçmiş yakında gelecek', 'info');
    }

    /**
     * Start preparation phase
     */
    async startPreparation() {
        this.state = 'PREPARING';
        this.ui.showScreen('preparation');
        
        // START PHONE: Setup READY handler EARLY (before going to READY screen)
        if (this.isStart) {
            console.log('[App] Start Phone: Setting up READY handler during PREPARATION');
            
            // Initialize ready phones tracker if not exists (don't reset if already tracking)
            if (!this.readyPhones) {
                this.readyPhones = new Set();
            }
            
            // Listen for READY messages from other phones
            const readyHandler = (message) => {
                console.log('[App] Start Phone: Received message:', message.type, 'from:', message.fromRole || message.payload?.role);
                
                if (message.type === 'READY') {
                    const role = message.payload?.role || message.fromRole;
                    if (role) {
                        this.readyPhones.add(role);
                        console.log(`[App] Start Phone: ${role} is ready (${this.readyPhones.size}/${this.phoneCount - 1})`);
                        console.log(`[App] Start Phone: Ready phones:`, Array.from(this.readyPhones));
                    } else {
                        console.warn('[App] Start Phone: READY message without role info');
                    }
                }
            };
            
            // Remove old handler if exists
            if (this._readyHandler) {
                this.connection.off('message', this._readyHandler);
            }
            
            // Store and add new handler
            this._readyHandler = readyHandler;
            this.connection.on('message', readyHandler);
        }
        
        // Setup cancel handler
        const cancelBtn = this.ui.getButton('cancelPreparation');
        cancelBtn.onclick = () => {
            this.state = 'IDLE';
            
            // If Finish phone, notify Start phone to cancel
            if (!this.isPhone1) {
                this.connection.send({
                    type: 'CANCEL_PREPARE',
                    timestamp: this.timer.now(),
                    payload: {}
                });
            }
            
            this.goToIdleScreen();
        };
        
        // If Finish phone, send PREPARE signal to Start phone
        if (!this.isPhone1) {
            this.connection.send({
                type: 'PREPARE',
                timestamp: this.timer.now(),
                payload: {}
            });
            console.log('[App] Finish Phone: PREPARE signal sent to Start phone');
        }
        
        // Start countdown (5 seconds) with VERY LOUD audio beeps
        for (let i = 5; i > 0; i--) {
            this.ui.updateCountdown(i);
            this.ui.updatePreparationStatus(
                i > 3 ? 'Hazırlanıyor...' : 'Hazır ✓',
                i > 2 ? 'Kalibrasyon...' : 'Tamamlandı ✓',
                '±5ms'
            );
            
            // Play countdown beep (short beep, VERY LOUD - MAXIMUM)
            this.playBeep(200, 800, 1.0); // 200ms, 800Hz, volume 1.0 (MAKSİMUM)
            
            await this.sleep(1000);
        }
        
        // Perform high-precision sync
        this.ui.updatePreparationStatus('Hazır ✓', 'Son senkronizasyon...', '±5ms');
        const syncResult = await this.sync.preparationSync();
        
        if (syncResult) {
            this.ui.updatePreparationStatus('Hazır ✓', 'Tamamlandı ✓', syncResult.accuracy);
            
            // Play long ready beep (1.5 seconds, VERY LOUD - MAXIMUM)
            this.playBeep(1500, 600, 1.0); // 1500ms (daha uzun), 600Hz, volume 1.0 (MAKSİMUM)
            
            await this.sleep(500);
            
            // Go to ready screen
            this.goToReadyScreen();
        } else {
            this.ui.showError('Senkronizasyon başarısız');
        }
    }
    
    /**
     * Play audio beep
     * @param {number} duration - Duration in milliseconds
     * @param {number} frequency - Frequency in Hz (default 800)
     * @param {number} volume - Volume 0-1 (default 1.0)
     */
    playBeep(duration = 200, frequency = 800, volume = 1.0) {
        try {
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create oscillator (tone generator)
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure oscillator
            oscillator.frequency.value = frequency;
            oscillator.type = 'square'; // Square wave for LOUDER sound
            
            // Configure volume - NO FADE OUT for maximum loudness
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            
            // Play
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
            
            console.log(`[App] LOUD Beep played: ${duration}ms, ${frequency}Hz, volume ${volume}`);
        } catch (error) {
            console.error('[App] Audio beep failed:', error);
        }
    }

    /**
     * Go to ready screen
     */
    async goToReadyScreen() {
        this.state = 'READY';
        this.ui.showScreen('ready');
        
        // DON'T reset ready phones - they were already collected during PREPARATION
        // this.readyPhones = new Set(); // REMOVED
        
        // Request wake lock to prevent screen sleep
        await this.requestWakeLock();
        
        // Initialize camera and detector
        const video = document.getElementById('camera-preview');
        const canvas = document.getElementById('camera-canvas');
        this.detector = new MotionDetector(video, canvas);
        
        try {
            console.log('[App] Initializing camera...');
            await this.detector.initializeCamera();
            console.log('[App] Camera initialized successfully');
            
            // START PHONE: Just log ready status (no background color change)
            if (this.isStart) {
                console.log('[App] Start Phone: Checking ready status...');
                console.log(`[App] Start Phone: Ready phones:`, Array.from(this.readyPhones));
                console.log(`[App] Start Phone: ${this.readyPhones.size}/${this.phoneCount - 1} phones ready`);
                console.log('[App] Start Phone: Camera is active and ready to detect');
            }
            
            // ALL NON-START PHONES: Setup START message listener
            if (!this.isStart) {
                console.log(`[App] ${this.getRoleDisplayName()}: Setting up START message listener`);
                
                this.connection.on('message', (message) => {
                    if (message.type === 'START' && this.state === 'READY') {
                        console.log(`[App] ${this.getRoleDisplayName()}: Received START signal`);
                        
                        // CRITICAL: Use startTime from Start phone's message (synchronized timestamp)
                        // This ensures both phones use the exact same start reference time
                        this.raceStartTime = message.payload.startTime;
                        this.state = 'RUNNING';
                        
                        console.log(`[App] ${this.getRoleDisplayName()}: Using synchronized startTime=${this.raceStartTime.toFixed(2)}ms`);
                        
                        // Store start photo from Start phone
                        this.startPhoto = message.payload.photo;
                        
                        console.log(`[App] ${this.getRoleDisplayName()}: State=RUNNING, detecting ${this.isFinish ? 'FINISH' : 'SPLIT'}`);
                        
                        // Update UI
                        this.ui.showScreen('running');
                        this.ui.updateRunningScreen('⏱️', 'KOŞUYOR!', 'Zamanlayıcı çalışıyor', '');
                        
                        // Start live timer if finish phone
                        if (this.isFinish) {
                            this.startLiveTimer();
                        }
                    }
                });
            }
            
            // Start detection
            this.detector.startDetection((detection) => {
                this.onMotionDetected(detection);
            });
            
            // Setup cancel handler
            const cancelBtn = this.ui.getButton('cancelReady');
            cancelBtn.onclick = () => {
                this.detector.stopDetection();
                this.detector.stopCamera();
                this.state = 'IDLE';
                this.readyPhones.clear();
                this.goToIdleScreen();
            };
            
            // Send READY signal
            this.connection.send({
                type: 'READY',
                timestamp: this.timer.now(),
                payload: {
                    role: this.phoneRole
                }
            });
            
            console.log(`[App] ${this.getRoleDisplayName()}: READY signal sent`);
            
        } catch (error) {
            console.error('[App] Camera initialization failed:', error);
            console.error('[App] Error details:', error.message);
            console.error('[App] Phone role:', this.phoneRole);
            console.error('[App] Is Start:', this.isStart);
            
            // Show user-friendly error
            if (error.name === 'NotAllowedError') {
                this.ui.showError('Kamera izni reddedildi. Lütfen ayarlardan kamera iznini verin.');
            } else if (error.name === 'NotFoundError') {
                this.ui.showError('Kamera bulunamadı. Cihazınızda kamera var mı?');
            } else {
                this.ui.showError('Kamera erişimi başarısız: ' + error.message);
            }
        }
    }
    
    /**
    /**
     * Handle motion detection
     */
    onMotionDetected(detection) {
        console.log(`[App] onMotionDetected - State: ${this.state}, isStart: ${this.isStart}, isFinish: ${this.isFinish}`);
        
        if (this.state === 'READY' && this.isStart) {
            // START PHONE: Check if all phones are ready before starting
            if (this.readyPhones.size < this.phoneCount - 1) {
                console.log(`[App] Start Phone: Cannot start - only ${this.readyPhones.size}/${this.phoneCount - 1} phones ready`);
                this.ui.showToast('Tüm telefonlar hazır değil!', 'warning');
                return;
            }
            
            // All ready - START the race
            this.raceStartTime = detection.timestamp;
            this.state = 'RUNNING';
            
            // CLEAR old split times before starting new race
            this.splitTimes = {};
            
            // Store start photo
            this.startPhoto = detection.frame;
            
            // Send START signal to ALL phones (with photo)
            this.connection.send({
                type: 'START',
                timestamp: this.timer.timestamp(),
                payload: {
                    phone: 'START',
                    startTime: this.raceStartTime,
                    frame: detection.frame,
                    photo: detection.frame
                }
            });
            
            console.log('[App] Start Phone: START signal sent');
            
            // Update UI - Start phone waits
            this.ui.showScreen('running');
            this.ui.updateRunningScreen('✅', 'BAŞLADI!', 'Sinyal gönderildi', 'Diğer telefonlar bekleniyor...');
            
            // Stop detection - Start phone is done
            this.detector.stopDetection();
            
            // Setup SPLIT and STOP listeners (only once)
            if (!this._raceMessageHandler) {
                this._raceMessageHandler = (message) => {
                    if (message.type === 'SPLIT' && this.state === 'RUNNING') {
                        console.log(`[App] Start Phone: Received SPLIT from ${message.fromRole}: ${message.payload.elapsed}s`);
                        this.splitTimes[message.fromRole] = message.payload;
                    }
                    
                    if (message.type === 'STOP' && this.state === 'RUNNING') {
                        console.log('[App] Start Phone: Received STOP signal from Finish phone');
                        this.state = 'FINISHED';
                        this.finishPhoto = message.payload.photo;
                        this.splitTimes['finish'] = message.payload;
                        this.showResult(message.payload.elapsed);
                    }
                };
                
                this.connection.on('message', this._raceMessageHandler);
                console.log('[App] Start Phone: Race message handler setup');
            }
            
        } else if (this.state === 'RUNNING' && !this.isStart && !this.isFinish) {
            // INTERMEDIATE PHONE: Measure split time
            console.log(`[App] ${this.getRoleDisplayName()}: Split detected`);
            this.onSplitDetected(detection);
            
        } else if (this.state === 'RUNNING' && this.isFinish) {
            // FINISH PHONE: Stop detection
            console.log(`[App] Finish Phone: Finish detected`);
            this.onFinishDetected(detection);
            
        } else if (this.state === 'READY' && !this.isStart) {
            // OTHER PHONES: Ignore motion in READY state (waiting for START signal)
            console.log(`[App] ${this.getRoleDisplayName()}: Waiting for START signal`);
        }
    }
    
    /**
     * Handle split detection (Intermediate phones)
     */
    onSplitDetected(detection) {
        if (this.state !== 'RUNNING' || this.isStart || this.isFinish) {
            return;
        }
        
        const splitTime = detection.timestamp;
        const elapsed = (splitTime - this.raceStartTime) / 1000;
        
        console.log(`[App] ${this.getRoleDisplayName()}: SPLIT detected, elapsed time: ${elapsed.toFixed(2)}s`);
        
        this.state = 'FINISHED';
        this.detector.stopDetection();
        
        // Send SPLIT signal to ALL phones
        this.connection.send({
            type: 'SPLIT',
            timestamp: this.timer.timestamp(),
            payload: {
                role: this.phoneRole,
                index: this.phoneIndex,
                elapsed: elapsed,
                photo: detection.frame
            }
        });
        
        console.log(`[App] ${this.getRoleDisplayName()}: SPLIT signal sent to all phones`);
        
        // Store own split time
        this.splitTimes[this.phoneRole] = {
            role: this.phoneRole,
            index: this.phoneIndex,
            elapsed: elapsed,
            photo: detection.frame
        };
        
        console.log(`[App] ${this.getRoleDisplayName()}: Stored own split time:`, this.splitTimes[this.phoneRole]);
        
        // Wait for finish
        this.ui.showScreen('running');
        this.ui.updateRunningScreen('✅', 'GEÇTİ!', `Split: ${elapsed.toFixed(2)}s`, 'Finish bekleniyor...');
        
        // Listen for SPLIT and STOP from other phones
        this.connection.on('message', (message) => {
            if (message.type === 'SPLIT' && message.fromRole !== this.phoneRole) {
                console.log(`[App] ${this.getRoleDisplayName()}: Received SPLIT from ${message.fromRole}`);
                this.splitTimes[message.fromRole] = message.payload;
            }
            
            if (message.type === 'STOP') {
                console.log(`[App] ${this.getRoleDisplayName()}: Received STOP from Finish phone`);
                this.finishPhoto = message.payload.photo;
                this.splitTimes['finish'] = message.payload;
                this.showResult(message.payload.elapsed);
            }
        });
    }

    /**
     * Handle finish detection (Finish phone only)
     */
    onFinishDetected(detection) {
        console.log(`[App] onFinishDetected called - State: ${this.state}, isFinish: ${this.isFinish}, isPhone1: ${this.isPhone1}`);
        
        if (this.state !== 'RUNNING') {
            console.log(`[App] Finish Phone: Cannot detect - state is ${this.state}, expected RUNNING`);
            return;
        }
        
        if (!this.isFinish) {
            console.log(`[App] onFinishDetected called but this is not finish phone!`);
            return;
        }
        
        const finishTime = detection.timestamp;
        const elapsed = (finishTime - this.raceStartTime) / 1000; // Convert to seconds
        
        console.log(`[App] Finish Phone: STOP detected, elapsed time: ${elapsed.toFixed(2)}s`);
        
        this.state = 'FINISHED';
        this.detector.stopDetection();
        
        // Store finish photo
        this.finishPhoto = detection.frame;
        
        // Send STOP signal to all phones (with photo)
        this.connection.send({
            type: 'STOP',
            timestamp: this.timer.timestamp(),
            payload: {
                role: this.phoneRole,
                index: this.phoneIndex,
                elapsed: elapsed,
                frame: detection.frame,
                photo: detection.frame
            }
        });
        
        console.log('[App] Finish Phone: STOP signal sent to all phones with photo');
        
        // Show result
        this.showResult(elapsed);
    }

    /**
     * Start live timer (Phone 2 only)
     */
    startLiveTimer() {
        if (!this.raceStartTime) {
            console.error('[App] Cannot start live timer: raceStartTime not set');
            return;
        }
        
        const interval = setInterval(() => {
            if (this.state !== 'RUNNING') {
                clearInterval(interval);
                return;
            }
            
            const now = performance.now();
            const elapsed = (now - this.raceStartTime) / 1000;
            this.ui.updateLiveTimer(elapsed);
        }, 50); // Update every 50ms
    }

    /**
     * Show result
     */
    showResult(elapsed) {
        console.log('[App] showResult called with elapsed:', elapsed);
        console.log('[App] Current splitTimes:', JSON.stringify(this.splitTimes));
        console.log('[App] splitTimes keys:', Object.keys(this.splitTimes));
        
        this.ui.showScreen('result');
        
        const syncStatus = this.sync.getStatus();
        const formattedTime = elapsed.toFixed(2);
        const date = new Date().toLocaleString('tr-TR');
        
        this.ui.updateResultScreen(formattedTime, syncStatus.accuracy, date);
        
        // ALWAYS show split times (even for 2 phones, show 0-distance segment)
        this.displaySplitTimes(elapsed);
        
        // Show all photos (start, intermediate, finish)
        this.displayAllPhotos();
        
        // Store race data
        this.raceData = {
            time: elapsed,
            accuracy: syncStatus.accuracy,
            date: date,
            phone: this.phoneRole,
            phoneCount: this.phoneCount,
            distances: this.distances, // Add distances array
            startPhoto: this.startPhoto,
            finishPhoto: this.finishPhoto,
            splitTimes: this.splitTimes
        };
        
        // Increment race counter and check for ad
        const raceCount = this.raceCounter.increment();
        if (this.raceCounter.shouldShowAd()) {
            console.log(`[App] Showing ad after race #${raceCount}`);
            this.showAdPlaceholder();
        }
        
        // Setup handlers
        this.setupResultHandlers();
    }
    
    /**
     * Display split times
     */
    displaySplitTimes(totalTime) {
        const container = document.getElementById('split-times-container');
        const list = document.getElementById('split-times-list');
        
        container.style.display = 'block';
        
        // AGGRESSIVE CLEANUP - Remove all children
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        
        console.log('[App] Split times list cleaned, children count:', list.children.length);
        
        // Sort split times by index
        const splits = Object.values(this.splitTimes).sort((a, b) => a.index - b.index);
        
        // If no splits yet (shouldn't happen), just show total
        if (splits.length === 0) {
            const totalDistance = this.distances[this.distances.length - 1];
            const totalItem = document.createElement('div');
            totalItem.className = 'split-item total';
            totalItem.innerHTML = `
                <span class="split-label">TOPLAM (0m - ${totalDistance}m)</span>
                <span class="split-value">${totalTime.toFixed(2)}s</span>
            `;
            list.appendChild(totalItem);
            return;
        }
        
        let previousTime = 0;
        
        splits.forEach((split, idx) => {
            const segmentTime = idx === 0 ? split.elapsed : split.elapsed - previousTime;
            const distance = this.distances[split.index];
            const prevDistance = idx === 0 ? 0 : this.distances[splits[idx - 1].index];
            
            const item = document.createElement('div');
            item.className = 'split-item';
            item.innerHTML = `
                <span class="split-label">${prevDistance}m - ${distance}m</span>
                <span class="split-value">${segmentTime.toFixed(2)}s</span>
            `;
            list.appendChild(item);
            
            previousTime = split.elapsed;
        });
        
        // Add total
        const totalDistance = this.distances[this.distances.length - 1];
        const totalItem = document.createElement('div');
        totalItem.className = 'split-item total';
        totalItem.innerHTML = `
            <span class="split-label">TOPLAM (0m - ${totalDistance}m)</span>
            <span class="split-value">${totalTime.toFixed(2)}s</span>
        `;
        list.appendChild(totalItem);
    }
    
    /**
     * Display all photos (start, intermediate, finish)
     */
    displayAllPhotos() {
        const photosContainer = document.querySelector('.race-photos');
        
        // AGGRESSIVE CLEANUP - Remove all children
        while (photosContainer.firstChild) {
            photosContainer.removeChild(photosContainer.firstChild);
        }
        
        console.log('[App] displayAllPhotos - splitTimes:', this.splitTimes);
        console.log('[App] Photos container cleaned, children count:', photosContainer.children.length);
        
        // Collect all photos with their info
        const photos = [];
        
        // Start photo
        if (this.startPhoto) {
            photos.push({
                src: this.startPhoto,
                caption: '🏁 Başlangıç',
                distance: `${this.distances[0]}m`
            });
        }
        
        // Intermediate photos (from splitTimes)
        const splits = Object.values(this.splitTimes)
            .filter(s => s && s.role && !s.role.includes('start') && !s.role.includes('finish'))
            .sort((a, b) => a.index - b.index);
        
        console.log('[App] Intermediate splits:', splits);
        
        splits.forEach(split => {
            if (split.photo) {
                photos.push({
                    src: split.photo,
                    caption: `📍 ${split.index}. Telefon`,
                    distance: `${this.distances[split.index]}m`,
                    time: `${split.elapsed.toFixed(2)}s`
                });
            }
        });
        
        // Finish photo
        if (this.finishPhoto) {
            const finishSplit = this.splitTimes['finish'];
            photos.push({
                src: this.finishPhoto,
                caption: '🎯 Bitiş',
                distance: `${this.distances[this.distances.length - 1]}m`,
                time: finishSplit ? `${finishSplit.elapsed.toFixed(2)}s` : ''
            });
        }
        
        // Display all photos with click handlers
        photos.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${photo.src}" alt="${photo.caption}">
                <p class="photo-caption">${photo.caption} (${photo.distance})</p>
                ${photo.time ? `<p class="photo-time">${photo.time}</p>` : ''}
            `;
            
            // Add click handler to open modal
            photoItem.onclick = () => {
                this.showPhotoModal(photo.src, photo.caption);
            };
            
            photosContainer.appendChild(photoItem);
        });
        
        console.log(`[App] Displayed ${photos.length} photos`);
    }

    /**
     * Show photo modal
     */
    showPhotoModal(photoSrc, caption) {
        const modal = document.getElementById('photo-modal');
        const image = document.getElementById('photo-modal-image');
        const title = document.getElementById('photo-modal-title');
        const closeBtn = document.getElementById('photo-modal-close');
        
        image.src = photoSrc;
        title.textContent = caption;
        modal.classList.add('active');
        
        // Close handlers
        closeBtn.onclick = () => {
            modal.classList.remove('active');
        };
        
        const overlay = modal.querySelector('.modal-overlay');
        overlay.onclick = () => {
            modal.classList.remove('active');
        };
    }
    
    /**
     * Generate PDF from result screen (screenshot style)
     */
    async generatePDF() {
        try {
            // Check if html2canvas is loaded
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas kütüphanesi yüklenemedi');
            }
            
            this.ui.showToast('PDF oluşturuluyor...', 'info');
            
            // Get the result screen element
            const resultScreen = document.getElementById('result-screen');
            
            // Temporarily hide buttons we don't want in PDF
            const saveBtn = document.getElementById('save-result-btn');
            const pdfBtn = document.getElementById('download-pdf-btn');
            const finishControls = document.getElementById('finish-controls');
            const waitingMessage = document.getElementById('waiting-restart-message');
            
            const originalDisplay = {
                save: saveBtn.style.display,
                pdf: pdfBtn.style.display,
                finish: finishControls.style.display,
                waiting: waitingMessage.style.display
            };
            
            saveBtn.style.display = 'none';
            pdfBtn.style.display = 'none';
            finishControls.style.display = 'none';
            waitingMessage.style.display = 'none';
            
            // Capture screenshot
            const canvas = await html2canvas(resultScreen, {
                scale: 2, // Higher quality
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true
            });
            
            // Restore button visibility
            saveBtn.style.display = originalDisplay.save;
            pdfBtn.style.display = originalDisplay.pdf;
            finishControls.style.display = originalDisplay.finish;
            waitingMessage.style.display = originalDisplay.waiting;
            
            // Convert canvas to image
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // Create PDF
            const { jsPDF } = window.jspdf;
            
            // Calculate PDF dimensions (A4 portrait)
            const pdfWidth = 210; // A4 width in mm
            const pdfHeight = 297; // A4 height in mm
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            
            // Fit image to PDF page
            let finalWidth = pdfWidth - 20; // 10mm margin on each side
            let finalHeight = finalWidth / ratio;
            
            // If height exceeds page, scale down
            if (finalHeight > pdfHeight - 20) {
                finalHeight = pdfHeight - 20;
                finalWidth = finalHeight * ratio;
            }
            
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Center the image
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = 10;
            
            doc.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
            
            // Save PDF
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `sprint-sonuc-${timestamp}.pdf`;
            doc.save(filename);
            
            this.ui.showToast('PDF indirildi', 'success');
            
        } catch (error) {
            console.error('[App] PDF generation failed:', error);
            this.ui.showToast('PDF oluşturulamadı: ' + error.message, 'error');
        }
    }
    
    /**
     * Setup result screen handlers
     */
    setupResultHandlers() {
        const saveBtn = this.ui.getButton('saveResult');
        saveBtn.onclick = () => {
            const athleteName = document.getElementById('athlete-name').value;
            const notes = document.getElementById('race-notes').value;
            
            this.raceData.athleteName = athleteName;
            this.raceData.notes = notes;
            
            // Save to localStorage
            this.saveRaceData(this.raceData);
            
            this.ui.showToast('Sonuç kaydedildi!', 'success');
        };
        
        const downloadPdfBtn = document.getElementById('download-pdf-btn');
        downloadPdfBtn.onclick = () => {
            this.generatePDF();
        };
        
        // Show appropriate controls based on phone role
        if (this.isFinish) {
            // FINISH PHONE: Show restart and end session buttons
            document.getElementById('finish-controls').style.display = 'block';
            document.getElementById('waiting-restart-message').style.display = 'none';
            
            const restartBtn = document.getElementById('restart-race-btn');
            restartBtn.onclick = () => {
                console.log('[App] Restart button clicked');
                this.restartRace();
            };
            
            const endSessionBtn = document.getElementById('end-session-btn');
            endSessionBtn.onclick = () => {
                console.log('[App] End session button clicked');
                this.endSession();
            };
            
            console.log('[App] Finish phone controls setup complete');
            
        } else {
            // OTHER PHONES (including START): Show waiting message
            document.getElementById('finish-controls').style.display = 'none';
            document.getElementById('waiting-restart-message').style.display = 'block';
            
            // Setup RESTART and END_SESSION listeners (only once)
            if (!this._restartHandler) {
                this._restartHandler = (message) => {
                    if (message.type === 'RESTART') {
                        console.log(`[App] ${this.getRoleDisplayName()}: Received RESTART signal`);
                        this.handleRestart();
                    }
                };
                
                this._endSessionHandler = (message) => {
                    if (message.type === 'END_SESSION') {
                        console.log(`[App] ${this.getRoleDisplayName()}: Received END_SESSION signal`);
                        this.handleEndSession();
                    }
                };
                
                // Add listeners
                this.connection.on('message', this._restartHandler);
                this.connection.on('message', this._endSessionHandler);
                
                console.log(`[App] ${this.getRoleDisplayName()}: RESTART/END_SESSION listeners setup`);
            }
        }
    }
    
    /**
     * Restart race (Finish phone only)
     */
    restartRace() {
        console.log('[App] Finish Phone: Restarting race...');
        
        // Send RESTART signal to all phones via race-message
        this.connection.send({
            type: 'RESTART',
            timestamp: this.timer.timestamp(),
            payload: {}
        });
        
        console.log('[App] Finish Phone: RESTART signal sent');
        
        // Reset local state
        this.handleRestart();
    }
    
    /**
     * Handle restart (all phones)
     */
    handleRestart() {
        console.log(`[App] ${this.getRoleDisplayName()}: Handling restart...`);
        console.log('[App] Before restart - splitTimes:', JSON.stringify(this.splitTimes));
        
        // Reset race state
        this.raceStartTime = null;
        this.raceData = null;
        this.startPhoto = null;
        this.finishPhoto = null;
        this.splitTimes = {};
        this.readyPhones = new Set();
        this.state = 'IDLE';
        
        console.log('[App] After restart - splitTimes:', JSON.stringify(this.splitTimes));
        
        // Go back to idle screen (stay in room)
        this.goToIdleScreen();
        
        this.ui.showToast('Yeni koşu için hazır!', 'success');
    }
    
    /**
     * End session (Finish phone only)
     */
    endSession() {
        console.log('[App] Finish Phone: Ending session...');
        
        // Send END_SESSION signal to all phones via race-message
        this.connection.send({
            type: 'END_SESSION',
            timestamp: this.timer.timestamp(),
            payload: {}
        });
        
        console.log('[App] Finish Phone: END_SESSION signal sent');
        
        // Disconnect and reset
        this.handleEndSession();
    }
    
    /**
     * Handle end session (all phones)
     */
    handleEndSession() {
        console.log(`[App] ${this.getRoleDisplayName()}: Ending session...`);
        
        // Stop sync
        if (this.sync) {
            this.sync.stopContinuousSync();
        }
        
        // Stop detector and camera if running
        if (this.detector) {
            this.detector.stopDetection();
            this.detector.stopCamera();
            this.detector = null;
        }
        
        // Release wake lock
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
        
        // Clear ALL saved data including race results
        localStorage.clear(); // Tüm localStorage'ı temizle
        console.log('[App] All localStorage data cleared');
        
        // Disconnect
        this.connection.disconnect();
        
        // Reset state
        this.state = 'INIT';
        this.phoneRole = null;
        this.phoneIndex = null;
        this.isStart = false;
        this.isFinish = false;
        this.phoneCount = null;
        this.distances = [];
        this.roomCode = null;
        this.raceStartTime = null;
        this.raceData = null;
        this.startPhoto = null;
        this.finishPhoto = null;
        this.splitTimes = {};
        this.readyPhones = new Set();
        
        // Show selection screen
        this.showPhoneSelection();
        
        this.ui.showToast('Oturum sonlandırıldı - Tüm veriler temizlendi', 'info');
    }
    
    /**
     * Download all saved results as PDF
     */
    downloadResultsAsPDF() {
        const races = JSON.parse(localStorage.getItem('races') || '[]');
        
        if (races.length === 0) {
            this.ui.showToast('Kaydedilmiş sonuç bulunamadı', 'warning');
            return;
        }
        
        // Create table-based PDF content
        let pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sprint Kronometre Sonuçları</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 { 
            color: #1a73e8; 
            text-align: center; 
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #5f6368;
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        th {
            background: #1a73e8;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .time-cell {
            font-weight: bold;
            color: #34a853;
        }
        .date-cell {
            color: #5f6368;
            font-size: 0.9em;
        }
        .notes-cell {
            font-style: italic;
            color: #5f6368;
        }
        @media print {
            body { padding: 10px; }
            table { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <h1>🏃 Sprint Kronometre Sonuçları</h1>
    <p class="subtitle">Toplam ${races.length} koşu kaydı</p>
    
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Sporcu Adı</th>
                <th>Toplam Süre</th>
                <th>Mesafe</th>
                <th>Split Zamanları</th>
                <th>Hassasiyet</th>
                <th>Tarih</th>
                <th>Notlar</th>
            </tr>
        </thead>
        <tbody>
`;
        
        races.forEach((race, index) => {
            const date = new Date(race.timestamp).toLocaleString('tr-TR');
            
            // Get distances from race data
            const distances = race.distances || [0, 30, 60]; // Default if not saved
            const totalDistance = distances[distances.length - 1];
            
            // Build split times string with proper segment calculations
            let splitTimesStr = '';
            if (race.splitTimes && Object.keys(race.splitTimes).length > 0) {
                const splits = Object.values(race.splitTimes)
                    .filter(s => s && s.index !== undefined)
                    .sort((a, b) => a.index - b.index);
                
                let prevTime = 0;
                let prevDist = 0;
                
                splits.forEach((split) => {
                    const segmentTime = (split.elapsed - prevTime).toFixed(2);
                    const dist = distances[split.index];
                    splitTimesStr += `${prevDist}-${dist}m: ${segmentTime}s<br>`;
                    prevTime = split.elapsed;
                    prevDist = dist;
                });
                
                // Add total
                splitTimesStr += `<strong>0-${totalDistance}m: ${race.time.toFixed(2)}s</strong>`;
            } else {
                splitTimesStr = `0-${totalDistance}m: ${race.time.toFixed(2)}s`;
            }
            
            pdfContent += `
            <tr>
                <td>${index + 1}</td>
                <td>${race.athleteName || '-'}</td>
                <td class="time-cell">${race.time.toFixed(2)}s</td>
                <td>${totalDistance}m</td>
                <td>${splitTimesStr}</td>
                <td>${race.accuracy}</td>
                <td class="date-cell">${date}</td>
                <td class="notes-cell">${race.notes || '-'}</td>
            </tr>
`;
        });
        
        pdfContent += `
        </tbody>
    </table>
    
    <p style="text-align: center; color: #5f6368; margin-top: 30px; font-size: 0.9em;">
        Sprint Kronometre - Profesyonel Zamanlama Sistemi
    </p>
</body>
</html>
`;
        
        // Create blob and download
        const blob = new Blob([pdfContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sprint-sonuclari-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.ui.showToast('Sonuçlar tablo formatında indirildi!', 'success');
    }

    /**
     * Save race data to localStorage
     */
    saveRaceData(data) {
        const races = JSON.parse(localStorage.getItem('races') || '[]');
        races.push({
            ...data,
            id: Date.now(),
            timestamp: Date.now()
        });
        localStorage.setItem('races', JSON.stringify(races));
    }

    /**
     * Update sync display
     */
    updateSyncDisplay() {
        const status = this.sync.getStatus();
        this.ui.updateSyncStatus(
            status.accuracy,
            status.latency,
            'Az önce'
        );
    }

    /**
     * Start sync status updates
     */
    startSyncUpdates() {
        setInterval(() => {
            if (this.state === 'IDLE') {
                this.updateSyncDisplay();
            }
        }, 5000);
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Request wake lock to prevent screen from sleeping
     */
    async requestWakeLock() {
        try {
            // Check if running in Capacitor (native app)
            if (window.Capacitor !== undefined) {
                // Use Capacitor Keep Awake plugin
                const { KeepAwake } = window.Capacitor.Plugins;
                if (KeepAwake) {
                    await KeepAwake.keepAwake();
                    console.log('[App] Keep Awake activated (Capacitor)');
                    
                    // Show indicator
                    const indicator = document.createElement('div');
                    indicator.className = 'wake-lock-indicator';
                    indicator.textContent = '🔒 Ekran Aktif';
                    indicator.id = 'wake-lock-indicator';
                    document.body.appendChild(indicator);
                    
                    return;
                }
            }
            
            // Fallback to Web Wake Lock API
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('[App] Wake lock activated (Web)');
                
                // Show indicator
                const indicator = document.createElement('div');
                indicator.className = 'wake-lock-indicator';
                indicator.textContent = '🔒 Ekran Aktif';
                indicator.id = 'wake-lock-indicator';
                document.body.appendChild(indicator);
                
                // Re-request on visibility change
                document.addEventListener('visibilitychange', async () => {
                    if (this.wakeLock !== null && document.visibilityState === 'visible') {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                    }
                });
            }
        } catch (err) {
            console.warn('[App] Wake lock not supported or failed:', err);
        }
    }

    /**
     * Release wake lock
     */
    releaseWakeLock() {
        // Check if running in Capacitor (native app)
        if (window.Capacitor !== undefined) {
            const { KeepAwake } = window.Capacitor.Plugins;
            if (KeepAwake) {
                KeepAwake.allowSleep();
                console.log('[App] Keep Awake released (Capacitor)');
                
                const indicator = document.getElementById('wake-lock-indicator');
                if (indicator) {
                    indicator.remove();
                }
                return;
            }
        }
        
        // Fallback to Web Wake Lock API
        if (this.wakeLock !== null) {
            this.wakeLock.release();
            this.wakeLock = null;
            
            const indicator = document.getElementById('wake-lock-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
    }

    /**
     * Show ad placeholder (will be replaced with real AdMob later)
     */
    showAdPlaceholder() {
        // Create ad overlay
        const adOverlay = document.createElement('div');
        adOverlay.id = 'ad-overlay';
        adOverlay.className = 'ad-overlay';
        adOverlay.innerHTML = `
            <div class="ad-content">
                <div class="ad-header">
                    <h3>📢 Reklam</h3>
                    <p>Uygulamayı ücretsiz kullanmaya devam edin</p>
                </div>
                <div class="ad-placeholder">
                    <div class="ad-icon">📺</div>
                    <p>Reklam burada gösterilecek</p>
                    <p class="ad-note">(Mobil uygulamada AdMob reklamı gösterilecek)</p>
                </div>
                <button id="close-ad-btn" class="btn btn-primary btn-large">
                    Kapat (5)
                </button>
                <div class="ad-footer">
                    <p>Reklamları kaldırmak ister misiniz?</p>
                    <button id="go-premium-btn" class="btn btn-secondary">
                        ⭐ Premium'a Geç - ₺199
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(adOverlay);
        
        // Countdown timer for close button
        let countdown = 5;
        const closeBtn = document.getElementById('close-ad-btn');
        const countdownInterval = setInterval(() => {
            countdown--;
            closeBtn.textContent = `Kapat (${countdown})`;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                closeBtn.textContent = 'Kapat';
                closeBtn.disabled = false;
                closeBtn.onclick = () => {
                    adOverlay.remove();
                };
            }
        }, 1000);
        
        // Disable button initially
        closeBtn.disabled = true;
        
        // Premium button
        const premiumBtn = document.getElementById('go-premium-btn');
        premiumBtn.onclick = () => {
            adOverlay.remove();
            this.showPremiumPurchase();
        };
        
        console.log('[App] Ad placeholder shown');
    }

    /**
     * Show premium purchase dialog
     */
    showPremiumPurchase() {
        // Create premium modal
        const premiumModal = document.createElement('div');
        premiumModal.id = 'premium-modal';
        premiumModal.className = 'modal active';
        premiumModal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content premium-modal-content">
                <div class="modal-header">
                    <h3>⭐ Premium</h3>
                    <button id="premium-close-btn" class="btn btn-icon-only">✕</button>
                </div>
                <div class="modal-body">
                    <div class="premium-features">
                        <div class="premium-icon">🚀</div>
                        <h4>Ömür Boyu Reklamsız</h4>
                        <ul class="feature-list">
                            <li>✓ Hiç reklam görmeden kullanın</li>
                            <li>✓ Sınırsız koşu kaydı</li>
                            <li>✓ Tüm özellikler açık</li>
                            <li>✓ Tek seferlik ödeme</li>
                        </ul>
                        <div class="premium-price">
                            <span class="price-label">Sadece</span>
                            <span class="price-value">₺199</span>
                            <span class="price-note">Tek seferlik</span>
                        </div>
                    </div>
                    <div class="premium-note">
                        <p>💡 Mobil uygulamada Google Play üzerinden güvenli ödeme yapılacaktır.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="premium-purchase-btn" class="btn btn-success btn-large">
                        ⭐ Satın Al - ₺199
                    </button>
                    <button id="premium-cancel-btn" class="btn btn-secondary">
                        Belki Sonra
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(premiumModal);
        
        // Close button
        document.getElementById('premium-close-btn').onclick = () => {
            premiumModal.remove();
        };
        
        // Cancel button
        document.getElementById('premium-cancel-btn').onclick = () => {
            premiumModal.remove();
        };
        
        // Purchase button (demo mode - will be replaced with In-App Purchase)
        document.getElementById('premium-purchase-btn').onclick = () => {
            // In real app, this will trigger Google Play In-App Purchase
            // For now, just activate premium locally
            this.activatePremium();
            premiumModal.remove();
        };
        
        // Close on overlay click
        premiumModal.querySelector('.modal-overlay').onclick = () => {
            premiumModal.remove();
        };
    }

    /**
     * Activate premium (demo mode)
     */
    activatePremium() {
        this.raceCounter.setPremium();
        this.ui.showToast('🎉 Premium aktif! Artık reklamsız kullanabilirsiniz.', 'success');
        
        // Show premium badge in idle screen
        this.showPremiumBadge();
        
        console.log('[App] Premium activated!');
    }

    /**
     * Show premium badge in idle screen
     */
    showPremiumBadge() {
        const idleScreen = document.getElementById('idle-screen');
        const statusHeader = idleScreen.querySelector('.status-header');
        
        // Check if badge already exists
        if (document.getElementById('premium-badge')) {
            return;
        }
        
        const premiumBadge = document.createElement('div');
        premiumBadge.id = 'premium-badge';
        premiumBadge.className = 'status-badge premium';
        premiumBadge.innerHTML = `
            <span class="badge-icon">⭐</span>
            <span class="badge-text">Premium</span>
        `;
        
        statusHeader.appendChild(premiumBadge);
    }

    /**
     * Setup install prompt for PWA
     */
    setupInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[App] Install prompt available');
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button in idle screen
            this.showInstallButton(deferredPrompt);
        });
        
        // Check if already installed
        window.addEventListener('appinstalled', () => {
            console.log('[App] PWA installed successfully');
            this.ui.showToast('✅ Uygulama ana ekrana eklendi!', 'success');
            
            // Hide install button
            const installBtn = document.getElementById('install-app-btn');
            if (installBtn) {
                installBtn.remove();
            }
        });
    }

    /**
     * Show install button for PWA
     */
    showInstallButton(deferredPrompt) {
        const idleScreen = document.getElementById('idle-screen');
        const actionButtons = idleScreen.querySelector('.action-buttons');
        
        // Check if button already exists
        if (document.getElementById('install-app-btn')) {
            return;
        }
        
        const installBtn = document.createElement('button');
        installBtn.id = 'install-app-btn';
        installBtn.className = 'btn btn-primary';
        installBtn.innerHTML = `
            <span class="btn-icon">📱</span>
            <span class="btn-text">Ana Ekrana Ekle</span>
        `;
        
        installBtn.onclick = async () => {
            if (!deferredPrompt) {
                return;
            }
            
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            console.log('[App] Install prompt outcome:', outcome);
            
            if (outcome === 'accepted') {
                this.ui.showToast('✅ Uygulama yükleniyor...', 'success');
            }
            
            deferredPrompt = null;
            installBtn.remove();
        };
        
        // Add before settings button
        actionButtons.insertBefore(installBtn, actionButtons.firstChild);
    }

    /**
     * Show onboarding screens
     */
    showOnboarding() {
        console.log('[App] Showing onboarding...');
        
        // Create onboarding overlay
        const onboarding = document.createElement('div');
        onboarding.id = 'onboarding-overlay';
        onboarding.className = 'onboarding-overlay';
        onboarding.innerHTML = `
            <div class="onboarding-container">
                <!-- Slide 1: Welcome -->
                <div class="onboarding-slide active" data-slide="1">
                    <div class="slide-content">
                        <div class="slide-icon">⏱️</div>
                        <h2>Sprint Timer'a Hoş Geldiniz!</h2>
                        <p>Profesyonel koşu zamanı ölçüm sistemi</p>
                        <div class="slide-image">
                            <div class="demo-phones">
                                <div class="demo-phone">📱</div>
                                <div class="demo-arrow">→</div>
                                <div class="demo-runner">🏃</div>
                                <div class="demo-arrow">→</div>
                                <div class="demo-phone">📱</div>
                            </div>
                        </div>
                        <p class="slide-description">
                            İki telefon ile otomatik hareket algılama teknolojisi kullanarak 
                            milisaniye hassasiyetinde koşu zamanı ölçümü yapın.
                        </p>
                    </div>
                </div>

                <!-- Slide 2: How it works -->
                <div class="onboarding-slide" data-slide="2">
                    <div class="slide-content">
                        <div class="slide-icon">🎯</div>
                        <h2>Nasıl Çalışır?</h2>
                        <div class="steps-list">
                            <div class="step-item">
                                <div class="step-number">1</div>
                                <div class="step-text">
                                    <strong>Başlangıç Telefonu</strong>
                                    <p>Bir telefonu başlangıç çizgisine yerleştirin</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-number">2</div>
                                <div class="step-text">
                                    <strong>Bitiş Telefonu</strong>
                                    <p>Diğer telefonu bitiş çizgisine yerleştirin</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-number">3</div>
                                <div class="step-text">
                                    <strong>Eşleştirin</strong>
                                    <p>Telefonları oda kodu ile eşleştirin</p>
                                </div>
                            </div>
                            <div class="step-item">
                                <div class="step-number">4</div>
                                <div class="step-text">
                                    <strong>Hazırla & Koş!</strong>
                                    <p>Sporcu koşsun, otomatik ölçüm başlasın</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Slide 3: Features -->
                <div class="onboarding-slide" data-slide="3">
                    <div class="slide-content">
                        <div class="slide-icon">✨</div>
                        <h2>Özellikler</h2>
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">⚡</div>
                                <h4>Yüksek Hassasiyet</h4>
                                <p>±0.37ms hassasiyetle ölçüm</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📸</div>
                                <h4>Fotoğraflı Kayıt</h4>
                                <p>Başlangıç ve bitiş fotoğrafları</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📊</div>
                                <h4>Split Zamanları</h4>
                                <p>Ara nokta ölçümleri (3-5 telefon)</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📄</div>
                                <h4>PDF Rapor</h4>
                                <p>Sonuçları PDF olarak kaydedin</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🔄</div>
                                <h4>Otomatik Senkronizasyon</h4>
                                <p>Telefonlar otomatik senkronize</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🎤</div>
                                <h4>Sesli Geri Sayım</h4>
                                <p>5-4-3-2-1 sesli hazırlık</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Slide 4: Get Started -->
                <div class="onboarding-slide" data-slide="4">
                    <div class="slide-content">
                        <div class="slide-icon">🚀</div>
                        <h2>Hazır mısınız?</h2>
                        <p>Profesyonel koşu ölçümüne başlayın!</p>
                        <div class="ready-checklist">
                            <div class="checklist-item">
                                <span class="check-icon">✓</span>
                                <span>2 telefon hazır</span>
                            </div>
                            <div class="checklist-item">
                                <span class="check-icon">✓</span>
                                <span>İnternet bağlantısı var</span>
                            </div>
                            <div class="checklist-item">
                                <span class="check-icon">✓</span>
                                <span>Kamera izni verilecek</span>
                            </div>
                        </div>
                        <div class="premium-teaser">
                            <p class="teaser-text">💡 <strong>İpucu:</strong> Her 3 koşuda bir reklam gösterilir. 
                            Reklamsız kullanım için Premium'a geçebilirsiniz (₺199 tek seferlik).</p>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="onboarding-navigation">
                    <div class="dots-container">
                        <span class="dot active" data-dot="1"></span>
                        <span class="dot" data-dot="2"></span>
                        <span class="dot" data-dot="3"></span>
                        <span class="dot" data-dot="4"></span>
                    </div>
                    <div class="nav-buttons">
                        <button id="onboarding-skip" class="btn btn-secondary">Atla</button>
                        <button id="onboarding-next" class="btn btn-primary">İleri</button>
                        <button id="onboarding-start" class="btn btn-success" style="display: none;">Başlayalım!</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(onboarding);
        
        // Setup navigation
        let currentSlide = 1;
        const totalSlides = 4;
        
        const updateSlide = (slideNum) => {
            // Update slides
            document.querySelectorAll('.onboarding-slide').forEach(slide => {
                slide.classList.remove('active');
            });
            document.querySelector(`.onboarding-slide[data-slide="${slideNum}"]`).classList.add('active');
            
            // Update dots
            document.querySelectorAll('.dot').forEach(dot => {
                dot.classList.remove('active');
            });
            document.querySelector(`.dot[data-dot="${slideNum}"]`).classList.add('active');
            
            // Update buttons
            const nextBtn = document.getElementById('onboarding-next');
            const startBtn = document.getElementById('onboarding-start');
            
            if (slideNum === totalSlides) {
                nextBtn.style.display = 'none';
                startBtn.style.display = 'block';
            } else {
                nextBtn.style.display = 'block';
                startBtn.style.display = 'none';
            }
        };
        
        // Next button
        document.getElementById('onboarding-next').onclick = () => {
            if (currentSlide < totalSlides) {
                currentSlide++;
                updateSlide(currentSlide);
            }
        };
        
        // Skip button
        document.getElementById('onboarding-skip').onclick = () => {
            this.completeOnboarding();
            onboarding.remove();
            this.showPhoneSelection();
        };
        
        // Start button
        document.getElementById('onboarding-start').onclick = () => {
            this.completeOnboarding();
            onboarding.remove();
            this.showPhoneSelection();
        };
        
        // Dot navigation
        document.querySelectorAll('.dot').forEach(dot => {
            dot.onclick = () => {
                const slideNum = parseInt(dot.dataset.dot);
                currentSlide = slideNum;
                updateSlide(currentSlide);
            };
        });
        
        // Swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        onboarding.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        onboarding.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
        
        const handleSwipe = () => {
            if (touchEndX < touchStartX - 50 && currentSlide < totalSlides) {
                // Swipe left - next slide
                currentSlide++;
                updateSlide(currentSlide);
            }
            if (touchEndX > touchStartX + 50 && currentSlide > 1) {
                // Swipe right - previous slide
                currentSlide--;
                updateSlide(currentSlide);
            }
        };
    }

    /**
     * Complete onboarding
     */
    completeOnboarding() {
        localStorage.setItem('hasSeenOnboarding', 'true');
        this.hasSeenOnboarding = true;
        console.log('[App] Onboarding completed');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new SprintTimerApp();
    app.initialize();
    
    // Make app globally accessible for debugging
    window.app = app;
});
