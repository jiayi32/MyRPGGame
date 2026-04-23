import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BattleScreen } from '@/screens/BattleScreen';
import { HubScreen } from '@/screens/HubScreen';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';
import { RewardResolutionScreen } from '@/screens/RewardResolutionScreen';

export type RootStackParamList = {
  Hub: undefined;
  Battle: undefined;
  RewardResolution: undefined;
  Placeholder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Hub">
        <Stack.Screen
          name="Hub"
          component={HubScreen}
          options={{ title: 'Hub' }}
        />
        <Stack.Screen
          name="Battle"
          component={BattleScreen}
          options={{ title: 'Battle' }}
        />
        <Stack.Screen
          name="RewardResolution"
          component={RewardResolutionScreen}
          options={{ title: 'Reward Resolution' }}
        />
        <Stack.Screen
          name="Placeholder"
          component={PlaceholderScreen}
          options={{ title: 'Diagnostics' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
