/**
 * HIGH-PRECISION TIMER MODULE
 * Provides accurate timing with offset correction
 */

class HighPrecisionTimer {
    constructor() {
        this.offset = 0; // Time offset in milliseconds
        this.baseTime = performance.timeOrigin; // Unix epoch base
        this.driftRate = 0; // Clock drift per second
        this.lastSyncTime = 0;
    }

    /**
     * Get current time with offset correction (milliseconds)
     * @returns {number} Corrected time in milliseconds
     */
    now() {
        const rawTime = performance.now();
        
        // Apply drift correction if enough time has passed
        if (this.lastSyncTime > 0) {
            const timeSinceSync = rawTime - this.lastSyncTime;
            const driftCorrection = (timeSinceSync / 1000) * this.driftRate;
            return rawTime + this.offset + driftCorrection;
        }
        
        return rawTime + this.offset;
    }

    /**
     * Get absolute timestamp (Unix epoch in seconds)
     * @returns {number} Unix timestamp with millisecond precision
     */
    timestamp() {
        return (this.baseTime + this.now()) / 1000;
    }

    /**
     * Set time offset from synchronization
     * @param {number} offset - Offset in milliseconds
     */
    setOffset(offset) {
        this.offset = offset;
        this.lastSyncTime = performance.now();
        console.log(`[Timer] Offset set to ${offset.toFixed(2)}ms`);
    }

    /**
     * Set clock drift rate
     * @param {number} driftRate - Drift in milliseconds per second
     */
    setDriftRate(driftRate) {
        this.driftRate = driftRate;
        console.log(`[Timer] Drift rate set to ${driftRate.toFixed(4)}ms/s`);
    }

    /**
     * Get time since a reference point
     * @param {number} referenceTime - Reference time in milliseconds
     * @returns {number} Elapsed time in seconds
     */
    elapsed(referenceTime) {
        return (this.now() - referenceTime) / 1000;
    }

    /**
     * Format time for display
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time (e.g., "4.35")
     */
    static formatTime(seconds) {
        return seconds.toFixed(2);
    }
}

// Export for use in other modules
window.HighPrecisionTimer = HighPrecisionTimer;
