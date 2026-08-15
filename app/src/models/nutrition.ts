/** Daily calorie & macro targets derived from the user's goal. (Phase 3) */
export interface NutritionTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** One logged food entry. (Phase 3) */
export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: number;
}
