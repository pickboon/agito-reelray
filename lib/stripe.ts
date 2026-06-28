import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return stripeClient;
}

export const PLANS = {
  free: { name: "Free", credits: 1000, price: 0 },
  starter: { name: "Starter", credits: 20000, price: 149 },
  pro: { name: "Pro", credits: 80000, price: 499 },
  studio: { name: "Studio", credits: 300000, price: 1499 },
} as const;

export const BUNDLES = {
  small: { name: "Small", credits: 45000, price: 500 },
  medium: { name: "Medium", credits: 200000, price: 2000 },
  large: { name: "Large", credits: 600000, price: 5000 },
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
