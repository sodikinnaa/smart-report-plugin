// CI Gate Simulation
try {
    const plugin = require('../dist/index.js');
    console.log('Loading plugin:', Object.keys(plugin));
    
    if (typeof plugin.register !== 'function' && typeof plugin.activate !== 'function') {
        console.error('❌ CI Gate Failed: plugin export missing register/activate');
        process.exit(1);
    }
    
    console.log('✅ CI Gate Passed: plugin exports register/activate correctly');
    process.exit(0);
} catch (err) {
    console.error('❌ CI Gate Failed with Exception:', err.message);
    process.exit(1);
}
