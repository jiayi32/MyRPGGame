import { useEffect, type ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HubScreen } from '@/screens/HubScreen';
import { EquipmentScreen } from '@/screens/EquipmentScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ClassSelectScreen } from '@/screens/ClassSelectScreen';
import { BattleScreen } from '@/screens/BattleScreen';
import { RunMapScreen } from '@/screens/RunMapScreen';
import { RewardResolutionScreen } from '@/screens/RewardResolutionScreen';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { SignInScreen } from '@/screens/SignInScreen';
import { DevToolsScreen } from '@/screens/DevToolsScreen';
import { usePlayerStore } from '@/stores';

export type MainTabParamList = {
  Home: undefined;
  Equipment: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ClassSelect: undefined;
  Battle: undefined;
  RunMap: undefined;
  RewardResolution: undefined;
  Placeholder: undefined;
  DevTools: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Home: '⚔', Equipment: '🛡', Profile: '👤' };
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? label[0]}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#7a3b00',
        tabBarInactiveTintColor: '#9e8870',
        tabBarStyle: { backgroundColor: '#fffdf8', borderTopColor: '#d8cdbb' },
      })}
    >
      <Tab.Screen name="Home" component={HubScreen} options={{ tabBarLabel: 'Hub' }} />
      <Tab.Screen name="Equipment" component={EquipmentScreen} options={{ tabBarLabel: 'Equipment' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator initialRouteName="MainTabs">
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ClassSelect" component={ClassSelectScreen} options={{ title: 'Choose Class' }} />
      <Stack.Screen name="Battle" component={BattleScreen} options={{ title: 'Battle' }} />
      <Stack.Screen name="RunMap" component={RunMapScreen} options={{ title: 'Run Map' }} />
      <Stack.Screen name="RewardResolution" component={RewardResolutionScreen} options={{ title: 'Reward Resolution' }} />
      <Stack.Screen name="Placeholder" component={PlaceholderScreen} options={{ title: 'Diagnostics' }} />
      {__DEV__ && (
        <Stack.Screen name="DevTools" component={DevToolsScreen} options={{ title: 'Dev Tools' }} />
      )}
    </Stack.Navigator>
  );
}

function BootstrapGate() {
  return (
    <View style={styles.bootstrapContainer}>
      <ActivityIndicator color="#7a3b00" />
      <Text style={styles.bootstrapText}>Connecting…</Text>
    </View>
  );
}

/**
 * Top-level navigator that gates on auth state.
 *  - status 'idle' / 'initializing' → bootstrap loader.
 *  - status 'awaiting_sign_in' / 'signing_in' → SignInScreen.
 *  - status 'ready' → main app stack.
 *  - status 'error' → SignInScreen (errors surface via playerStore.error).
 */
export function AppNavigator() {
  const status = usePlayerStore((state) => state.status);
  const bootstrap = usePlayerStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  let content: ReactElement;
  if (status === 'idle' || status === 'initializing') {
    content = <BootstrapGate />;
  } else if (status === 'ready') {
    content = <MainStack />;
  } else {
    // 'awaiting_sign_in' | 'signing_in' | 'error'
    content = <SignInScreen />;
  }

  return <NavigationContainer>{content}</NavigationContainer>;
}

const styles = StyleSheet.create({
  bootstrapContainer: {
    flex: 1,
    backgroundColor: '#f5f4ef',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  bootstrapText: { fontSize: 13, color: '#5d4d35' },
});
