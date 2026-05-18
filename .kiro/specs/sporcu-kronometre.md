# Sporcu Kronometre - Technical Design Spec

**Project:** Dual-Phone Automatic Sprint Timer  
**Version:** 1.0  
**Date:** May 17, 2026  
**Status:** Design Phase

---

## 🎯 Project Vision

Create a professional sprint timing system using two smartphones with automatic motion detection. The system synchronizes two phones, detects when an athlete crosses the start line (Phone 1) and finish line (Phone 2), and calculates precise sprint times for 30-meter races.

### Core Philosophy
- **Professional Grade:** ±10ms accuracy (meets athletics federation standards)
- **Fully Automatic:** No manual start/stop - motion detection only
- **User Controlled:** Referee initiates preparation, system handles timing
- **Reliable:** Hybrid sync system with fallback mechanisms
- **Simple UX:** One button to prepare, automatic timing

---

## 🏗️ High-Level Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│              SPORCU KRONOMETRE SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📱 PHONE 1 (Start Line - 0m)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Camera Module                                        │   │
│  │  ├─ Video Stream (30fps)                             │   │
│  │  ├─ Motion Detection (TensorFlow.js)                 │   │
│  │  └─ Line Cross Detection                             │   │
│  │                                                        │   │
│  │  Timing Module                                        │   │
│  │  ├─ High-precision Timer (performance.now)           │   │
│  │  ├─ Time Sync Manager                                │   │
│  │  └─ START Signal Generator                           │   │
│  │                                                        │   │
│  │  Communication Module                                 │   │
│  │  ├─ WebRTC Data Channel (primary)                    │   │
│  │  ├─ WebSocket (fallback)                             │   │
│  │  └─ Sync Protocol Handler                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  📱 PHONE 2 (Finish Line - 30m)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Camera Module                                        │   │
│  │  ├─ Video Stream (30fps)                             │   │
│  │  ├─ Motion Detection (TensorFlow.js)                 │   │
│  │  └─ Line Cross Detection                             │   │
│  │                                                        │   │
│  │  Timing Module                                        │   │
│  │  ├─ High-precision Timer (performance.now)           │   │
│  │  ├─ Time Sync Manager                                │   │
│  │  ├─ START Signal Receiver                            │   │
│  │  └─ STOP Signal Generator                            │   │
│  │                                                        │   │
│  │  Results Module                                       │   │
│  │  ├─ Time Calculator                                   │   │
│  │  ├─ Result Display                                    │   │
│  │  └─ Data Storage (IndexedDB)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ☁️ SIGNALING SERVER (Optional)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WebRTC Signaling                                     │   │
│  │  ├─ Peer Connection Setup                            │   │
│  │  ├─ ICE Candidate Exchange                           │   │
│  │  └─ Connection Management                            │   │
│  │                                                        │   │
│  │  Time Server (NTP-like)                               │   │
│  │  ├─ Reference Time Source                            │   │
│  │  ├─ Sync Request Handler                             │   │
│  │  └─ Latency Measurement                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Frontend** | PWA (HTML5, CSS3, JavaScript) | Cross-platform, camera access, fast development |
| **Motion Detection** | TensorFlow.js + MediaPipe | Browser-based AI, real-time pose detection |
| **Video Processing** | WebRTC MediaStream API | Low-latency camera access |
| **Communication** | WebRTC Data Channel + WebSocket | P2P with fallback |
| **Time Sync** | Custom NTP-like Protocol | ±5-10ms accuracy |
| **Storage** | IndexedDB | Local race history |
| **Backend** | Node.js + Express + Socket.io | Signaling and time server |

---

## ⏱️ Time Synchronization System

### Hybrid Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           TIME SYNCHRONIZATION PROTOCOL                      │
└─────────────────────────────────────────────────────────────┘

PHASE 1: INITIAL CONNECTION (1-2 seconds)
├─ WebRTC peer connection established
├─ WebSocket fallback if WebRTC fails
└─ Connection latency measured

PHASE 2: QUICK SYNC (0.5 seconds)
├─ 3 rapid ping-pong measurements
├─ Best RTT selected
├─ Initial offset calculated: ±50ms
└─ System ready for use

PHASE 3: PRECISE SYNC (2 seconds, background)
├─ 10 detailed measurements
├─ Statistical analysis (best 3 averaged)
├─ Refined offset: ±10ms
└─ Continuous monitoring

