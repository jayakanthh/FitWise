export type MeasurementType =
  | 'weight'
  | 'height'
  | 'waist'
  | 'chest'
  | 'bicep'
  | 'tricep'
  | 'thigh'
  | 'hips'
  | 'neck'
  | 'calf'
  | 'forearm'
  | 'body_fat';

export interface MeasurementEntry {
  id: string;
  userId: string;
  type: MeasurementType;
  value: number;
  unit: string;
  recordedAt: number; // timestamp
  createdAt: number; // timestamp
}

export type MeasurementGoalType = 'lose_weight' | 'gain_weight' | 'maintain_weight';

export type MeasurementGoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface MeasurementGoal {
  id: string;
  userId: string;
  type: MeasurementGoalType;
  measurementType: MeasurementType;
  startValue: number;
  targetValue: number;
  unit: string;
  startDate: number; // timestamp
  targetDate: number; // timestamp
  status: MeasurementGoalStatus;
  createdAt: number;
  updatedAt: number;
}
