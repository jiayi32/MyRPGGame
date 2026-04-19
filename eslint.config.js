const universeNative = require('eslint-config-universe/flat/native');
const universeNode = require('eslint-config-universe/flat/node');
const tsAnalysis = require('eslint-config-universe/flat/shared/typescript-analysis');

const scope = (configs, files, tsconfigPath) =>
  configs.map((c) => ({
    ...c,
    files,
    ...(c.languageOptions?.parserOptions
      ? {
          languageOptions: {
            ...c.languageOptions,
            parserOptions: {
              ...c.languageOptions.parserOptions,
              project: tsconfigPath,
              tsconfigRootDir: __dirname,
            },
          },
        }
      : {}),
  }));

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'reference/**',
      'redundant/**',
      'android/**',
      'ios/**',
      'firebase/functions/lib/**',
    ],
  },
  ...scope(universeNative, ['src/**/*.{ts,tsx}'], './tsconfig.json'),
  ...scope(tsAnalysis, ['src/**/*.{ts,tsx}'], './tsconfig.json'),
  ...scope(universeNode, ['firebase/functions/src/**/*.ts'], './firebase/functions/tsconfig.json'),
  ...scope(tsAnalysis, ['firebase/functions/src/**/*.ts'], './firebase/functions/tsconfig.json'),
];
