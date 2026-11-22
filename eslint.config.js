import base from '@chitfund/config/eslint';

export default [
  {
    ignores: ['**/dist/**', '**/dev-dist/**', '**/coverage/**', '**/node_modules/**'],
  },
  ...base,
];
