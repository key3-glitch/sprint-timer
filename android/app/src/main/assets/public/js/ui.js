/**
 * UI CONTROLLER MODULE
 * Manages screen transitions and UI updates
 */

class UIController {
    constructor() {
        this.currentScreen = 'splash-screen';
        this.screens = {};
        this.buttons = {};
        this.elements = {};
    }

    /**
     * Initialize UI
     */
    initialize() {
        // Cache screen elements
        this.screens = {
            splash: document.getElementById('splash-screen'),
            connection: document.getElementById('connection-screen'),
            idle: document.getElementById('idle-screen'),
            preparation: document.getElementById('preparation-screen'),
            ready: document.getElementById('ready-screen'),
            running: document.getElementById('running-screen'),
            result: document.getElementById('result-screen'),
            error: document.getElementById('error-screen')
        };

        // Cache button elements
        this.buttons = {
            prepare: document.getElementById('prepare-btn'),
            cancelPreparation: document.getElementById('cancel-preparation-btn'),
            cancelReady: document.getElementById('cancel-ready-btn'),
            saveResult: document.getElementById('save-result-btn'),
            shareResult: document.getElementById('share-result-btn'),
            newRace: document.getElementById('new-race-btn'),
            retry: document.getElementById('retry-btn'),
            back: document.getElementById('back-btn'),
            settings: document.getElementById('settings-btn'),
            history: document.getElementById('history-btn')
        };

        // Cache other elements
        this.elements = {
            connectionProgress: document.getElementById('connection-progress'),
            connectionStatus: document.getElementById('connection-status'),
            phoneRole: document.getElementById('phone-role'),
            connectionType: document.getElementById('connection-type'),
            syncAccuracy: document.getElementById('sync-accuracy'),
            latencyValue: document.getElementById('latency-value'),
            lastSync: document.getElementById('last-sync'),
            phonePosition: document.getElementById('phone-position'),
            phoneLocation: document.getElementById('phone-location'),
            countdownNumber: document.getElementById('countdown-number'),
            countdownCircle: document.getElementById('countdown-circle'),
            cameraStatus: document.getElementById('camera-status'),
            syncStatus: document.getElementById('sync-status'),
            precisionStatus: document.getElementById('precision-status'),
            lineLabel: document.getElementById('line-label'),
            liveTimer: document.getElementById('live-timer'),
            runningIcon: document.getElementById('running-icon'),
            runningTitle: document.getElementById('running-title'),
            runningSubtitle: document.getElementById('running-subtitle'),
            runningMessage: document.getElementById('running-message'),
            resultTime: document.getElementById('result-time'),
            resultAccuracy: document.getElementById('result-accuracy'),
            resultDate: document.getElementById('result-date'),
            athleteName: document.getElementById('athlete-name'),
            raceNotes: document.getElementById('race-notes'),
            errorMessage: document.getElementById('error-message'),
            toastContainer: document.getElementById('toast-container')
        };

        console.log('[UI] Initialized');
    }

    /**
     * Show screen
     */
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const screen = this.screens[screenName];
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenName;
            console.log(`[UI] Showing screen: ${screenName}`);
        } else {
            console.error(`[UI] Screen not found: ${screenName}`);
        }
    }

    /**
     * Update connection progress
     */
    updateConnectionProgress(percent, status) {
        if (this.elements.connectionProgress) {
            this.elements.connectionProgress.style.width = `${percent}%`;
        }
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = status;
        }
    }

    /**
     * Update connection info
     */
    updateConnectionInfo(phoneRole, connectionType) {
        if (this.elements.phoneRole) {
            this.elements.phoneRole.textContent = phoneRole;
        }
        if (this.elements.connectionType) {
            this.elements.connectionType.textContent = connectionType;
        }
    }

    /**
     * Update sync status
     */
    updateSyncStatus(accuracy, latency, lastSync) {
        if (this.elements.syncAccuracy) {
            this.elements.syncAccuracy.textContent = accuracy;
        }
        if (this.elements.latencyValue) {
            this.elements.latencyValue.textContent = `${latency.toFixed(1)}ms`;
        }
        if (this.elements.lastSync) {
            this.elements.lastSync.textContent = lastSync;
        }
    }

    /**
     * Update phone info
     */
    updatePhoneInfo(position, location) {
        if (this.elements.phonePosition) {
            this.elements.phonePosition.textContent = position;
        }
        if (this.elements.phoneLocation) {
            this.elements.phoneLocation.textContent = location;
        }
    }

    /**
     * Update countdown
     */
    updateCountdown(seconds) {
        if (this.elements.countdownNumber) {
            this.elements.countdownNumber.textContent = seconds;
        }
        if (this.elements.countdownCircle) {
            const circumference = 2 * Math.PI * 90;
            const offset = circumference * (1 - seconds / 10);
            this.elements.countdownCircle.style.strokeDashoffset = offset;
        }
    }

    /**
     * Update preparation status
     */
    updatePreparationStatus(camera, sync, precision) {
        if (this.elements.cameraStatus) {
            this.elements.cameraStatus.textContent = camera;
        }
        if (this.elements.syncStatus) {
            this.elements.syncStatus.textContent = sync;
        }
        if (this.elements.precisionStatus) {
            this.elements.precisionStatus.textContent = precision;
        }
    }

    /**
     * Update live timer
     */
    updateLiveTimer(seconds) {
        if (this.elements.liveTimer) {
            this.elements.liveTimer.textContent = seconds.toFixed(2);
        }
    }

    /**
     * Update running screen
     */
    updateRunningScreen(icon, title, subtitle, message) {
        if (this.elements.runningIcon) {
            this.elements.runningIcon.textContent = icon;
        }
        if (this.elements.runningTitle) {
            this.elements.runningTitle.textContent = title;
        }
        if (this.elements.runningSubtitle) {
            this.elements.runningSubtitle.textContent = subtitle;
        }
        if (this.elements.runningMessage) {
            this.elements.runningMessage.textContent = message;
        }
    }

    /**
     * Update result screen
     */
    updateResultScreen(time, accuracy, date) {
        if (this.elements.resultTime) {
            this.elements.resultTime.textContent = time;
        }
        if (this.elements.resultAccuracy) {
            this.elements.resultAccuracy.textContent = accuracy;
        }
        if (this.elements.resultDate) {
            this.elements.resultDate.textContent = date;
        }
    }

    /**
     * Show error
     */
    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        this.showScreen('error');
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                this.elements.toastContainer.removeChild(toast);
            }, 300);
        }, duration);
    }

    /**
     * Get button
     */
    getButton(name) {
        return this.buttons[name];
    }

    /**
     * Get element
     */
    getElement(name) {
        return this.elements[name];
    }
}

// Export
window.UIController = UIController;
