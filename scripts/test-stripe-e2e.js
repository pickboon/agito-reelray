/**
 * Stripe 端到端测试脚本
 * 用法: node scripts/test-stripe-e2e.js
 *
 * 验证内容:
 * 1. 所有 Price ID 可检索且 active
 * 2. 订阅 checkout session 创建成功
 * 3. 充值包 checkout session 创建成功
 * 4. Webhook 端点状态
 */
const Stripe = require('stripe');

const SK = process.env.STRIPE_SECRET_KEY || 'sk_test_51TnG5w4XH7G5n47VGa7rvTT1UGncIGJa3hpGsh9wYQcye337R6t0ZHqTQzVgNGuXtv2ZeQpRX64GrpRUeSpStKlP00mRLJhp7H';
const stripe = new Stripe(SK);

const PRICE_IDS = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_1TnGAP4XH7G5n47V4EF7MTb9',
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_1TnGAw4XH7G5n47VKixHQoyQ',
  studio: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID || 'price_1TnGBL4XH7G5n47VaIGDErQv',
  small_bundle: process.env.NEXT_PUBLIC_STRIPE_SMALL_BUNDLE_PRICE_ID || 'price_1TnGBj4XH7G5n47VRMSQhdcj',
  medium_bundle: process.env.NEXT_PUBLIC_STRIPE_MEDIUM_BUNDLE_PRICE_ID || 'price_1TnGDb4XH7G5n47Vu1vpobfN',
  large_bundle: process.env.NEXT_PUBLIC_STRIPE_LARGE_BUNDLE_PRICE_ID || 'price_1TnGCa4XH7G5n47VHLErIGIT',
};

let passed = 0;
let failed = 0;

function ok(msg) { passed++; console.log('  PASS:', msg); }
function fail(msg) { failed++; console.log('  FAIL:', msg); }

(async () => {
  // ---- Test 1: Price ID 验证 ----
  console.log('\n[Test 1] Price ID 验证');
  const priceDetails = {};
  for (const [name, priceId] of Object.entries(PRICE_IDS)) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      const prod = await stripe.products.retrieve(typeof price.product === 'string' ? price.product : price.product.id);
      priceDetails[name] = { product: prod.name, amount: price.unit_amount / 100, currency: price.currency, type: price.type };
      ok(`${name}: ${prod.name} - $${price.unit_amount / 100} ${price.currency.toUpperCase()} (${price.type})`);
    } catch (e) {
      fail(`${name}: ${e.message}`);
    }
  }

  // ---- Test 2: 订阅 Checkout Session ----
  console.log('\n[Test 2] 订阅 Checkout Session (Starter)');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_IDS.starter, quantity: 1 }],
      success_url: 'http://localhost:3000/dashboard?upgraded=true',
      cancel_url: 'http://localhost:3000/pricing',
      metadata: { user_id: 'test-user-e2e', plan: 'starter' },
    });
    if (session.url && session.url.startsWith('https://checkout.stripe.com')) {
      ok(`URL 格式正确: ${session.url.substring(0, 60)}...`);
    } else {
      fail('URL 格式异常');
    }
    if (session.metadata?.user_id === 'test-user-e2e' && session.metadata?.plan === 'starter') {
      ok('Metadata 传递正确');
    } else {
      fail('Metadata 丢失或错误');
    }
    ok(`Session ID: ${session.id}`);
    // 清理: 过期 session (不主动 expire, Stripe 会自动处理)
  } catch (e) {
    fail(e.message);
  }

  // ---- Test 3: 充值包 Checkout Session ----
  console.log('\n[Test 3] 充值包 Checkout Session (Small/基础包)');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: PRICE_IDS.small_bundle, quantity: 1 }],
      success_url: 'http://localhost:3000/dashboard?bundle_purchased=true',
      cancel_url: 'http://localhost:3000/pricing',
      metadata: { user_id: 'test-user-e2e', bundle: 'small', credits: '45000' },
    });
    if (session.url && session.url.startsWith('https://checkout.stripe.com')) {
      ok(`URL 格式正确: ${session.url.substring(0, 60)}...`);
    } else {
      fail('URL 格式异常');
    }
    if (session.metadata?.bundle === 'small' && session.metadata?.credits === '45000') {
      ok('Metadata 传递正确 (bundle + credits)');
    } else {
      fail('Metadata 丢失或错误');
    }
    ok(`Session ID: ${session.id}`);
  } catch (e) {
    fail(e.message);
  }

  // ---- Test 4: Webhook 端点 ----
  console.log('\n[Test 4] Webhook 端点检查');
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    if (endpoints.data.length === 0) {
      console.log('  INFO: 暂无 webhook 端点配置');
      console.log('  使用 Stripe CLI 启动本地监听:');
      console.log('    stripe listen --forward-to localhost:3000/api/stripe/webhook');
      console.log('  将输出的 whsec_... 填入 .env.local 的 STRIPE_WEBHOOK_SECRET');
    } else {
      endpoints.data.forEach(ep => {
        ok(`Endpoint: ${ep.url} | Events: ${ep.enabled_events.join(', ')}`);
      });
    }
  } catch (e) {
    fail(e.message);
  }

  // ---- 汇总 ----
  console.log('\n============================');
  console.log(`结果: ${passed} passed, ${failed} failed`);
  console.log('============================\n');

  if (failed > 0) process.exit(1);
})();
