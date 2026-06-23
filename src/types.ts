export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  referralCode: string;
  referredBy?: string; // ID of the referrer
  isAdmin?: boolean;
  password?: string;
  balance?: number;
}

export interface Plan {
  id: string;
  name: string;
  amount: number;
  return_amount: number;
  duration_days: number;
  active: boolean;
  description: string;
}

export type PurchaseStatus = 'active' | 'completed' | 'cancelled';

export interface Purchase {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  return_amount: number;
  profit: number;
  status: PurchaseStatus;
  created_at: string;
  matures_at: string;
  planName: string; // convenient lookup
}

export type TransactionType = 'deposit' | 'withdrawal' | 'purchase' | 'commission' | 'payout';
export type TransactionStatus = 'pending' | 'approved' | 'declined';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  phone?: string;
  note?: string;
  created_at: string;
}

export interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referred_username: string;
  bonus: number;
  created_at: string;
}

export interface WalletBalance {
  total_deposits: number;
  referral_bonus: number;
  total_commissions: number;
  total_withdrawals: number;
  total_buyed: number;
  available_balance: number;
}

export interface DashboardStats {
  balance: WalletBalance;
  active_orders_count: number;
  active_orders_funds: number;
  expected_commissions: number;
  completed_orders_count: number;
  total_profit_earned: number;
}
