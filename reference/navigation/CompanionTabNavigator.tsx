/**
 * CompanionTabNavigator — Stack navigator for the Companion bottom tab.
 *
 * Screens:
 *   - CompanionScreen (initial) — full companion hub
 *   - CompanionSelect — character selection grid
 *   - Shared screens (GroupDetail, ExpenseDetail, etc.)
 *   - Campaign screens (Hub, ClassPicker, Battle, Quests, etc.)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CompanionScreen from '../screens/companion/CompanionScreen';
import CompanionSelectScreen from '../screens/settings/CompanionSelectScreen';
import ExpeditionScreen from '../screens/companion/ExpeditionScreen';
import ShopScreen from '../screens/companion/ShopScreen';
import TownScreen from '../screens/companion/TownScreen';
import AdventureMapScreen from '../screens/companion/AdventureMapScreen';
// Campaign screens
import CampaignSelectScreen from '../screens/campaign/CampaignSelectScreen';
import CampaignHubScreen from '../screens/campaign/CampaignHubScreen';
import ClassPickerScreen from '../screens/campaign/ClassPickerScreen';
import StatAllocationScreen from '../screens/campaign/StatAllocationScreen';
import RosterScreen from '../screens/campaign/RosterScreen';
import GearScreen from '../screens/campaign/GearScreen';
import BattleScreen from '../screens/campaign/BattleScreen';
import QuestBoardScreen from '../screens/campaign/QuestBoardScreen';
import QuestPrepScreen from '../screens/campaign/QuestPrepScreen';
import RewardResolutionScreen from '../screens/campaign/RewardResolutionScreen';
import CampaignArchiveScreen from '../screens/campaign/CampaignArchiveScreen';
import type { CompanionStackParamList } from './types';

const Stack = createNativeStackNavigator<CompanionStackParamList>();

export default function CompanionTabNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CompanionScreen" component={CompanionScreen} />
      <Stack.Screen
        name="CompanionSelect"
        component={CompanionSelectScreen}
        options={{
          headerShown: true,
          title: 'My Companion',
          headerBackTitle: 'Companion',
        }}
      />
      <Stack.Screen
        name="ExpeditionScreen"
        component={ExpeditionScreen}
        options={{
          headerShown: true,
          title: 'Expeditions',
          headerBackTitle: 'Companion',
        }}
      />
      <Stack.Screen
        name="ShopScreen"
        component={ShopScreen}
        options={{
          headerShown: true,
          title: 'Shop',
          headerBackTitle: 'Companion',
        }}
      />
      <Stack.Screen
        name="TownScreen"
        component={TownScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdventureMapScreen"
        component={AdventureMapScreen}
        options={{ headerShown: false }}
      />

      {/* Campaign screens */}
      <Stack.Screen
        name="CampaignSelectScreen"
        component={CampaignSelectScreen}
        options={{ headerShown: true, title: 'Campaigns', headerBackTitle: 'Companion' }}
      />
      <Stack.Screen
        name="CampaignHubScreen"
        component={CampaignHubScreen}
        options={{ headerShown: true, title: 'Campaign', headerBackTitle: 'Campaigns' }}
      />
      <Stack.Screen
        name="ClassPickerScreen"
        component={ClassPickerScreen}
        options={{ headerShown: true, title: 'Choose Class', headerBackTitle: 'Campaign' }}
      />
      <Stack.Screen
        name="StatAllocationScreen"
        component={StatAllocationScreen}
        options={{ headerShown: true, title: 'Allocate Stats', headerBackTitle: 'Campaign' }}
      />
      <Stack.Screen
        name="RosterScreen"
        component={RosterScreen}
        options={{ headerShown: true, title: 'Party Roster', headerBackTitle: 'Campaign' }}
      />
      <Stack.Screen
        name="GearScreen"
        component={GearScreen}
        options={{ headerShown: true, title: 'Gear', headerBackTitle: 'Campaign' }}
      />
      <Stack.Screen
        name="BattleScreen"
        component={BattleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuestBoardScreen"
        component={QuestBoardScreen}
        options={{ headerShown: true, title: 'Quest Board', headerBackTitle: 'Campaign' }}
      />
      <Stack.Screen
        name="QuestPrepScreen"
        component={QuestPrepScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RewardResolutionScreen"
        component={RewardResolutionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CampaignArchiveScreen"
        component={CampaignArchiveScreen}
        options={{ headerShown: true, title: 'Campaign Archive', headerBackTitle: 'Campaign' }}
      />
    </Stack.Navigator>
  );
}
