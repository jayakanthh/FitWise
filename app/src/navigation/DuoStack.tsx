import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DuoInviteScreen from '../screens/DuoInviteScreen';
import DuoLobbyScreen from '../screens/DuoLobbyScreen';
import DuoWorkoutScreen from '../screens/DuoWorkoutScreen';
import DuoCompleteScreen from '../screens/DuoCompleteScreen';

const Stack = createNativeStackNavigator();

export default function DuoStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DuoLobby" component={DuoLobbyScreen} />
      <Stack.Screen name="DuoInvite" component={DuoInviteScreen} />
      <Stack.Screen name="DuoWorkout" component={DuoWorkoutScreen} />
      <Stack.Screen name="DuoComplete" component={DuoCompleteScreen} />
    </Stack.Navigator>
  );
}
