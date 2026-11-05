export type OrderSummary = {
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  subtotal: number;
  /** Coupon discount (0 when none). */
  discount: number;
  couponCode: string | null;
  shipping: number;
  total: number;
  items: { productName: string; variantName: string; unitPrice: number; quantity: number }[];
};
