// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const NODE_GLOBALS = {
  __dirname: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  module: 'writable',
  process: 'readonly',
  require: 'readonly',
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'coverage/*'],
  },
  {
    files: ['jest.setup.js'],
    languageOptions: { globals: { ...NODE_GLOBALS, jest: 'readonly' } },
  },
  {
    files: ['scripts/**', 'plugins/**', '*.config.js'],
    languageOptions: { globals: NODE_GLOBALS },
  },
  {
    // React Compiler diagnostics. A component that breaks one of these still
    // works; the compiler just leaves it unoptimised. Warnings until the
    // existing ones are refactored one at a time, on a device.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/globals': 'warn',
    },
  },
]);
