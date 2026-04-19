import "react-native-gesture-handler";
import { registerRootComponent } from "expo";

import App from "./App";

// Temporary: log a full stack for early runtime errors
const originalHandler =
  (global.ErrorUtils &&
    (ErrorUtils.getGlobalHandler?.() || ErrorUtils._globalHandler)) ||
  null;
if (global.ErrorUtils && ErrorUtils.setGlobalHandler) {
  ErrorUtils.setGlobalHandler((err, isFatal) => {
    try {
      console.log("@@@ GlobalError", {
        message: err?.message,
        stack: err?.stack,
      });
    } catch (e) {
      // no-op
    }
    if (originalHandler) {
      return originalHandler(err, isFatal);
    }
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
