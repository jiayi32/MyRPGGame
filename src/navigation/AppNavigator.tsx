import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from '@/screens/PlaceholderScreen';

export type RootStackParamList = {
  Placeholder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Placeholder">
        <Stack.Screen
          name="Placeholder"
          component={PlaceholderScreen}
          options={{ title: 'MyRPGGame' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
