// =======================================================
// Domain Types & DTOs for Maya Spirulina Platform
// =======================================================

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod = "ONLINE_GATEWAY" | "WALLET" | "HYBRID";
export type PaymentStatus = "UNPAID" | "PAID" | "FAILED";

export type WalletTxType = "CREDIT" | "DEBIT";
export type WalletTxReason =
  | "ORDER_PAYMENT"
  | "ORDER_REFUND"
  | "REFERRAL_COMMISSION"
  | "PURCHASE_CASHBACK"
  | "SETTLEMENT_PAYOUT"
  | "ADMIN_ADJUSTMENT";

export type PointType =
  | "SIGNUP_BONUS"
  | "PURCHASE_REWARD"
  | "REFERRAL_REWARD"
  | "REDEEMED"
  | "EXPIRED";

export type PointStatus = "PENDING" | "RELEASED" | "REVOKED";

export type SettlementStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export interface UserSession {
  id: string;
  phone: string;
  name: string | null;
  referralCode: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  price: number; // Toman
  quantity: number;
  image?: string;
  weightGrams?: number;
}

export interface CheckoutPayload {
  recipient: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  useWalletCredit: boolean;
  couponCode?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeBuyers: number;
  totalCommissionEarned: number; // Toman
  pendingCommission: number; // Toman
  walletBalance: number; // Toman
}
