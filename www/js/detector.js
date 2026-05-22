/**
 * MOTION DETECTION MODULE
 * Frame difference algorithm for line crossing detection
 */

class MotionDetector {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { 
            willReadFrequently: true,
            alpha: false,
            desynchronized: true // Better performance on mobile
        });
        this.previousFrame = null;
        this.linePosition = 0.5; // Middle of frame (0-1)
        this.lineOrientation = 'vertical'; // 'vertical' or 'horizontal'
        this.threshold = 15; // Motion detection threshold (more sensitive for mobile)
        this.roiWidth = 80; // Region of interest width for vertical line (pixels) - wider for better detection
        this.roiHeight = 80; // Region of interest height for horizontal line (pixels) - wider for better detection
        this.isActive = false;
        this.detectionCallback = null;
        this.frameCount = 0;
        this.lastDetectionTime = 0;
        this.debounceTime = 200; // ms - reduced for faster detection
        this.capturedPhoto = null; // Store captured photo
        this.lastFrameTime = 0; // Track frame timing
    }

    /**
     * Initialize camera
     */
    async initializeCamera() {
        try {
            // Request Wake Lock to prevent screen from turning off
            if (typeof wakeLockManager !== 'undefined') {
                await wakeLockManager.request();
                console.log('[Detector] Wake Lock requested');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Back camera
                    frameRate: { ideal: 30, min: 20 },
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                }
            });
            
            this.video.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            console.log(`[Detector] Camera initialized: ${this.canvas.width}x${this.canvas.height}`);
            console.log(`[Detector] Video playing: ${!this.video.paused}, readyState: ${this.video.readyState}`);
            
            return true;
        } catch (error) {
            console.error('[Detector] Camera initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start motion detection
     */
    startDetection(callback) {
        this.isActive = true;
        this.detectionCallback = callback;
        this.previousFrame = null;
        this.frameCount = 0;
        console.log('[Detector] Detection started');
        
        this.processFrame();
    }

    /**
     * Stop motion detection
     */
    stopDetection() {
        this.isActive = false;
        this.detectionCallback = null;
        console.log('[Detector] Detection stopped');
    }

    /**
     * Process video frame
     */
    processFrame() {
        if (!this.isActive) return;
        
        this.frameCount++;
        const now = performance.now();
        
        // Check if video is actually playing
        if (this.video.paused || this.video.readyState < 2) {
            console.warn(`[Detector] Video not ready: paused=${this.video.paused}, readyState=${this.video.readyState}`);
            requestAnimationFrame(() => this.processFrame());
            return;
        }
        
        // Force canvas clear and redraw
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw current frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Debug: Check if frame data is changing
        if (this.frameCount === 30) {
            const samplePixel = currentFrame.data[0] + currentFrame.data[1] + currentFrame.data[2];
            console.log(`[Detector] Sample pixel value at frame 30: ${samplePixel}`);
        }
        
        // Track frame timing
        if (this.lastFrameTime > 0) {
            const frameTime = now - this.lastFrameTime;
            if (this.frameCount % 60 === 0) {
                console.log(`[Detector] Frame time: ${frameTime.toFixed(2)}ms (${(1000/frameTime).toFixed(1)} fps)`);
            }
        }
        this.lastFrameTime = now;
        
        // Skip first frame (need previous frame for comparison)
        if (this.previousFrame) {
            const motionDetected = this.detectMotion(currentFrame, this.previousFrame);
            
            if (motionDetected) {
                this.onMotionDetected();
            }
        }
        
        this.previousFrame = currentFrame;
        
        // Continue processing
        requestAnimationFrame(() => this.processFrame());
    }

    /**
     * Detect motion in region of interest (line area)
     */
    detectMotion(currentFrame, previousFrame) {
        let diffSum = 0;
        let pixelCount = 0;
        
        if (this.lineOrientation === 'vertical') {
            // Vertical line detection (left to right crossing)
            const lineX = Math.floor(this.canvas.width * this.linePosition);
            const roiLeft = Math.max(0, lineX - this.roiWidth / 2);
            const roiRight = Math.min(this.canvas.width, lineX + this.roiWidth / 2);
            
            // Calculate difference in ROI (vertical strip)
            for (let y = 0; y < this.canvas.height; y++) {
                for (let x = roiLeft; x < roiRight; x++) {
                    const i = (y * this.canvas.width + x) * 4;
                    
                    // Calculate grayscale difference
                    const currentGray = (currentFrame.data[i] + currentFrame.data[i + 1] + currentFrame.data[i + 2]) / 3;
                    const previousGray = (previousFrame.data[i] + previousFrame.data[i + 1] + previousFrame.data[i + 2]) / 3;
                    
                    const diff = Math.abs(currentGray - previousGray);
                    diffSum += diff;
                    pixelCount++;
                }
            }
        } else {
            // Horizontal line detection (top to bottom crossing)
            const lineY = Math.floor(this.canvas.height * this.linePosition);
            const roiTop = Math.max(0, lineY - this.roiHeight / 2);
            const roiBottom = Math.min(this.canvas.height, lineY + this.roiHeight / 2);
            
            // Calculate difference in ROI (horizontal strip)
            for (let y = roiTop; y < roiBottom; y++) {
                for (let x = 0; x < this.canvas.width; x++) {
                    const i = (y * this.canvas.width + x) * 4;
                    
                    // Calculate grayscale difference
                    const currentGray = (currentFrame.data[i] + currentFrame.data[i + 1] + currentFrame.data[i + 2]) / 3;
                    const previousGray = (previousFrame.data[i] + previousFrame.data[i + 1] + previousFrame.data[i + 2]) / 3;
                    
                    const diff = Math.abs(currentGray - previousGray);
                    diffSum += diff;
                    pixelCount++;
                }
            }
        }
        
        const avgDiff = diffSum / pixelCount;
        
        // Debug: log every 15 frames (more frequent for debugging)
        if (this.frameCount % 15 === 0) {
            console.log(`[Detector] Frame ${this.frameCount}, avgDiff: ${avgDiff.toFixed(2)}, threshold: ${this.threshold}`);
        }
        
        return avgDiff > this.threshold;
    }

    /**
     * Handle motion detection
     */
    onMotionDetected() {
        const now = performance.now();
        
        // Debounce: prevent multiple detections in short time
        if (now - this.lastDetectionTime < this.debounceTime) {
            return;
        }
        
        this.lastDetectionTime = now;
        console.log(`[Detector] Motion detected at frame ${this.frameCount}`);
        
        // Capture photo at moment of detection
        this.capturedPhoto = this.capturePhoto();
        
        // Notify callback
        if (this.detectionCallback) {
            this.detectionCallback({
                timestamp: now,
                frame: this.capturedPhoto,
                confidence: 0.9 // Placeholder
            });
        }
    }
    
    /**
     * Capture high-quality photo from current frame
     */
    capturePhoto() {
        // Create a temporary canvas for high-quality capture
        const photoCanvas = document.createElement('canvas');
        photoCanvas.width = this.video.videoWidth;
        photoCanvas.height = this.video.videoHeight;
        const photoCtx = photoCanvas.getContext('2d');
        
        // Draw current video frame
        photoCtx.drawImage(this.video, 0, 0, photoCanvas.width, photoCanvas.height);
        
        // Draw detection line overlay
        photoCtx.strokeStyle = '#00ff00';
        photoCtx.lineWidth = 4;
        photoCtx.setLineDash([10, 5]);
        
        if (this.lineOrientation === 'vertical') {
            const lineX = Math.floor(photoCanvas.width * this.linePosition);
            photoCtx.beginPath();
            photoCtx.moveTo(lineX, 0);
            photoCtx.lineTo(lineX, photoCanvas.height);
            photoCtx.stroke();
        } else {
            const lineY = Math.floor(photoCanvas.height * this.linePosition);
            photoCtx.beginPath();
            photoCtx.moveTo(0, lineY);
            photoCtx.lineTo(photoCanvas.width, lineY);
            photoCtx.stroke();
        }
        
        // Add timestamp
        photoCtx.font = 'bold 24px Arial';
        photoCtx.fillStyle = '#00ff00';
        photoCtx.strokeStyle = '#000000';
        photoCtx.lineWidth = 3;
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        photoCtx.strokeText(timestamp, 20, 40);
        photoCtx.fillText(timestamp, 20, 40);
        
        // Convert to data URL (JPEG for smaller size)
        return photoCanvas.toDataURL('image/jpeg', 0.85);
    }
    
    /**
     * Get captured photo
     */
    getCapturedPhoto() {
        return this.capturedPhoto;
    }

    /**
     * Set detection line position
     */
    setLinePosition(position) {
        this.linePosition = Math.max(0, Math.min(1, position));
        console.log(`[Detector] Line position set to ${(this.linePosition * 100).toFixed(0)}%`);
    }
    
    /**
     * Set line orientation
     */
    setLineOrientation(orientation) {
        this.lineOrientation = orientation; // 'vertical' or 'horizontal'
        console.log(`[Detector] Line orientation set to ${orientation}`);
    }

    /**
     * Set detection threshold
     */
    setThreshold(threshold) {
        this.threshold = threshold;
        console.log(`[Detector] Threshold set to ${threshold}`);
    }

    /**
     * Stop camera
     */
    stopCamera() {
        console.log('[Detector] Stopping camera...');
        
        if (this.video.srcObject) {
            // Stop all tracks
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log('[Detector] Track stopped:', track.kind);
            });
            
            // Clear video source
            this.video.srcObject = null;
            console.log('[Detector] Video source cleared');
        }
        
        // Release Wake Lock when camera stops
        if (typeof wakeLockManager !== 'undefined') {
            wakeLockManager.release();
            console.log('[Detector] Wake Lock released');
        }
        
        // Clear canvas
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Get camera status
     */
    getCameraStatus() {
        return {
            active: this.video.srcObject !== null,
            width: this.canvas.width,
            height: this.canvas.height,
            frameRate: 30 // Approximate
        };
    }
}

// Export
window.MotionDetector = MotionDetector;
