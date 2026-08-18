import React, { useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Home, Dumbbell, Users, Utensils, Plus, X, Award, TrendingUp, User, Calendar } from 'lucide-react-native';
import { colors, radius } from '../theme/colors';
import { Typography } from '../components/ui/Typography';

import HomeScreenContainer from '../screens/HomeScreenContainer';
import WorkoutsStack from './WorkoutsStack';
import NutritionScreen from '../screens/NutritionScreen';
import ProgressAnalyticsScreen from '../screens/ProgressAnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CommunityStack from './CommunityStack';
import DuoStack from './DuoStack';
import GroupWorkoutLobbyScreen from '../screens/GroupWorkoutLobbyScreen';
import GroupWorkoutScreen from '../screens/GroupWorkoutScreen';

export const navigationRef = createNavigationContainerRef<any>();

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: 'rgba(18, 21, 23, 0.95)',
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

const FloatingActionMenu = ({ visible, onClose, navigation }: { visible: boolean, onClose: () => void, navigation: any }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.fabMenuContainer}>
          <View style={styles.fabMenuHeader}>
            <Typography variant="captionSmall" color={colors.textMuted}>Quick Actions Hub</Typography>
            <TouchableOpacity onPress={onClose}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* 1. Live Duo Workout */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              onClose();
              navigation.navigate('Community');
            }}
          >
            <View style={[styles.fabIconBox, { backgroundColor: '#1a2b23' }]}>
              <Dumbbell size={16} color={colors.primary} />
            </View>
            <View>
              <Typography variant="captionSmall" color={colors.text}>Start Duo / Group Workout</Typography>
              <Typography style={{ fontSize: 10, color: colors.textMuted }}>Invite partners via Spaces / Friends</Typography>
            </View>
          </TouchableOpacity>

          {/* 2. AI Food & Nutrition Logger */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              onClose();
              navigation.navigate('Nutrition');
            }}
          >
            <View style={[styles.fabIconBox, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
              <Utensils size={16} color={colors.warning} />
            </View>
            <View>
              <Typography variant="captionSmall" color={colors.text}>AI Food & Macro Logger</Typography>
              <Typography style={{ fontSize: 10, color: colors.textMuted }}>Natural language meal recognition</Typography>
            </View>
          </TouchableOpacity>

          {/* 3. Friends & Live Gym */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              onClose();
              navigation.navigate('Community');
            }}
          >
            <View style={[styles.fabIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
              <Users size={16} color="#06b6d4" />
            </View>
            <View>
              <Typography variant="captionSmall" color={colors.text}>Friends & Live Spaces</Typography>
              <Typography style={{ fontSize: 10, color: colors.textMuted }}>Who's training now & requests</Typography>
            </View>
          </TouchableOpacity>

          {/* 4. Body Analytics */}
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              onClose();
              navigation?.navigate('Progress');
            }}
          >
            <View style={[styles.fabIconBox, { backgroundColor: '#1f262b' }]}>
              <TrendingUp size={16} color={colors.primary} />
            </View>
            <View>
              <Typography variant="captionSmall" color={colors.text}>Progress & Body Analytics</Typography>
              <Typography style={{ fontSize: 10, color: colors.textMuted }}>Weight graph, volume & measurements</Typography>
            </View>
          </TouchableOpacity>

        </View>
      </TouchableOpacity>
    </Modal>
  );
};

function MainTabs() {
  const [showFab, setShowFab] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreenContainer} 
          options={{
            tabBarIcon: ({ color }) => <Home size={20} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Workouts" 
          component={WorkoutsStack} 
          options={{
            tabBarIcon: ({ color }) => <Dumbbell size={20} color={color} />,
          }}
        />

        {/* Custom Middle Button */}
        <Tab.Screen 
          name="Action" 
          component={View} 
          options={{
            tabBarButton: () => (
              <View style={styles.fabContainer}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  style={styles.fabButton}
                  onPress={() => setShowFab(true)}
                >
                  <Plus size={24} color={colors.bg} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        <Tab.Screen 
          name="Community" 
          component={CommunityStack} 
          options={{
            tabBarIcon: ({ color }) => <Users size={20} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Me" 
          component={ProfileScreen} 
          options={{
            tabBarIcon: ({ color }) => <User size={20} color={color} />,
          }}
        />
      </Tab.Navigator>

      <FloatingActionMenu visible={showFab} onClose={() => setShowFab(false)} navigation={navigationRef} />
    </View>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        
        {/* Full-screen / Modal flow screens */}
        <RootStack.Screen name="Nutrition" component={NutritionScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="Progress" component={ProgressAnalyticsScreen} options={{ presentation: 'modal' }} />
        
        {/* Duo Workout Stack */}
        <RootStack.Screen name="DuoStack" component={DuoStack} options={{ presentation: 'modal' }} />
        {/* Direct entries for Duo flow since navigating to single screens in stack can be handy */}
        <RootStack.Screen name="DuoLobby" component={DuoStack} />
        <RootStack.Screen name="DuoInvite" component={DuoStack} />
        <RootStack.Screen name="DuoWorkout" component={DuoStack} />
        <RootStack.Screen name="DuoComplete" component={DuoStack} />
        
        {/* Group Workout Screens */}
        <RootStack.Screen name="GroupLobby" component={GroupWorkoutLobbyScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="GroupWorkout" component={GroupWorkoutScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(18, 21, 23, 0.95)',
    borderTopColor: colors.border,
    position: 'absolute',
    bottom: 0,
    elevation: 0,
    borderTopWidth: 1,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
  },
  fabMenuContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#171b1f',
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 80,
    borderWidth: 1,
    borderColor: '#2c343c',
  },
  fabMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2c343c',
    marginBottom: 8,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: '#121517',
    marginBottom: 8,
  },
  fabIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  }
});
