import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import PlanBuilderScreen from '../screens/PlanBuilderScreen';

const Stack = createNativeStackNavigator();

/** Workouts tab as a stack so "Create" can push the full-screen plan builder. */
export default function WorkoutsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkoutsHome" component={WorkoutsScreen} />
      <Stack.Screen
        name="PlanBuilder"
        component={PlanBuilderScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
