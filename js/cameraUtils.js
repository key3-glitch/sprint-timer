/**
 * CAMERA UTILITIES
 * Helper functions for camera management
 */

/**
 * Release all camera streams
 * Useful for cleaning up stuck camera streams
 */
async function releaseAllCameraStreams() {
    console.log('[CameraUtils] Releasing all camera streams...');
    
    try {
        // Get all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`[CameraUtils] Found ${videoDevices.length} video devices`);
        
        // Try to get and immediately stop stream for each device
        for (const device of videoDevices) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: device.deviceId }
                });
                
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log(`[CameraUtils] Released track from device: ${device.label}`);
                });
            } catch (err) {
                // Device might already be released or not accessible
                console.log(`[CameraUtils] Could not access device: ${device.label}`);
            }
        }
        
        console.log('[CameraUtils] ✅ All camera streams released');
        return true;
    } catch (error) {
        console.error('[CameraUtils] ❌ Failed to release streams:', error);
        return false;
    }
}

/**
 * Check if camera is available
 */
async function isCameraAvailable() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        return videoDevices.length > 0;
    } catch (error) {
        console.error('[CameraUtils] Failed to check camera availability:', error);
        return false;
    }
}

/**
 * Get camera info
 */
async function getCameraInfo() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        return videoDevices.map(device => ({
            id: device.deviceId,
            label: device.label || 'Unknown Camera',
            kind: device.kind
        }));
    } catch (error) {
        console.error('[CameraUtils] Failed to get camera info:', error);
        return [];
    }
}

// Export functions
window.cameraUtils = {
    releaseAllCameraStreams,
    isCameraAvailable,
    getCameraInfo
};

console.log('[CameraUtils] Loaded');
