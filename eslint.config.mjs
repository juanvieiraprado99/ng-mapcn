import angular from 'angular-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

const zardGlobs = [
  'projects/demo/src/app/shared/components/**/*.ts',
  'projects/demo/src/app/shared/core/**/*.ts',
];

export default defineConfig([
  globalIgnores([
    'dist/',
    'playwright-report/',
    'test-results/',
    '.angular/',
    'coverage/',
    'node_modules/',
    'projects/ng-mapcn/schematics/map/files/',
    'projects/demo/src/app/blocks/block-sources.generated.ts',
    'projects/demo/public/',
  ]),
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended, angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['projects/ng-mapcn/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ng', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ng', style: 'camelCase' },
      ],
    },
  },
  {
    files: ['projects/demo/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
    },
  },
  {
    // Vendored zard/ui code.
    files: zardGlobs,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: ['z', 'app'], style: 'kebab-case' },
      ],
      // zard mixes `[z-kebab]` and `[zardCamel]` selectors; renaming would break templates.
      '@angular-eslint/directive-selector': 'off',
    },
  },
  {
    files: [
      '**/*.spec.ts',
      'projects/ng-mapcn/src/testing/**/*.ts',
      'projects/demo/src/testing/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/component-selector': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
  eslintConfigPrettier,
]);
