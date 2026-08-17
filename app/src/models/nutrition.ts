/** Daily calorie & macro targets derived from the user's goal. (Phase 3) */
export interface NutritionTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

/** One logged food entry. (Phase 3) */
export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal?: Meal; // which meal it belongs to
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  createdAt: number;
}
