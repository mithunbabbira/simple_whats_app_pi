const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let qrCodeData = null;
let clientReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Important for low resource usage
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrCodeData = qr;
    clientReady = false;
});

client.on('ready', () => {
    console.log('Client is ready!');
    clientReady = true;
    qrCodeData = null; // Clear QR code once ready
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    clientReady = false;
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    clientReady = false;
    // Re-initialize client to allow new login or reconnection
    client.initialize();
});

const initializeClient = () => {
    client.initialize();
};

const getQrCode = async () => {
    if (clientReady) {
        return { status: 'connected', message: 'Client is already ready' };
    }
    if (qrCodeData) {
        try {
            const qrImage = await qrcode.toDataURL(qrCodeData);
            return { status: 'qr_ready', qr_code: qrCodeData, qr_image: qrImage };
        } catch (err) {
            console.error('Error generating QR image', err);
            return { status: 'error', message: 'Failed to generate QR image' };
        }
    }
    return { status: 'waiting', message: 'Waiting for QR code' };
};

const sendMessage = async (number, message) => {
    if (!clientReady) {
        throw new Error('Client is not ready');
    }
    try {
        // Ensure number format (simple check, can be improved)
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const response = await client.sendMessage(chatId, message);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

const getStatus = () => {
    return {
        ready: clientReady,
        qr_available: !!qrCodeData
    };
};

module.exports = {
    initializeClient,
    getQrCode,
    sendMessage,
    getStatus
};
