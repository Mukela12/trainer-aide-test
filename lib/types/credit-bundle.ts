export interface CreditBundle {
  id: string;
  name: string;
  credit_count: number;
  total_price: number;
  price_per_credit: number;
  expiry_days: number | null;
  is_active: boolean;
  owner_id: string;
  studio_id: string | null;
  created_at: string;
}