PHASE 4: PREPARATION SYNC (10 seconds)
├─ Referee presses "PREPARE" button
├─ 20 high-precision measurements
├─ Outlier rejection
├─ Final offset: ±5ms
└─ System locked and ready

PHASE 5: CONTINUOUS SYNC (during race)
├─ Ping-pong every 5 seconds
├─ Drift detection and correction
└─ Maintains ±5-10ms accuracy
```

### NTP-like Protocol

```javascript
┌─────────────────────────────────────────────────────────────┐
│              NETWORK TIME PROTOCOL (NTP-LIKE)                │
└─────────────────────────────────────────────────────────────┘

📱 PHONE 1 (Client)
├─ t1: Send SYNC request (local time)
│
☁️ SERVER
├─ t2: Receive SYNC (server time)
├─ t3: Send SYNC response (server time)
│
📱 PHONE 1
├─ t4: Receive SYNC response (local time)
│
CALCULATIONS:
├─ Round Trip Time (RTT) = (t4 - t1)
├─ One-way latency = RTT / 2
├─ Server time at midpoint = t2 + (t3 - t2) / 2
├─ Local time at midpoint = t1 + RTT / 2
├─ Offset = server_time - local_time
│
RESULT:
└─ Phone 1 offset: +0.442s (phone is 442ms ahead)

📱 PHONE 2 (Client)
├─ Same process
└─ Phone 2 offset: -0.234s (phone is 234ms behind)

🏃 DURING RACE:
├─ Phone 1 detects start: local_time = 18:47:38.567
├─ Corrected time: 38.567 - 0.442 = 38.125
├─ Send to Phone 2: START = 38.125
│
├─ Phone 2 detects finish: local_time = 18:47:42.891
├─ Corrected time: 42.891 + 0.234 = 43.125
├─ Calculate: 43.125 - 38.125 = 5.000s
│
└─ Result: 5.00 seconds ✅
```

---

## 📹 Motion Detection System

### Computer Vision Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│              MOTION DETECTION PIPELINE                       │
└─────────────────────────────────────────────────────────────┘

1. VIDEO CAPTURE
   ├─ Camera: 30fps (minimum)
   ├─ Resolution: 640x480 (optimized for speed)
   ├─ Format: RGB
   └─ Latency: ~33ms per frame

2. PREPROCESSING
   ├─ Grayscale conversion
   ├─ Gaussian blur (noise reduction)
   ├─ Region of Interest (ROI) selection
   └─ Latency: ~5ms

3. MOTION DETECTION (Option A: Frame Difference)
   ├─ Compare current frame with previous
   ├─ Threshold: significant change
   ├─ Detect crossing line
   └─ Latency: ~10ms

4. MOTION DETECTION (Option B: Pose Detection)
   ├─ TensorFlow.js PoseNet/MoveNet
   ├─ Detect human keypoints
   ├─ Track body position
   ├─ Detect line crossing
   └─ Latency: ~50ms (GPU) / ~200ms (CPU)

5. VALIDATION
   ├─ Confirm motion direction (forward)
   ├─ Confirm speed (running, not walking)
   ├─ Debounce (prevent double trigger)
   └─ Latency: ~5ms

6. TRIGGER
   ├─ Generate timestamp (performance.now)
   ├─ Send signal (START or STOP)
   └─ Latency: ~2ms

TOTAL LATENCY: 55-255ms (depending on method)
```

### Detection Algorithms

#### **Method 1: Frame Difference (Fast, Simple)**

```javascript
class FrameDifferenceDetector {
    constructor(canvas, threshold = 30) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.threshold = threshold;
        this.previousFrame = null;
        this.linePosition = 0.5; // Middle of frame
    }
    
    detectMotion(videoFrame) {
        // Draw current frame
        this.ctx.drawImage(videoFrame, 0, 0);
        const currentFrame = this.ctx.getImageData(0, 0, 
            this.canvas.width, this.canvas.height);
        
        if (!this.previousFrame) {
            this.previousFrame = currentFrame;
            return false;
        }
        
        // Calculate difference in ROI (line area)
        const lineY = this.canvas.height * this.linePosition;
        const roiHeight = 50; // pixels
        
        let diffSum = 0;
        let pixelCount = 0;
        
        for (let y = lineY - roiHeight/2; y < lineY + roiHeight/2; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const i = (y * this.canvas.width + x) * 4;
                
                const diff = Math.abs(
                    currentFrame.data[i] - this.previousFrame.data[i]
                );
                
                diffSum += diff;
                pixelCount++;
            }
        }
        
        const avgDiff = diffSum / pixelCount;
        this.previousFrame = currentFrame;
        
        // Motion detected if average difference exceeds threshold
        return avgDiff > this.threshold;
    }
}
```

