const axios = require('axios');

// Test concurrent requests during initialization
async function testConcurrentRequests() {
    console.log('Testing concurrent requests during initialization...');

    const promises = [];
    for (let i = 0; i < 5; i++) {
        promises.push(
            axios.get('http://localhost:3001/status')
                .then(res => {
                    console.log(`Request ${i + 1} - Status:`, res.data);
                })
                .catch(err => {
                    console.error(`Request ${i + 1} - Error:`, err.message);
                })
        );
    }

    await Promise.all(promises);
    console.log('\nAll concurrent requests completed');
}

// Test graceful shutdown
async function testGracefulShutdown() {
    console.log('\n\nTesting graceful shutdown...');
    console.log('Server should handle SIGTERM gracefully');
    console.log('Check server.log for shutdown messages');
}

async function runTests() {
    await testConcurrentRequests();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await testGracefulShutdown();
}

runTests();
