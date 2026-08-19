export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

export function calculateBMR(gender: string, weightKg: number, heightCm: number, age: number): number {
  // Mifflin-St Jeor Equation
  // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
  // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
  const isMale = gender.toLowerCase() === 'male' || gender.toLowerCase() === 'm';
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return isMale ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

type GoalFeasibility = 'reasonable' | 'aggressive' | 'highly_aggressive';

export function validateGoalFeasibility(
  startWeight: number,
  targetWeight: number,
  days: number,
): { feasibility: GoalFeasibility; recommendedDays: number } {
  const weightChange = Math.abs(startWeight - targetWeight);
  const weeks = days / 7;
  const ratePerWeek = weightChange / weeks;
  
  // 1% body weight per week heuristic
  const maxReasonableRate = startWeight * 0.01;
  
  let feasibility: GoalFeasibility = 'reasonable';
  if (ratePerWeek > maxReasonableRate * 1.5) {
    feasibility = 'highly_aggressive';
  } else if (ratePerWeek > maxReasonableRate) {
    feasibility = 'aggressive';
  }
  
  const recommendedWeeks = weightChange / maxReasonableRate;
  
  return {
    feasibility,
    recommendedDays: Math.ceil(recommendedWeeks * 7),
  };
}

export interface CalorieRecommendation {
  calories: number | null;
  status: 'recommended' | 'aggressive' | 'unsafe';
  warning?: string;
}

export function generateCalorieRecommendation(
  tdee: number,
  startWeight: number,
  targetWeight: number,
  days: number,
): CalorieRecommendation {
  const isLoss = targetWeight < startWeight;
  const weightChange = Math.abs(startWeight - targetWeight);
  
  // Basic heuristic: 7700 calories per kg
  const totalCalorieDeficitOrSurplus = weightChange * 7700;
  const dailyDifference = totalCalorieDeficitOrSurplus / days;
  
  const targetCalories = isLoss ? tdee - dailyDifference : tdee + dailyDifference;
  
  // Safety checks (e.g., minimum calories for health)
  const MIN_CALORIES = 1200;
  
  if (isLoss && targetCalories < MIN_CALORIES) {
    return {
      calories: null,
      status: 'unsafe',
      warning: "This target would require an excessively aggressive energy deficit. We won't recommend an extreme intake to force the timeline.",
    };
  }
  
  const { feasibility } = validateGoalFeasibility(startWeight, targetWeight, days);
  
  return {
    calories: Math.round(targetCalories),
    status: feasibility === 'highly_aggressive' ? 'unsafe' : feasibility === 'aggressive' ? 'aggressive' : 'recommended',
    warning: feasibility === 'highly_aggressive' ? "This target is highly aggressive. Consider a slower rate." : undefined,
  };
}
