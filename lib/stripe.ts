import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing env: STRIPE_SECRET_KEY");
    stripeClient = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia" as any,
    });
  }
  return stripeClient;
}

// 价格单位：USD，与 Stripe 配置的 Price 保持一致
export const PLANS = {
  free: { name: "Free", credits: 1000, price: 0 },
  starter: { name: "Starter", credits: 20000, price: 22 },
  pro: { name: "Pro", credits: 80000, price: 44 },
  studio: { name: "Studio", credits: 300000, price: 221 },
} as const;

export const BUNDLES = {
  small: { name: "Small", credits: 45000, price: 74 },
  medium: { name: "Medium", credits: 200000, price: 148 },
  large: { name: "Large", credits: 600000, price: 296 },
} as const;

export const CREDIT_COSTS = {
  "t2v-720p": 10000,
  "t2v-1080p": 15000,
  "r2v-720p": 10000,
  "r2v-1080p": 15000,
  "character-ref": 50,
  "dub-per-lang": 500,
  "quality-score": 1,
  "assistant": 0.5,
} as const;
