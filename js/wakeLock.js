/**
 * WAKE LOCK MODULE
 * Prevents screen from turning off during training sessions
 * Critical for maintaining camera and WebRTC connections
 */

class WakeLockManager {
    constructor() {
        this.wakeLock = null;
        this.isSupported = 'wakeLock' in navigator;
        this.isActive = false;
        this.wantsActive = false; // Flag to track if we want wake lock active
        
        console.log(`[WakeLock] API Support: ${this.isSupported ? 'YES ✓' : 'NO ✗'}`);
        
        // Listen for visibility changes to reacquire lock
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this.wantsActive) {
                console.log('[WakeLock] Page visible again, reacquiring lock...');
                await this.request();
            }
        });
        
        // Try to acquire lock on any user interaction
        const tryAcquire = async () => {
            if (this.wantsActive && !this.wakeLock) {
                await this.request();
            }
        };
        
        document.addEventListener('click', tryAcquire, { passive: true });
        document.addEventListener('touchstart', tryAcquire, { passive: true });
        document.addEventListener('keydown', tryAcquire, { passive: true });
    }

    /**
     * Request wake lock
     */
    async request() {
        if (!this.isSupported) {
            console.warn('[WakeLock] API not supported on this device');
            return false;
        }

        // Mark that we want wake lock active
        this.wantsActive = true;

        // Check if page is visible
        if (document.hidden) {
            console.warn('[WakeLock] Page is hidden, will retry when visible');
            return false;
        }

        // Already have an active lock
        if (this.wakeLock) {
            console.log('[WakeLock] Already active');
            return true;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            this.isActive = true;
            
            console.log('✅ [WakeLock] Screen lock acquired - Device will stay awake');

            // Listen for lock release
            this.wakeLock.addEventListener('release', () => {
                console.log('⚠️ [WakeLock] Lock released');
                this.wakeLock = null;
                this.isActive = false;
                
                // Try to reacquire if we still want it active
                if (this.wantsActive && !document.hidden) {
                    console.log('[WakeLock] Attempting to reacquire...');
                    setTimeout(() => this.request(), 100);
                }
            });

            return true;
        } catch (err) {
            console.error('❌ [WakeLock] Request failed:', err.name, err.message);
            this.isActive = false;
            
            // Retry after a delay if we still want it active
            if (this.wantsActive && !document.hidden) {
                console.log('[WakeLock] Will retry in 1 second...');
                setTimeout(() => this.request(), 1000);
            }
            
            return false;
        }
    }

    /**
     * Release wake lock
     */
    async release() {
        this.wantsActive = false; // Mark that we don't want wake lock anymore
        
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                this.isActive = false;
                console.log('✅ [WakeLock] Lock released successfully');
            } catch (err) {
                console.error('❌ [WakeLock] Release failed:', err);
            }
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            supported: this.isSupported,
            active: this.isActive && this.wakeLock !== null,
            wantsActive: this.wantsActive
        };
    }
}

// Export singleton instance
const wakeLockManager = new WakeLockManager();
