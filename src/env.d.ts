export {};

declare global {
  // Expo bundles EXPO_PUBLIC_* env vars via babel-preset-expo.
  // These declarations make them type-safe in TypeScript.
  // eslint-disable-next-line no-var
  var process: {
    env: {
      EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?: string;
      EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN?: string;
      NODE_ENV: string;
    };
  };
}
