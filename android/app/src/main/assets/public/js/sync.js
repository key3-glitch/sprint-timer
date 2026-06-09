/**
 * TIME SYNCHRONIZATION MODULE
 * NTP-like protocol for clock synchronization
 */

class TimeSyncManager {
    constructor(timer, connection) {
        this.timer = timer;
        this.connection = connection;
        this.measurements = [];
        this.currentOffset = 0;
        this.currentLatency = 0;
        this.syncQuality = 'unknown';
        this.isPhone1 = false; // Will be set during connection
        this.syncInterval = null;
    }

    /**
     * Initialize synchronization
     * @param {boolean} isPhone1 - True if this is Phone 1 (start line)
     */
    async initialize(isPhone1) {
        this.isPhone1 = isPhone1;
        console.log(`[Sync] Initializing as ${isPhone1 ? 'Start' : 'Finish'} Phone`);
        
        // Phase 1: Quick sync
        await this.quickSync();
        
        // Phase 2: Precise sync (background)
        this.preciseSync();
        
        // Phase 3: Continuous sync
        this.startContinuousSync();
    }

    /**
     * Phase 1: Quick synchronization (3 measurements)
     */
    async quickSync() {
        console.log('[Sync] Starting quick sync...');
        const measurements = [];
        
        for (let i = 0; i < 3; i++) {
            const measurement = await this.performSyncMeasurement();
            if (measurement) {
                measurements.push(measurement);
            }
            await this.sleep(100); // 100ms between measurements
        }
        
        if (measurements.length > 0) {
            // Use best RTT measurement
            measurements.sort((a, b) => a.rtt - b.rtt);
            const best = measurements[0];
            this.applySync(best);
            console.log(`[Sync] Quick sync complete: ±${best.rtt.toFixed(1)}ms`);
        }
    }

    /**
     * Phase 2: Precise synchronization (10 measurements)
     */
    async preciseSync() {
        console.log('[Sync] Starting precise sync...');
        const measurements = [];
        
        for (let i = 0; i < 10; i++) {
            const measurement = await this.performSyncMeasurement();
            if (measurement) {
                measurements.push(measurement);
            }
            await this.sleep(200); // 200ms between measurements
        }
        
        if (measurements.length >= 3) {
            // Use best 3 measurements
            measurements.sort((a, b) => a.rtt - b.rtt);
            const best3 = measurements.slice(0, 3);
            const avgOffset = best3.reduce((sum, m) => sum + m.offset, 0) / 3;
            const avgRtt = best3.reduce((sum, m) => sum + m.rtt, 0) / 3;
            
            this.timer.setOffset(avgOffset);
            this.currentOffset = avgOffset;
            this.currentLatency = avgRtt / 2;
            this.updateSyncQuality(avgRtt);
            
            console.log(`[Sync] Precise sync complete: offset=${avgOffset.toFixed(2)}ms, latency=${this.currentLatency.toFixed(2)}ms`);
        }
    }

    /**
     * Phase 3: Preparation synchronization (20 measurements)
     * Called when referee presses PREPARE button
     */
    async preparationSync() {
        console.log('[Sync] Starting preparation sync (high precision)...');
        const measurements = [];
        
        for (let i = 0; i < 20; i++) {
            const measurement = await this.performSyncMeasurement();
            if (measurement) {
                measurements.push(measurement);
            }
            await this.sleep(150); // 150ms between measurements
        }
        
        if (measurements.length >= 5) {
            // Remove outliers (keep middle 60%)
            measurements.sort((a, b) => a.rtt - b.rtt);
            const removeCount = Math.floor(measurements.length * 0.2);
            const filtered = measurements.slice(removeCount, measurements.length - removeCount);
            
            // Calculate average
            const avgOffset = filtered.reduce((sum, m) => sum + m.offset, 0) / filtered.length;
            const avgRtt = filtered.reduce((sum, m) => sum + m.rtt, 0) / filtered.length;
            
            this.timer.setOffset(avgOffset);
            this.currentOffset = avgOffset;
            this.currentLatency = avgRtt / 2;
            this.updateSyncQuality(avgRtt);
            
            console.log(`[Sync] Preparation sync complete: offset=${avgOffset.toFixed(2)}ms, latency=${this.currentLatency.toFixed(2)}ms`);
            return { offset: avgOffset, latency: this.currentLatency, quality: this.syncQuality };
        }
        
        return null;
    }

    /**
     * Perform a single sync measurement (NTP-like)
     */
    async performSyncMeasurement() {
        return new Promise((resolve) => {
            const t1 = this.timer.now(); // Client send time
            
            // Send SYNC request
            this.connection.send({
                type: 'SYNC',
                timestamp: t1,
                payload: {}
            });
            
            // Wait for PONG response
            const timeout = setTimeout(() => {
                resolve(null); // Timeout
            }, 2000);
            
            const handler = (message) => {
                if (message.type === 'PONG') {
                    clearTimeout(timeout);
                    this.connection.off('message', handler);
                    
                    const t4 = this.timer.now(); // Client receive time
                    const t2 = message.payload.serverReceiveTime; // Server receive time
                    const t3 = message.payload.serverSendTime; // Server send time
                    const rtt = t4 - t1; // Round trip time
                    
                    // Calculate offset using NTP algorithm
                    // offset = ((t2 - t1) + (t3 - t4)) / 2
                    // This accounts for network delay in both directions
                    const offset = ((t2 - t1) + (t3 - t4)) / 2;
                    
                    console.log(`[Sync] Measurement: t1=${t1.toFixed(2)}, t2=${t2.toFixed(2)}, t3=${t3.toFixed(2)}, t4=${t4.toFixed(2)}, offset=${offset.toFixed(2)}ms, rtt=${rtt.toFixed(2)}ms`);
                    
                    resolve({ t1, t2, t3, t4, rtt, offset, quality: 1 / rtt });
                }
            };
            
            this.connection.on('message', handler);
        });
    }

    /**
     * Apply sync measurement
     */
    applySync(measurement) {
        this.timer.setOffset(measurement.offset);
        this.currentOffset = measurement.offset;
        this.currentLatency = measurement.rtt / 2;
        this.updateSyncQuality(measurement.rtt);
        this.measurements.push(measurement);
    }

    /**
     * Update sync quality based on RTT
     */
    updateSyncQuality(rtt) {
        if (rtt < 10) {
            this.syncQuality = 'excellent';
        } else if (rtt < 20) {
            this.syncQuality = 'good';
        } else if (rtt < 50) {
            this.syncQuality = 'fair';
        } else {
            this.syncQuality = 'poor';
        }
    }

    /**
     * Start continuous background sync
     */
    startContinuousSync() {
        // Sync every 5 seconds
        this.syncInterval = setInterval(async () => {
            const measurement = await this.performSyncMeasurement();
            if (measurement) {
                // Smooth update (weighted average)
                const weight = 0.3;
                this.currentOffset = this.currentOffset * (1 - weight) + measurement.offset * weight;
                this.timer.setOffset(this.currentOffset);
                this.currentLatency = measurement.rtt / 2;
                this.updateSyncQuality(measurement.rtt);
            }
        }, 5000);
    }

    /**
     * Stop continuous sync
     */
    stopContinuousSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Get current sync status
     */
    getStatus() {
        return {
            offset: this.currentOffset,
            latency: this.currentLatency,
            quality: this.syncQuality,
            accuracy: `±${Math.ceil(this.currentLatency)}ms`
        };
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export
window.TimeSyncManager = TimeSyncManager;
