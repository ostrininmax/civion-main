import eslint from '@eslint/js';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-console': 'off'
    }
  }
];
