import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // Nest resolves constructor dependencies through emitted decorator metadata,
      // which a type-only import erases.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.ts', '**/scripts/**/*.{ts,js,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
);
