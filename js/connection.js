/**
 * CONNECTION MODULE
 * WebRTC + WebSocket hybrid communication
 */

class ConnectionManager {
    constructor() {
        this.type = null; // 'webrtc' or 'websocket'
        this.connection = null;
        this.dataChannel = null;
        this.ws = null;
        this.isConnected = false;
        this.messageHandlers = [];
        this.sequenceNumber = 0;
        
        // Signaling server - auto-detect or use default
        this.signalingServer = this.getSignalingServerURL();
    }

    /**
     * Get signaling server URL (auto-detect for mobile)
     */
    getSignalingServerURL() {
        // Check if custom server URL is provided
        const urlParams = new URLSearchParams(window.location.search);
        const customServer = urlParams.get('server');
        
        if (customServer) {
            return customServer;
        }
        
        // Auto-detect: use current host
        const protocol = window.location.protocol; // http: or https:
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        } else {
            // Production: use same protocol and host (Render serves on same port)
            return `${protocol}//${hostname}${port ? ':' + port : ''}`;
        }
    }

    /**
     * Initialize connection
     * @param {boolean} isInitiator - True if this phone initiates connection
     */
    async connect(isInitiator) {
        console.log(`[Connection] Connecting as ${isInitiator ? 'initiator' : 'receiver'}...`);
        
        try {
            // Try WebRTC first
            await this.connectWebRTC(isInitiator);
            this.type = 'webrtc';
            console.log('[Connection] WebRTC connection established');
        } catch (error) {
            console.warn('[Connection] WebRTC failed, falling back to WebSocket', error);
            
            // Fallback to WebSocket
            await this.connectWebSocket();
            this.type = 'websocket';
            console.log('[Connection] WebSocket connection established');
        }
        
        this.isConnected = true;
        return this.type;
    }
    
    /**
     * Create room (Start phone)
     */
    createRoom(phoneCount = 2, distances = []) {
        return new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('Not connected'));
                return;
            }
            
            console.log(`[Connection] Creating room with ${phoneCount} phones and distances:`, distances);
            
            this.ws.emit('create-room', { phoneCount: phoneCount, distances: distances }, (response) => {
                if (response.success) {
                    console.log(`[Connection] Room created: ${response.roomCode} (${phoneCount} phones)`);
                    resolve(response.roomCode);
                } else {
                    reject(new Error(response.error || 'Failed to create room'));
                }
            });
        });
    }
    
    /**
     * Join room (Other phones)
     */
    joinRoom(roomCode, role) {
        return new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('Not connected'));
                return;
            }
            
            this.ws.emit('join-room', { roomCode, role }, (response) => {
                if (response.success) {
                    console.log(`[Connection] Joined room: ${response.roomCode}`);
                    // Return room configuration (distances, phoneCount)
                    resolve({
                        distances: response.distances,
                        phoneCount: response.phoneCount
                    });
                } else {
                    reject(new Error(response.error || 'Failed to join room'));
                }
            });
        });
    }

    /**
     * Connect via WebRTC
     */
    async connectWebRTC(isInitiator, roomCode) {
        return new Promise(async (resolve, reject) => {
            // First connect to signaling server
            if (!this.ws) {
                await this.connectWebSocket();
            }
            
            // Create peer connection with better STUN servers
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ],
                iceTransportPolicy: 'all', // Use all available candidates
                iceCandidatePoolSize: 10
            };
            
            this.connection = new RTCPeerConnection(config);
            this.roomCode = roomCode;
            
            // Create data channel
            if (isInitiator) {
                this.dataChannel = this.connection.createDataChannel('timer', {
                    ordered: true,
                    maxRetransmits: 3
                });
                this.setupDataChannel();
                console.log('[WebRTC] Data channel created (initiator)');
            } else {
                this.connection.ondatachannel = (event) => {
                    this.dataChannel = event.channel;
                    this.setupDataChannel();
                    console.log('[WebRTC] Data channel received');
                };
            }
            
            // ICE candidate handling
            this.connection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('[WebRTC] Sending ICE candidate');
                    // Send candidate to other peers via signaling
                    this.ws.emit('webrtc-signal', {
                        roomCode: this.roomCode,
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };
            
            // ICE gathering state
            this.connection.onicegatheringstatechange = () => {
                console.log('[WebRTC] ICE gathering state:', this.connection.iceGatheringState);
            };
            
            // Connection state
            this.connection.onconnectionstatechange = () => {
                console.log('[WebRTC] Connection state:', this.connection.connectionState);
                if (this.connection.connectionState === 'connected') {
                    console.log('[WebRTC] P2P connection established!');
                    resolve();
                } else if (this.connection.connectionState === 'failed' || 
                           this.connection.connectionState === 'disconnected') {
                    console.warn('[WebRTC] Connection failed/disconnected');
                    reject(new Error('WebRTC connection failed'));
                }
            };
            
            // Listen for signaling messages
            this.ws.on('webrtc-signal', async (data) => {
                console.log('[WebRTC] Received signal:', data.type);
                
                if (data.type === 'offer') {
                    await this.handleOffer(data.sdp);
                } else if (data.type === 'answer') {
                    await this.handleAnswer(data.sdp);
                } else if (data.type === 'ice-candidate') {
                    await this.handleIceCandidate(data.candidate);
                }
            });
            
            // Start signaling
            if (isInitiator) {
                console.log('[WebRTC] Creating offer...');
                this.createOffer();
            }
            
            // Longer timeout for WebRTC (30 seconds)
            setTimeout(() => {
                if (this.connection.connectionState !== 'connected') {
                    console.warn('[WebRTC] Connection timeout, will use WebSocket');
                    reject(new Error('WebRTC connection timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Setup data channel handlers
     */
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('[WebRTC] Data channel opened');
        };
        
        this.dataChannel.onclose = () => {
            console.log('[WebRTC] Data channel closed');
            this.isConnected = false;
        };
        
        this.dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('[WebRTC] Message parse error:', error);
            }
        };
        
        this.dataChannel.onerror = (error) => {
            console.error('[WebRTC] Data channel error:', error);
        };
    }

    /**
     * Create WebRTC offer
     */
    async createOffer() {
        try {
            const offer = await this.connection.createOffer();
            await this.connection.setLocalDescription(offer);
            
            // Send offer via signaling
            this.sendSignaling({
                type: 'offer',
                sdp: offer
            });
        } catch (error) {
            console.error('[WebRTC] Create offer error:', error);
        }
    }

    /**
     * Handle WebRTC answer
     */
    async handleAnswer(answer) {
        try {
            await this.connection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('[WebRTC] Handle answer error:', error);
        }
    }

    /**
     * Handle WebRTC offer
     */
    async handleOffer(offer) {
        try {
            await this.connection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.connection.createAnswer();
            await this.connection.setLocalDescription(answer);
            
            // Send answer via signaling
            this.sendSignaling({
                type: 'answer',
                sdp: answer
            });
        } catch (error) {
            console.error('[WebRTC] Handle offer error:', error);
        }
    }

    /**
     * Handle ICE candidate
     */
    async handleIceCandidate(candidate) {
        try {
            await this.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('[WebRTC] Add ICE candidate error:', error);
        }
    }

    /**
     * Connect via WebSocket (fallback) - Using Socket.IO
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            // Socket.IO connection
            this.ws = io('http://localhost:3000', {
                transports: ['websocket', 'polling']
            });
            
            this.ws.on('connect', () => {
                console.log('[WebSocket] Connected via Socket.IO');
                this.isConnected = true; // Set flag to true
                resolve();
            });
            
            this.ws.on('disconnect', () => {
                console.log('[WebSocket] Disconnected');
                this.isConnected = false;
            });
            
            this.ws.on('connect_error', (error) => {
                console.error('[WebSocket] Connection error:', error);
                reject(error);
            });
            
            // Handle incoming messages
            this.ws.on('message', (message) => {
                this.handleMessage(message);
            });
            
            // Handle PONG responses (for time sync)
            this.ws.on('PONG', (data) => {
                this.handleMessage(data);
            });
            
            // Handle race messages (START, STOP, PREPARE, READY)
            this.ws.on('race-message', (data) => {
                console.log('[WebSocket] Received race-message:', data.type);
                this.handleMessage(data);
            });
            
            // Handle peer connection events
            this.ws.on('peer-connected', (data) => {
                console.log('[WebSocket] Peer connected:', data.peerId);
                // Trigger message handlers with peer-connected event
                this.handleMessage({ type: 'peer-connected', payload: data });
            });
            
            this.ws.on('peer-disconnected', () => {
                console.log('[WebSocket] Peer disconnected');
                // Trigger message handlers with peer-disconnected event
                this.handleMessage({ type: 'peer-disconnected', payload: {} });
            });
            
            // Timeout
            setTimeout(() => {
                if (!this.ws.connected) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }

    /**
     * Send message
     */
    send(message) {
        if (!this.isConnected) {
            console.warn('[Connection] Not connected, cannot send message');
            return false;
        }
        
        // Add sequence number and checksum
        message.sequence = this.sequenceNumber++;
        message.checksum = this.calculateChecksum(message);
        
        try {
            if (this.type === 'webrtc' && this.dataChannel) {
                const data = JSON.stringify(message);
                this.dataChannel.send(data);
            } else if (this.type === 'websocket' && this.ws) {
                // Socket.IO emit - use race-message for all race-related messages
                if (message.type === 'SYNC') {
                    this.ws.emit('SYNC', message);
                } else if (message.type === 'START' || message.type === 'STOP' || 
                           message.type === 'PREPARE' || message.type === 'READY' ||
                           message.type === 'SPLIT' || message.type === 'RESTART' ||
                           message.type === 'END_SESSION') {
                    this.ws.emit('race-message', message);
                } else {
                    this.ws.emit('message', message);
                }
            }
            return true;
        } catch (error) {
            console.error('[Connection] Send error:', error);
            return false;
        }
    }

    /**
     * Handle incoming message
     */
    handleMessage(message) {
        // Verify checksum (only if present - server messages may not have checksum)
        if (message.checksum) {
            const receivedChecksum = message.checksum;
            delete message.checksum;
            const calculatedChecksum = this.calculateChecksum(message);
            
            if (receivedChecksum !== calculatedChecksum) {
                console.warn('[Connection] Checksum mismatch, message corrupted');
                return;
            }
        }
        
        // Notify handlers
        this.messageHandlers.forEach(handler => handler(message));
    }

    /**
     * Register message handler
     */
    on(event, handler) {
        if (event === 'message') {
            this.messageHandlers.push(handler);
        }
    }

    /**
     * Unregister message handler
     */
    off(event, handler) {
        if (event === 'message') {
            const index = this.messageHandlers.indexOf(handler);
            if (index > -1) {
                this.messageHandlers.splice(index, 1);
            }
        }
    }

    /**
     * Send signaling message (for WebRTC setup)
     */
    sendSignaling(message) {
        // In production, this would send via signaling server
        // For now, we'll use WebSocket if available
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'signaling',
                payload: message
            }));
        }
    }

    /**
     * Calculate simple checksum
     */
    calculateChecksum(message) {
        const str = JSON.stringify(message);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            type: this.type,
            connected: this.isConnected,
            latency: this.measureLatency()
        };
    }

    /**
     * Measure connection latency
     */
    measureLatency() {
        // Simple ping-pong measurement
        // Will be implemented with actual ping messages
        return 10; // Placeholder
    }

    /**
     * Disconnect
     */
    disconnect() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.connection) {
            this.connection.close();
        }
        if (this.ws) {
            if (this.type === 'websocket') {
                // Socket.IO disconnect
                this.ws.disconnect();
            } else {
                this.ws.close();
            }
        }
        this.isConnected = false;
    }
}

// Export
window.ConnectionManager = ConnectionManager;