#### **Method 2: Pose Detection (Accurate, Slower)**

```javascript
class PoseDetectionTimer {
    constructor() {
        this.detector = null;
        this.linePosition = 0.5; // Middle of frame
        this.previousPosition = null;
    }
    
    async initialize() {
        // Load MoveNet model (lightweight, fast)
        this.detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
            }
        );
    }
    
    async detectLineCrossing(videoFrame) {
        // Detect pose
        const poses = await this.detector.estimatePoses(videoFrame);
        
        if (poses.length === 0) return false;
        
        const pose = poses[0];
        
        // Get center of mass (average of hip keypoints)
        const leftHip = pose.keypoints.find(k => k.name === 'left_hip');
        const rightHip = pose.keypoints.find(k => k.name === 'right_hip');
        
        if (!leftHip || !rightHip) return false;
        
        const centerX = (leftHip.x + rightHip.x) / 2;
        const normalizedX = centerX / videoFrame.width;
        
        // Check if crossed line
        if (this.previousPosition !== null) {
            const crossed = 
                this.previousPosition < this.linePosition &&
                normalizedX >= this.linePosition;
            
            this.previousPosition = normalizedX;
            return crossed;
        }
        
        this.previousPosition = normalizedX;
        return false;
    }
}
```

---

## 🔄 Communication Protocol

### WebRTC Data Channel (Primary)

```javascript
┌─────────────────────────────────────────────────────────────┐
│              WEBRTC COMMUNICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

SETUP PHASE:
1. Phone 1 creates offer
2. Phone 1 sends offer to signaling server
3. Phone 2 receives offer from signaling server
4. Phone 2 creates answer
5. Phone 2 sends answer to signaling server
6. Phone 1 receives answer
7. ICE candidates exchanged
8. Direct P2P connection established

DATA CHANNEL:
├─ Low latency: 5-20ms
├─ Reliable: ordered delivery
├─ Binary or text messages
└─ No server overhead after setup

MESSAGE TYPES:
├─ SYNC: Time synchronization
├─ PONG: Sync response
├─ PREPARE: Start preparation phase
├─ READY: System ready
├─ START: Race started
├─ STOP: Race finished
└─ RESULT: Final time
```

### Message Format

```javascript
// Message structure
{
    type: 'START' | 'STOP' | 'SYNC' | 'PONG' | 'PREPARE' | 'READY' | 'RESULT',
    timestamp: number,        // High-precision timestamp
    payload: {
        // Type-specific data
    },
    sequence: number,         // Message sequence number
    checksum: string          // Data integrity check
}

// Example: START message
{
    type: 'START',
    timestamp: 1715875238.567,
    payload: {
        athleteName: 'Ben Eppler',
        raceId: 'race-001',
        phone: 'PHONE_1'
    },
    sequence: 42,
    checksum: 'a3f5c9...'
}

// Example: STOP message
{
    type: 'STOP',
    timestamp: 1715875242.917,
    payload: {
        athleteName: 'Ben Eppler',
        raceId: 'race-001',
        phone: 'PHONE_2',
        elapsed: 4.350
    },
    sequence: 43,
    checksum: 'b7d2e1...'
}
```

---

## 💾 Data Models

### Race Record

```javascript
RaceRecord {
    id: string,                    // Unique race ID
    timestamp: number,             // Race start time (server time)
    
    // Athlete Info
    athlete: {
        name: string,
        number: string,
        category: string           // e.g., "U18 Male"
    },
    
    // Timing Data
    timing: {
        startTime: number,         // Phone 1 timestamp
        stopTime: number,          // Phone 2 timestamp
        elapsed: number,           // Calculated time (seconds)
        accuracy: number           // Estimated accuracy (±ms)
    },
    
    // Sync Data
    sync: {
        phone1Offset: number,      // Phone 1 time offset
        phone2Offset: number,      // Phone 2 time offset
        latency: number,           // Communication latency
        syncQuality: string        // 'excellent', 'good', 'fair'
    },
    
    // Detection Data
    detection: {
        startMethod: string,       // 'frame_diff' or 'pose'
        stopMethod: string,
        startConfidence: number,   // 0-1
        stopConfidence: number,
        startFrameUrl: string,     // Base64 image
        stopFrameUrl: string
    },
    
    // Metadata
    metadata: {
        distance: number,          // meters (default: 30)
        location: string,
        weather: string,
        surface: string,           // 'track', 'grass', etc.
        notes: string
    }
}
```

