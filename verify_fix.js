const axios = require('axios');

async function testWait() {
    console.log('Sending request to /send...');
    const start = Date.now();
    try {
        const response = await axios.post('http://localhost:3001/send', {
            number: '918762623837',
            message: 'Test message from verification script'
        });
        const duration = Date.now() - start;
        console.log(`Response received in ${duration}ms`);
        console.log('Response:', response.data);
    } catch (error) {
        const duration = Date.now() - start;
        console.log(`Error after ${duration}ms:`, error.response ? error.response.data : error.message);
    }
}

testWait();
