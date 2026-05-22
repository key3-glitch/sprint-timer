/**
 * WEBRTC CONFIGURATION
 * STUN servers and connection settings for reliable peer-to-peer connections
 */

const webrtcConfig = {
    /**
     * ICE Servers (STUN/TURN)
     * Multiple STUN servers for redundancy and NAT traversal
     */
    iceServers: [
        // Google STUN servers (primary, free, reliable)
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302',
            ]
        },
        // Cloudflare STUN (backup)
        {
            urls: 'stun:stun.cloudflare.com:3478'
        },
        // Mozilla STUN (backup)
        {
            urls: 'stun:stun.services.mozilla.com'
        }
    ],
    
    /**
     * ICE Candidate Pool Size
     * Higher value = faster connection establishment
     */
    iceCandidatePoolSize: 10,
    
    /**
     * ICE Transport Policy
     * 'all' = use both STUN and direct connections
     * 'relay' = force TURN relay (more secure but requires TURN server)
     */
    iceTransportPolicy: 'all'
};

/**
 * Media Constraints for Camera
 */
const mediaConstraints = {
    video: {
        facingMode: 'environment', // Back camera
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 }
    },
    audio: false // No audio needed for sprint timing
};

/**
 * Get camera constraints with specific facing mode
 */
function getCameraConstraints(facingMode = 'environment') {
    return {
        video: {
            ...mediaConstraints.video,
            facingMode
        },
        audio: false
    };
}

/**
 * Connection state messages for UI
 */
const connectionStateMessages = {
    'new': 'Bağlantı başlatılıyor...',
    'checking': 'Bağlantı kontrol ediliyor...',
    'connected': 'Bağlantı kuruldu ✅',
    'completed': 'Bağlantı tamamlandı ✅',
    'failed': 'Bağlantı başarısız ❌',
    'disconnected': 'Bağlantı koptu ⚠️',
    'closed': 'Bağlantı kapatıldı'
};

/**
 * Log WebRTC configuration on load
 */
console.log('[WebRTC Config] Loaded with', webrtcConfig.iceServers.length, 'STUN servers');
console.log('[WebRTC Config] ICE Candidate Pool Size:', webrtcConfig.iceCandidatePoolSize);
