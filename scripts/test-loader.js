try {
  const plugin = require('../dist/index.js');
  console.log('Loading plugin exports:', Object.keys(plugin));

  if (typeof plugin.register !== 'function' && typeof plugin.activate !== 'function') {
    console.error('❌ CI Gate Failed: plugin export missing register/activate');
    process.exit(1);
  }

  const registrations = {
    cli: 0,
    resources: 0,
    tools: 0,
  };

  const mockApi = {
    saveConfig: async () => {},
    registerCli: () => {
      registrations.cli += 1;
    },
    registerResource: () => {
      registrations.resources += 1;
    },
    registerTool: () => {
      registrations.tools += 1;
    },
  };

  const registerFn = plugin.register || plugin.activate;
  registerFn(mockApi);

  if (registrations.cli !== 1) {
    console.error('❌ CI Gate Failed: CLI registration missing');
    process.exit(1);
  }

  if (registrations.resources !== 5) {
    console.error(`❌ CI Gate Failed: expected 5 resources, got ${registrations.resources}`);
    process.exit(1);
  }

  if (registrations.tools !== 5) {
    console.error(`❌ CI Gate Failed: expected 5 tools, got ${registrations.tools}`);
    process.exit(1);
  }

  console.log('✅ CI Gate Passed: plugin registration shape looks correct');
  process.exit(0);
} catch (err) {
  console.error('❌ CI Gate Failed with Exception:', err.message);
  process.exit(1);
}
