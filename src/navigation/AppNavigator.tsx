import { useEffect, type ReactElement } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HubScreen } from '@/screens/Hub';
import { EquipmentScreen } from '@/screens/Equipment';
import { ShopScreen } from '@/screens/Shop';
import { ProfileScreen } from '@/screens/Profile';
import { OnboardingNarrativeScreen } from '@/screens/OnboardingNarrative';
import { ClassSelectScreen } from '@/screens/ClassSelect';
import { BattleScreen } from '@/screens/Battle';
// import { BattleScreen as BattleScreenV2 } from '@/screens/Battle/BattleScreenV2'; // Disabled: WorldMap stack removed
import { RunMapScreen } from '@/screens/RunMap';
import { RewardResolutionScreen } from '@/screens/RewardResolution';
import { PassiveDraftScreen } from '@/screens/PassiveDraft/PassiveDraftScreen';
import { SkillDraftScreen } from '@/screens/SkillDraft/SkillDraftScreen';
import { AugmentDraftScreen } from '@/screens/AugmentDraft/AugmentDraftScreen';
import { InnDecisionScreen } from '@/screens/InnDecision/InnDecisionScreen';
import { RiskContractSelectScreen } from '@/screens/RiskContractSelect/RiskContractSelectScreen';
import { EventRoomScreen } from '@/screens/EventRoom/EventRoomScreen';
import { PlaceholderScreen } from '@/screens/Placeholder';
import { SignInScreen } from '@/screens/SignIn';
import { DevToolsScreen } from '@/screens/DevTools';
// Phase D: New sci-fi screens (disabled — GPS map temporarily removed to focus on dungeon loop)
// import { WorldMapScreen } from '@/screens/WorldMap/WorldMapScreen';
import { CharacterScreen } from '@/screens/Character/CharacterScreen';
import { usePlayerStore, useRunStore } from '@/stores';
// import { useWorldStore } from '@/stores/worldStore';
// import { useCharacterStore } from '@/stores/characterStore';
import { Icon, type IconName } from '@/components/atoms/Icon';
import { colors } from '@/design';

export type HomeStackParamList = {
  Hub: undefined;
  // Legacy roguelite screens
  OnboardingNarrative: undefined;
  ClassSelect: undefined;
  Battle: undefined;
  RunMap: undefined;
  RewardResolution: undefined;
  PassiveDraft: undefined;
  SkillDraft: undefined;
  AugmentDraft: undefined;
  InnDecision: undefined;
  RiskContractSelect: { classId: string };
  EventRoom: undefined;
  Placeholder: undefined;
  // Phase D: Sci-fi world screens
  WorldMapMain: undefined;
  BattleV2: undefined;
};

export type MainTabParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList> | undefined;
  WorldMap: NavigatorScreenParams<HomeStackParamList> | undefined;
  Character: undefined;
  Inventory: undefined;
  Shop: undefined;
  Equipment: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  DevTools: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<string, IconName> = {
  WorldMap: 'castle',
  HomeStack: 'castle',
  Character: 'crest',
  Inventory: 'shield',
  Shop: 'coin-sack',
  Equipment: 'shield',
  Profile: 'crest',
};

function TabIcon({ routeName, focused }: { routeName: string; focused: boolean }) {
  const iconName = TAB_ICONS[routeName] ?? 'castle';
  const iconColor = focused ? colors.tabBar.active : colors.tabBar.inactive;
  return <Icon name={iconName} size={22} color={iconColor} />;
}

/** Phase D: World Map Stack — disabled (GPS map temporarily removed to focus on dungeon loop). */
// function WorldMapStackNavigator() {
//   return (
//     <HomeStack.Navigator initialRouteName="WorldMapMain">
//       <HomeStack.Screen
//         name="WorldMapMain"
//         component={WorldMapScreen as React.ComponentType<any>}
//         options={{ headerShown: false }}
//       />
//       <HomeStack.Screen
//         name="BattleV2"
//         component={BattleScreenV2}
//         options={{
//           title: 'Encounter',
//           headerBackVisible: false,
//           gestureEnabled: false,
//           headerStyle: { backgroundColor: '#0a0a1a' },
//           headerTintColor: '#00ffff',
//         }}
//       />
//     </HomeStack.Navigator>
//   );
// }

/** Legacy Hub Stack — kept for existing roguelite flow compatibility. */
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator initialRouteName="Hub">
      <HomeStack.Screen name="Hub" component={HubScreen} options={{ headerShown: false }} />
      <HomeStack.Screen
        name="OnboardingNarrative"
        component={OnboardingNarrativeScreen}
        options={{ title: 'Prologue' }}
      />
      <HomeStack.Screen name="ClassSelect" component={ClassSelectScreen} options={{ title: 'Choose Class' }} />
      <HomeStack.Screen
        name="Battle"
        component={BattleScreen}
        options={{
          title: 'Battle',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen name="RunMap" component={RunMapScreen} options={{ title: 'Run Map' }} />
      <HomeStack.Screen
        name="RewardResolution"
        component={RewardResolutionScreen}
        options={{
          title: 'Reward Resolution',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen
        name="PassiveDraft"
        component={PassiveDraftScreen}
        options={{
          title: 'Choose Passive',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen
        name="SkillDraft"
        component={SkillDraftScreen}
        options={{
          title: 'Choose Skill',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen
        name="AugmentDraft"
        component={AugmentDraftScreen}
        options={{
          title: 'Choose Augment',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen
        name="InnDecision"
        component={InnDecisionScreen}
        options={{
          title: 'Rest Stop',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen
        name="RiskContractSelect"
        component={RiskContractSelectScreen}
        options={{
          title: 'Risk Contracts',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen
        name="EventRoom"
        component={EventRoomScreen}
        options={{
          title: 'Event',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <HomeStack.Screen name="Placeholder" component={PlaceholderScreen} options={{ title: 'Diagnostics' }} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  const runStatus = useRunStore((state) => state.status);

  const tabsBlocked =
    runStatus === 'starting_run' ||
    runStatus === 'submitting_outcome' ||
    runStatus === 'ending_run';

  const withTabGuard = () => ({
    tabPress: (event: { preventDefault: () => void }) => {
      if (!tabsBlocked) return;
      event.preventDefault();
      Alert.alert('Action in progress', 'Please wait for the current run action to finish.');
    },
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
          borderTopColor: colors.tabBar.border,
          height: 56,
        },
      })}
    >
      {/* Phase D: World Map tab — disabled (GPS map temporarily removed to focus on dungeon loop) */}
      {/* <Tab.Screen
        name="WorldMap"
        component={WorldMapStackNavigator}
        options={{ tabBarLabel: 'Grid' }}
      /> */}
      {/* Hub — primary tab for roguelite dungeon loop */}
      <Tab.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Hub' }}
        listeners={withTabGuard}
      />
      <Tab.Screen
        name="Character"
        component={CharacterScreen}
        options={{ tabBarLabel: 'Character' }}
      />
      <Tab.Screen
        name="Inventory"
        component={EquipmentScreen}
        options={{ tabBarLabel: 'Gear' }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{ tabBarLabel: 'Shop' }}
        listeners={withTabGuard}
      />
      <Tab.Screen
        name="Equipment"
        component={EquipmentScreen}
        options={{ tabBarLabel: 'Equipment' }}
        listeners={withTabGuard}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
        listeners={withTabGuard}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator initialRouteName="MainTabs">
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
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
    backgroundColor: colors.parchment.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  bootstrapText: { fontSize: 13, color: colors.parchment.text.secondary },
});
