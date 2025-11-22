const express = require('express');
const { initializeClient, getQrCode, sendMessage, getStatus } = require('./client');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('WhatsApp API Server Running');
});

// Initialize WhatsApp Client
initializeClient();

app.get('/qr', async (req, res) => {
    const result = await getQrCode();
    res.json(result);
});

app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }
    try {
        const response = await sendMessage(number, message);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/status', (req, res) => {
    res.json(getStatus());
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
