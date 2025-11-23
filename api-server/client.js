const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

let qrCodeData = null;
let clientReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
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

let clientState = 'initializing'; // 'initializing', 'ready', 'disconnected', 'auth_failed'
let reconnectTimeout = null;

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrCodeData = qr;
    clientReady = false;
    clientState = 'qr_scan_needed';
});

client.on('ready', () => {
    console.log('Client is ready!');
    clientReady = true;
    clientState = 'ready';
    qrCodeData = null; // Clear QR code once ready
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    clientReady = false;
    clientState = 'auth_failed';
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    clientReady = false;
    clientState = 'disconnected';

    // Clear any pending reconnect
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }

    // Debounced reconnection to prevent race conditions
    reconnectTimeout = setTimeout(() => {
        if (clientState === 'disconnected') {
            console.log('Attempting to reconnect...');
            clientState = 'initializing';
            client.initialize();
        }
    }, 2000); // Wait 2 seconds before reconnecting
});

// Critical: Handle errors to prevent crashes
client.on('error', (error) => {
    console.error('WhatsApp Client Error:', error);
    // Don't crash the server, just log the error
});

const initializeClient = () => {
    clientState = 'initializing';
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

// Event-based waiting to prevent memory leaks
const waitForReady = (timeoutMs = 60000) => {
    return new Promise((resolve, reject) => {
        if (clientReady) {
            return resolve();
        }

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout waiting for client to be ready'));
        }, timeoutMs);

        const onReady = () => {
            cleanup();
            resolve();
        };

        const onAuthFailure = () => {
            cleanup();
            reject(new Error('Authentication failed'));
        };

        const cleanup = () => {
            clearTimeout(timeout);
            client.removeListener('ready', onReady);
            client.removeListener('auth_failure', onAuthFailure);
        };

        client.once('ready', onReady);
        client.once('auth_failure', onAuthFailure);
    });
};

const sendMessage = async (number, message) => {
    if (!clientReady) {
        console.log('Client not ready, waiting for initialization...');
        try {
            await waitForReady();
        } catch (error) {
            const status = qrCodeData ? 'Waiting for QR scan' : 'Initializing';
            throw new Error(`Client is not ready after waiting. Status: ${status}`);
        }
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
        qr_available: !!qrCodeData,
        state: clientState
    };
};

const destroyClient = async () => {
    console.log('Destroying WhatsApp client...');
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    try {
        await client.destroy();
        console.log('WhatsApp client destroyed successfully');
    } catch (error) {
        // Suppress harmless "Target closed" errors during shutdown
        if (error.message && error.message.includes('Target closed')) {
            console.log('WhatsApp client destroyed (browser already closed)');
        } else {
            console.error('Error destroying client:', error.message);
        }
    }
};

module.exports = {
    initializeClient,
    getQrCode,
    sendMessage,
    getStatus,
    destroyClient
};
