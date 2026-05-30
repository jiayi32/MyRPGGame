import AsyncStorage from '@react-native-async-storage/async-storage';

const UI_HINT_SEEN_VALUE = '1';

export const readUiHintSeenStates = async (
  keys: readonly string[],
): Promise<Record<string, boolean>> => {
  const entries = await AsyncStorage.multiGet([...keys]);
  const states: Record<string, boolean> = {};

  for (const [key, value] of entries) {
    states[key] = value === UI_HINT_SEEN_VALUE;
  }

  return states;
};

export const markUiHintSeen = async (key: string): Promise<void> => {
  await AsyncStorage.setItem(key, UI_HINT_SEEN_VALUE);
};
