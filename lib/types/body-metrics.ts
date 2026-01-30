// Body metrics types for tracking client measurements and progress

export interface BodyMetric {
  id: string;
  client_id: string;
  trainer_id: string | null;
  recorded_by: string;
  recorded_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  muscle_mass_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  arm_left_cm: number | null;
  arm_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  resting_heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  notes: string | null;
  photo_urls: string[];
  created_at: string;
}

export interface ClientProgress {
  client_id: string;
  latest_weight: number | null;
  latest_body_fat: number | null;
  active_goals: number;
  achieved_goals: number;
  last_measurement_date: string | null;
}

export interface CreateBodyMetricInput {
  recorded_at?: string;
  weight_kg?: number;
  body_fat_percent?: number;
  muscle_mass_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  arm_left_cm?: number;
  arm_right_cm?: number;
  thigh_left_cm?: number;
  thigh_right_cm?: number;
  resting_heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  notes?: string;
  photo_urls?: string[];
}

export interface UpdateBodyMetricInput extends CreateBodyMetricInput {}

export interface MetricsListParams {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}
