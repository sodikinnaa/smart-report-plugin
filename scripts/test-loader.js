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
    commands: 0,
    invalidCommandHandlers: 0,
  };

  const mockApi = {
    saveConfig: async () => {},
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    registerCli: () => {
      registrations.cli += 1;
    },
    registerResource: () => {
      registrations.resources += 1;
    },
    registerTool: () => {
      registrations.tools += 1;
    },
    registerCommand: (def) => {
      registrations.commands += 1;
      const handlerType = typeof (def && def.handler);
      if (handlerType !== 'function') {
        console.error('Invalid command registration payload:', def);
        registrations.invalidCommandHandlers += 1;
      }
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

  if (registrations.commands !== 15) {
    console.error(`❌ CI Gate Failed: expected 15 commands, got ${registrations.commands}`);
    process.exit(1);
  }

  if (registrations.invalidCommandHandlers !== 0) {
    console.error(`❌ CI Gate Failed: found ${registrations.invalidCommandHandlers} command(s) without valid handler function`);
    process.exit(1);
  }

  console.log('✅ CI Gate Passed: plugin registration shape looks correct');
  process.exit(0);
} catch (err) {
  console.error('❌ CI Gate Failed with Exception:', err.message);
  process.exit(1);
}