### Sync Session

```javascript
SyncSession {
    id: string,
    createdAt: number,
    
    // Connection Info
    connection: {
        type: 'webrtc' | 'websocket',
        established: boolean,
        latency: number,
        quality: string
    },
    
    // Sync Measurements
    measurements: [
        {
            timestamp: number,
            rtt: number,              // Round trip time
            offset: number,           // Calculated offset
            quality: number           // 0-1 score
        }
    ],
    
    // Current State
    state: {
        offset: number,               // Current best offset
        latency: number,              // Current latency
        lastSync: number,             // Last sync timestamp
        driftRate: number             // Clock drift per second
    }
}
```

---

## 🎨 User Interface Design

### Screen Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SCREEN FLOW                               │
└─────────────────────────────────────────────────────────────┘

1. SPLASH SCREEN (1s)
   └─> 2. CONNECTION SCREEN

2. CONNECTION SCREEN (2-3s)
   ├─ "Connecting to other phone..."
   ├─ Progress indicator
   └─> 3. IDLE SCREEN

3. IDLE SCREEN
   ├─ Connection status: ✅
   ├─ Sync quality: ±10ms
   ├─ [PREPARE] button
   └─> 4. PREPARATION SCREEN (on button press)

4. PREPARATION SCREEN (10s)
   ├─ "Preparing..."
   ├─ Countdown: 10... 9... 8...
   ├─ Sync progress
   ├─ Camera preview
   └─> 5. READY SCREEN

5. READY SCREEN
   ├─ "READY! 🟢"
   ├─ Camera view with line overlay
   ├─ "Waiting for athlete..."
   ├─ [CANCEL] button
   └─> 6. RUNNING SCREEN (auto, on motion)

6. RUNNING SCREEN (Phone 1)
   ├─ "START! ✅"
   ├─ "Signal sent"
   ├─ "Waiting for finish..."
   └─> 7. RESULT SCREEN (when finish received)

6. RUNNING SCREEN (Phone 2)
   ├─ "Running... ⏱️"
   ├─ Live timer
   ├─ "Waiting for athlete..."
   └─> 7. RESULT SCREEN (auto, on motion)

7. RESULT SCREEN
   ├─ "FINISHED! 🏁"
   ├─ Time: 4.35s
   ├─ Athlete name
   ├─ [SAVE] [NEW RACE] [SHARE]
   └─> 3. IDLE SCREEN (on NEW RACE)
