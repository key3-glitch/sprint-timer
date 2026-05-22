/**
 * SIGNALING SERVER
 * WebRTC signaling and time synchronization server
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Add CSP headers to allow PDF generation libraries
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.socket.io; " +
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' https://cdnjs.cloudflare.com https://cdn.socket.io https://sprint-timer.onrender.com wss://sprint-timer.onrender.com ws://localhost:* http://localhost:*; " +
        "font-src 'self' data:; " +
        "worker-src 'self' blob:;"
    );
    next();
});

// Serve static files (frontend) - serve from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Fallback to index.html for SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Store connected clients and rooms
const clients = new Map();
const rooms = new Map(); // roomId -> { phones: [socketIds], phoneCount: number, distances: [0, 20, 30, ...], createdAt: timestamp }

// Generate random 4-digit room code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        clients: clients.size,
        rooms: rooms.size,
        activeRooms: Array.from(rooms.entries()).map(([roomId, room]) => ({
            roomId,
            phoneCount: room.phoneCount,
            connectedPhones: room.phones.length
        }))
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);
    clients.set(socket.id, { socket, roomId: null, role: null });

    // Handle room creation (Start phone creates room)
    socket.on('create-room', (data, callback) => {
        const roomCode = generateRoomCode();
        const phoneCount = data?.phoneCount || 2; // Default to 2 phones
        const distances = data?.distances || []; // Distance configuration
        
        rooms.set(roomCode, {
            phones: [socket.id], // Array of socket IDs
            phoneCount: phoneCount,
            distances: distances,
            createdAt: Date.now()
        });
        
        const clientData = clients.get(socket.id);
        clientData.roomId = roomCode;
        clientData.role = 'start';
        
        socket.join(roomCode);
        
        console.log(`[Server] Room created: ${roomCode} by ${socket.id} (${phoneCount} phones, distances: ${distances.join(', ')}m)`);
        
        if (callback) {
            callback({ success: true, roomCode, role: 'start' });
        }
    });
    
    // Handle room joining (Other phones join room)
    socket.on('join-room', (data, callback) => {
        const { roomCode } = data;
        
        if (!rooms.has(roomCode)) {
            console.log(`[Server] Room not found: ${roomCode}`);
            if (callback) {
                callback({ success: false, error: 'Oda bulunamadı' });
            }
            return;
        }
        
        const room = rooms.get(roomCode);
        
        if (room.phones.length >= room.phoneCount) {
            console.log(`[Server] Room full: ${roomCode}`);
            if (callback) {
                callback({ success: false, error: 'Oda dolu' });
            }
            return;
        }
        
        room.phones.push(socket.id);
        
        const clientData = clients.get(socket.id);
        clientData.roomId = roomCode;
        clientData.role = data.role || `phone${room.phones.length - 1}`;
        
        socket.join(roomCode);
        
        console.log(`[Server] Phone joined room: ${roomCode} (${room.phones.length}/${room.phoneCount})`);
        
        // Notify all phones in room about new peer
        room.phones.forEach(phoneId => {
            if (phoneId !== socket.id) {
                io.to(phoneId).emit('peer-connected', { peerId: socket.id });
            }
        });
        
        if (callback) {
            // Send room configuration to joining phone
            callback({ 
                success: true, 
                roomCode, 
                role: clientData.role,
                phoneCount: room.phoneCount,
                distances: room.distances
            });
        }
        
        if (room.phones.length === room.phoneCount) {
            console.log(`[Server] Room ${roomCode} is now complete (${room.phoneCount} phones)`);
        }
    });

    // Handle phone role assignment (legacy - for backward compatibility)
    socket.on('register', (data) => {
        const { role } = data; // 'phone1' or 'phone2'
        
        const clientData = clients.get(socket.id);
        clientData.role = role;
        
        console.log(`[Server] ${role} registered: ${socket.id}`);
        
        socket.emit('registered', { role, id: socket.id });
    });

    // Handle WebRTC signaling
    socket.on('signaling', (data) => {
        const { to, payload } = data;
        
        if (to && clients.has(to)) {
            io.to(to).emit('signaling', {
                from: socket.id,
                payload: payload
            });
            console.log(`[Server] Signaling: ${socket.id} -> ${to}`);
        }
    });

    // Handle time sync requests (SYNC)
    socket.on('SYNC', (data) => {
        // Simply echo back the client timestamp
        // Client will calculate offset based on round-trip time
        socket.emit('PONG', {
            type: 'PONG',
            payload: {
                clientTimestamp: data.timestamp,
                serverTime: data.timestamp // Echo back for now
            }
        });
    });

    // Handle race messages (START, STOP, PREPARE, READY, SPLIT)
    socket.on('race-message', (data) => {
        const { type, payload, timestamp, sequence } = data;
        
        const clientData = clients.get(socket.id);
        if (!clientData || !clientData.roomId) {
            console.warn(`[Server] Cannot forward ${type}: client not in a room`);
            return;
        }
        
        const roomCode = clientData.roomId;
        const room = rooms.get(roomCode);
        
        if (!room) {
            console.warn(`[Server] Room not found: ${roomCode}`);
            return;
        }
        
        // Broadcast to ALL phones in the room (except sender)
        room.phones.forEach(phoneId => {
            if (phoneId !== socket.id && clients.has(phoneId)) {
                io.to(phoneId).emit('race-message', {
                    type: type,
                    payload: payload,
                    timestamp: timestamp,
                    sequence: sequence,
                    from: socket.id,
                    fromRole: clientData.role
                });
            }
        });
        
        console.log(`[Server] Race message: ${type} in room ${roomCode} from ${clientData.role} to ${room.phones.length - 1} phones`);
    });
    
    // Handle generic messages (fallback for any message type)
    socket.on('message', (data) => {
        const { type } = data;
        
        const clientData = clients.get(socket.id);
        if (!clientData || !clientData.roomId) {
            console.warn(`[Server] Cannot forward message: client not in a room`);
            return;
        }
        
        const roomCode = clientData.roomId;
        const room = rooms.get(roomCode);
        
        if (!room) {
            console.warn(`[Server] Room not found: ${roomCode}`);
            return;
        }
        
        // Broadcast to ALL phones in the room (except sender)
        room.phones.forEach(phoneId => {
            if (phoneId !== socket.id && clients.has(phoneId)) {
                io.to(phoneId).emit('message', {
                    ...data,
                    from: socket.id,
                    fromRole: clientData.role
                });
            }
        });
        
        console.log(`[Server] Message: ${type} in room ${roomCode} from ${clientData.role} to ${room.phones.length - 1} phones`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`[Server] Client disconnected: ${socket.id}`);
        
        const clientData = clients.get(socket.id);
        
        if (clientData && clientData.roomId) {
            const roomCode = clientData.roomId;
            const room = rooms.get(roomCode);
            
            if (room) {
                // Notify all other phones
                room.phones.forEach(phoneId => {
                    if (phoneId !== socket.id) {
                        io.to(phoneId).emit('peer-disconnected', { peerId: socket.id });
                    }
                });
                
                // Remove phone from room
                room.phones = room.phones.filter(id => id !== socket.id);
                
                console.log(`[Server] Phone removed from room ${roomCode} (${room.phones.length}/${room.phoneCount} remaining)`);
                
                // Delete room if empty
                if (room.phones.length === 0) {
                    rooms.delete(roomCode);
                    console.log(`[Server] Room ${roomCode} deleted (empty)`);
                }
            }
        }
        
        clients.delete(socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`[Server] Sprint Timer Signaling Server running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});

// Keep-alive: Ping server every 10 minutes to prevent cold start
if (process.env.RENDER) {
    const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || `https://sprint-timer.onrender.com`;
    
    setInterval(async () => {
        try {
            const https = require('https');
            https.get(`${KEEP_ALIVE_URL}/health`, (res) => {
                console.log(`[Keep-Alive] Ping successful: ${res.statusCode}`);
            }).on('error', (err) => {
                console.error(`[Keep-Alive] Ping failed:`, err.message);
            });
        } catch (error) {
            console.error(`[Keep-Alive] Error:`, error.message);
        }
    }, 10 * 60 * 1000); // Every 10 minutes
    
    console.log(`[Server] Keep-alive enabled for Render deployment`);
}
