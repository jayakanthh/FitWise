import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import PlanBuilderScreen from '../screens/PlanBuilderScreen';
import AdoptPlanScreen from '../screens/AdoptPlanScreen';
import LogWorkoutScreen from '../screens/LogWorkoutScreen';
import ProgressAnalyticsScreen from '../screens/ProgressAnalyticsScreen';

const Stack = createNativeStackNavigator();

/** Workouts tab as a stack so "Create"/"Adopt" can push full-screen flows. */
export default function WorkoutsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkoutsHome" component={WorkoutsScreen} />
      <Stack.Screen
        name="PlanBuilder"
        component={PlanBuilderScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AdoptPlan"
        component={AdoptPlanScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="LogWorkout"
        component={LogWorkoutScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ProgressAnalytics"
        component={ProgressAnalyticsScreen}
      />
    </Stack.Navigator>
  );
}