```

---

## 📋 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal:** Basic connection and sync working

```
Tasks:
├─ [ ] Set up PWA project structure
├─ [ ] Implement WebRTC signaling server
├─ [ ] Create WebRTC peer connection
├─ [ ] Implement WebSocket fallback
├─ [ ] Build time sync protocol (NTP-like)
├─ [ ] Test sync accuracy (target: ±50ms)
└─ [ ] Create basic UI (connection screen)
```

### Phase 2: Motion Detection (Week 2)

**Goal:** Automatic start/stop detection

```
Tasks:
├─ [ ] Implement camera access (MediaStream API)
├─ [ ] Build frame difference detector
├─ [ ] Integrate TensorFlow.js
├─ [ ] Implement pose detection (MoveNet)
├─ [ ] Create line crossing algorithm
├─ [ ] Test detection accuracy
├─ [ ] Add visual line overlay
└─ [ ] Optimize for mobile performance
```

### Phase 3: Timing System (Week 3)

**Goal:** Accurate race timing

```
Tasks:
├─ [ ] Implement high-precision timer
├─ [ ] Build START/STOP signal handlers
├─ [ ] Create time calculation logic
├─ [ ] Add latency compensation
├─ [ ] Implement result display
├─ [ ] Test end-to-end timing (target: ±10ms)
└─ [ ] Add race data storage (IndexedDB)
```

### Phase 4: User Experience (Week 4)

**Goal:** Polished, professional UI

```
Tasks:
├─ [ ] Design all screens (Figma)
├─ [ ] Implement preparation flow
├─ [ ] Add countdown timer
├─ [ ] Create camera preview with overlay
├─ [ ] Build result screen with stats
├─ [ ] Add athlete name input
├─ [ ] Implement race history
└─ [ ] Add export/share functionality
```

### Phase 5: Testing & Optimization (Week 5)

**Goal:** Production-ready system

```
Tasks:
├─ [ ] Field testing (real track)
├─ [ ] Accuracy validation (vs professional timer)
├─ [ ] Performance optimization
├─ [ ] Battery optimization
├─ [ ] Error handling
├─ [ ] Offline mode
├─ [ ] Documentation
└─ [ ] User manual
```

---

## 🎯 Success Metrics

### Technical Metrics

- **Timing Accuracy:** ±10ms (target), ±20ms (acceptable)
- **Sync Time:** < 3 seconds (initial), < 10 seconds (precise)
- **Detection Latency:** < 100ms (frame diff), < 200ms (pose)
- **Connection Success Rate:** > 95%
- **Battery Life:** > 2 hours continuous use

### User Experience Metrics

- **Setup Time:** < 30 seconds (first use), < 10 seconds (subsequent)
- **False Positives:** < 1% (incorrect start/stop detection)
- **User Satisfaction:** > 4.5/5 stars
- **Ease of Use:** Single button operation

---

## 🔧 Low-Level Implementation Details

### High-Precision Timer

```javascript
class HighPrecisionTimer {
    constructor() {
        this.offset = 0;
        this.baseTime = performance.timeOrigin;
    }
    
    // Get current time with offset correction
    now() {
        return performance.now() + this.offset;
    }
    
    // Get absolute timestamp (Unix epoch)
    timestamp() {
        return this.baseTime + this.now();
    }
    
    // Set offset from sync
    setOffset(offset) {
        this.offset = offset;
    }
}
```

### Motion Detection Integration

```javascript
class RaceTimer {
    constructor() {
        this.timer = new HighPrecisionTimer();
        this.detector = new FrameDifferenceDetector();
        this.state = 'IDLE';
        this.startTime = null;
    }
    
    async startDetection() {
        const video = document.getElementById('camera');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', frameRate: 30 }
        });
        
        video.srcObject = stream;
        
        // Process frames
        const processFrame = () => {
            if (this.state === 'READY') {
                const motionDetected = this.detector.detectMotion(video);
                
                if (motionDetected) {
                    this.onMotionDetected();
                }
            }
            
            requestAnimationFrame(processFrame);
        };
        
        processFrame();
    }
    
    onMotionDetected() {
        const timestamp = this.timer.now();
        
        if (this.state === 'READY') {
            // START detected
            this.startTime = timestamp;
            this.sendStartSignal(timestamp);
            this.state = 'RUNNING';
        } else if (this.state === 'RUNNING') {
            // STOP detected
            const elapsed = timestamp - this.startTime;
            this.showResult(elapsed);
            this.state = 'FINISHED';
        }
    }
}
```

---

## 🚀 Future Enhancements (Post-MVP)

### Phase 6: Advanced Features
- Multiple athlete tracking (split times)
- Video replay with frame-by-frame analysis
- Cloud sync and leaderboards
- Coach dashboard (web portal)
- Export to CSV/PDF reports

### Phase 7: Professional Features
- Integration with timing gates (hardware)
- Wind speed sensor integration
- Photo finish mode (high-speed camera)
- Official race certification
- Federation compliance mode

---

## 📚 Technical References

### Libraries & Frameworks
- **TensorFlow.js:** https://www.tensorflow.org/js
- **MediaPipe:** https://google.github.io/mediapipe/
- **WebRTC:** https://webrtc.org/
- **Socket.io:** https://socket.io/

### Standards & Protocols
- **IAAF Timing Standards:** ±0.01s for electronic timing
- **NTP Protocol:** RFC 5905
- **WebRTC Data Channels:** RFC 8831

---

## ✅ Next Steps

1. **Review this spec** - Confirm technical approach
2. **Set up development environment** - Install dependencies
3. **Create project structure** - Initialize PWA
4. **Start Phase 1** - Build connection and sync
5. **Iterate based on testing** - Adjust as needed

---

**Ready to start implementation?** 🚀
