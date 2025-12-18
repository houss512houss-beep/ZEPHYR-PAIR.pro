const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
});

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

// WhatsApp Connection Manager
let sock = null;
let qrCodeData = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['ZEPHYR-PAIR', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        if (qr) {
            qrCodeData = qr;
            console.log('QR Code Received');
            
            // Generate QR Image and emit to all connected clients
            try {
                const qrImage = await qrcode.toDataURL(qr);
                io.emit('qr', qrImage);
                io.emit('message', '📱 امسح رمز QR باستخدام واتساب > الأجهزة المرتبطة');
            } catch (err) {
                console.error('QR Generation Error:', err);
            }
        }

        if (connection === 'open') {
            console.log('✅ Connected to WhatsApp!');
            io.emit('message', '✅ تم الاتصال بواسطة واتساب بنجاح!');
            qrCodeData = null;
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('Client connected');
    
    if (qrCodeData) {
        qrcode.toDataURL(qrCodeData)
            .then(qrImage => {
                socket.emit('qr', qrImage);
                socket.emit('message', '📱 امسح رمز QR باستخدام واتساب');
            })
            .catch(err => console.error(err));
    }
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
    connectToWhatsApp();
});
