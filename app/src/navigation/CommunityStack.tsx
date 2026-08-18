import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityScreen from '../screens/CommunityScreen';
import CommunityDetailScreen from '../screens/CommunityDetailScreen';
import CommunityDiscoverScreen from '../screens/CommunityDiscoverScreen';
import CommunityCreateScreen from '../screens/CommunityCreateScreen';

const Stack = createNativeStackNavigator();

export default function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityHome" component={CommunityScreen} />
      <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
      <Stack.Screen name="CommunityDiscover" component={CommunityDiscoverScreen} />
      <Stack.Screen name="CommunityCreate" component={CommunityCreateScreen} />
    </Stack.Navigator>
  );
}
