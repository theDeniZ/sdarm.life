import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '.next/**',
      '.vercel/**',
      '.open-next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'pnpm-lock.yaml',
      '*.lock',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    /* the service worker runs in a worker, not in the page: its globals are
       self, caches and fetch, none of which the browser config knows about */
    files: ['public/sbl-sw.js'],
    languageOptions: {
      globals: { self: 'readonly', caches: 'readonly', fetch: 'readonly', URL: 'readonly' },
    },
  },
  {
    plugins: {
      prettier,
      'react-hooks': reactHooks,
    },
    rules: {
      'prettier/prettier': 'error',
      ...reactHooks.configs.recommended.rules,
    },
  }
);
