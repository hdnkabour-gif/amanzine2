// AMANZINE live STAGING operational smoke. Non-production, disposable QA fixtures only.
// GitHub Actions executes this from a trusted same-repo audit branch; no credentials.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = (process.env.AMZ_LIVE_BASE || 'https://triumphant-courage-staging.up.railway.app').replace(/\/$/, '');
if (BASE !== 'https://triumphant-courage-staging.up.railway.app') {
  throw new Error('Refusing to audit an unapproved host. Never target Production.');
}
const tag = (process.env.GITHUB_RUN_ID || String(Date.now())) + '-' + randomBytes(4).toString('hex');
const checks = [];
const runAt = new Date().toISOString();
let A = null;
let B = null;
let productId = null;
let customerId = null;
let orderId = null;
let browser = null;
const browserNotes = [];
function ensure(test, message) { if (!test) throw new Error(message); }
async function check(name, task, category = 'functional') {
  const start = Date.now();
  try {
    const detail = await task();
    checks.push({ name, category, status: 'PASS', ms: Date.now() - start, detail: detail || '' });
    console.log('PASS', name);
  } catch (e) {
    const error = String(e && e.message || e).slice(0, 240);
    checks.push({ name, category, status: 'FAIL', ms: Date.now() - start, error });
    console.log('FAIL', name, '-', error);
  }
}
async function req(path, opts = {}) {
  const headers = { Accept: 'application/json', ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}) };
  if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
  if (opts.key) headers['Idempotency-Key'] = opts.key;
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw.slice(0, 300); }
  return { status: res.status, data, type: res.headers.get('content-type') || '' };
}
function status(r, code, hint) {
  ensure(r.status === code, hint + ': HTTP ' + r.status + ' expected ' + code + ' (no request body or secrets logged)');
}
function isId(x) { return typeof x === 'string' && x.length >= 8; }
async function register(suffix) {
  const email = 'amz-qa-' + tag + '-' + suffix + '@example.invalid';
  const password = 'QA-' + randomBytes(18).toString('hex') + '!';
  const r = await req('/api/auth/register', { method: 'POST', body: {
    name: 'AMANZINE QA ' + suffix, email, password, storeName: 'QA AUDIT ' + suffix,
  }});
  status(r, 201, 'register ' + suffix);
  ensure(r.data && r.data.token && r.data.user && r.data.user.id, 'registration missing user/token');
  return { user: r.data.user, token: r.data.token, refresh: r.data.refreshToken, email, password };
}
async function main() {
  await check('Health + DB migration', async () => {
    const r = await req('/api/health');
    status(r, 200, 'health');
    ensure(r.data.status === 'ok', 'health is not ok');
    ensure(r.data.migration && r.data.migration.ok === true, 'migration is not confirmed healthy');
    return 'version=' + r.data.version + ' env=' + r.data.env;
  });
  await check('Auth configuration public', async () => {
    const r = await req('/api/auth/config'); status(r, 200, 'auth config');
    ensure(r.data && typeof r.data.google === 'boolean', 'config contract mismatch');
  });
  await check('Marketplace stats and public catalog', async () => {
    const x = await req('/api/listings/public/stats'); status(x, 200, 'stats');
    const y = await req('/api/listings/public/catalog'); status(y, 200, 'public catalog');
    ensure(y.data && Array.isArray(y.data.listings), 'catalog missing listings array');
  });
  await check('Payment methods report external adapters honestly', async () => {
    const r = await req('/api/payment/methods'); status(r, 200, 'methods');
    ensure(Array.isArray(r.data.methods), 'methods must be array');
    for (const p of ['cmi', 'stripe', 'paypal']) {
      const m = r.data.methods.find(x => x.provider === p);
      ensure(m && m.available !== true && m.implemented === false, p + ' must be marked unimplemented');
    }
  });
  await check('Marketplace phone OTP configuration', async () => {
    const r = await req('/api/listings/otp/config'); status(r, 200, 'otp configuration');
    ensure(typeof r.data.enabled === 'boolean', 'otp enabled must be boolean');
    return 'enabled=' + r.data.enabled;
  });
  await check('Protected endpoints reject anonymous requests', async () => {
    for (const p of ['/api/auth/me', '/api/products', '/api/orders', '/api/health/readiness']) {
      const r = await req(p);
      status(r, 401, p);
    }
  });
  await check('Register disposable merchant A', async () => { A = await register('A'); return 'QA-only account created'; });
  await check('Register disposable merchant B (tenant isolation fixture)', async () => { B = await register('B'); return 'QA-only account created'; });
  if (A) {
    await check('Login with QA account and read /me', async () => {
      const login = await req('/api/auth/login', { method: 'POST', body: { email: A.email, password: A.password } });
      status(login, 200, 'login');
      ensure(login.data.user && login.data.user.id === A.user.id, 'login identity mismatch');
      const me = await req('/api/auth/me', { token: A.token });
      status(me, 200, 'me');
      ensure(me.data.user && me.data.user.id === A.user.id, 'me identity mismatch');
    });
    await check('Merchant settings, wallet, orders and customers are DB-backed', async () => {
      for (const p of ['/api/settings', '/api/wallet', '/api/orders', '/api/products', '/api/payment']) {
        const r = await req(p, { token: A.token }); status(r, 200, p);
      }
      const c = await req('/api/customers', { token: A.token }); status(c, 200, 'customers');
      ensure(c.data && Array.isArray(c.data.data), 'customers pagination contract');
    });
    await check('Create test product in STAGING only', async () => {
      const r = await req('/api/products', { method: 'POST', token: A.token, body: {
        name: 'QA-AUDIT-' + tag, type: 'product', status: 'published', price: 125,
        cost: 70, stock: 5, category: 'Audit-Test', description: 'Disposable quality-assurance fixture',
      }});
      status(r, 201, 'create product');
      ensure(isId(r.data.id), 'created product has no ID');
      productId = r.data.id;
    });
    if (productId) {
      await check('Product persists and can be updated', async () => {
        let r = await req('/api/products/' + encodeURIComponent(productId), { token: A.token });
        status(r, 200, 'get product');
        ensure(+r.data.price === 125, 'original price mismatch');
        r = await req('/api/products/' + encodeURIComponent(productId), { method: 'PUT', token: A.token, body: { price: 135 } });
        status(r, 200, 'update product');
        r = await req('/api/products/' + encodeURIComponent(productId), { token: A.token });
        status(r, 200, 'reload product');
        ensure(+r.data.price === 135, 'price update was not persisted');
      });
      if (B) await check('Tenant B cannot view or change tenant A product', async () => {
        let r = await req('/api/products/' + encodeURIComponent(productId), { token: B.token });
        status(r, 404, 'cross-tenant product read');
        r = await req('/api/products/' + encodeURIComponent(productId), {
          method: 'PUT', token: B.token, body: { price: 999 },
        });
        status(r, 404, 'cross-tenant product write');
        const original = await req('/api/products/' + encodeURIComponent(productId), { token: A.token });
        status(original, 200, 'original product after denied edit');
        ensure(+original.data.price === 135, 'cross-tenant mutation changed another merchant product');
      });
      await check('Public catalog shows published QA product', async () => {
        const r = await req('/api/products/public/catalog?userId=' + encodeURIComponent(A.user.id));
        status(r, 200, 'public product catalog');
        ensure(Array.isArray(r.data.products) && r.data.products.some(p => p.id === productId), 'QA product missing from catalog');
      });
      await check('Create order with one item (no external delivery or payment)', async () => {
        const r = await req('/api/orders', { method: 'POST', token: A.token, key: 'audit-' + tag,
          body: { customerName: 'QA Dummy Buyer', customerPhone: '0600000000', city: 'QA test',
            items: [{ productId, productName: 'QA-AUDIT-' + tag, quantity: 1, price: 135 }], total: 135, source: 'QA-AUDIT' } });
        status(r, 201, 'create order');
        ensure(isId(r.data.id), 'created order has no ID');
        orderId = r.data.id;
      });
      if (orderId) {
        await check('Duplicate order idempotency key replays original order', async () => {
          const r = await req('/api/orders', { method: 'POST', token: A.token, key: 'audit-' + tag,
            body: { customerName: 'QA Dummy Buyer', customerPhone: '0600000000', city: 'QA test',
              items: [{ productId, productName: 'QA-AUDIT-' + tag, quantity: 1, price: 135 }], total: 135, source: 'QA-AUDIT' } });
          ensure([200, 201].includes(r.status), 'idempotency request refused: ' + r.status);
          ensure(r.data.id === orderId, 'duplicate produced another order id');
        });
        if (B) await check('Tenant B cannot access tenant A order', async () => {
          const r = await req('/api/orders/' + encodeURIComponent(orderId), { token: B.token });
          status(r, 404, 'cross-tenant order');
        });
        await check('Public phone lookup must not disclose order line items without proof', async () => {
          const r = await req('/api/orders/track/0600000000?userId=' + encodeURIComponent(A.user.id));
          if (r.status === 200 && Array.isArray(r.data) && r.data.some(o => o.id === orderId && Array.isArray(o.items) && o.items.length)) {
            throw new Error('CONFIRMED PRIVACY RISK: anonymous phone lookup discloses QA order items');
          }
          ensure([401, 403, 404, 200].includes(r.status), 'unexpected phone tracking status ' + r.status);
        }, 'security');
      }
    }
    await check('Create and retrieve QA customer', async () => {
      const r = await req('/api/customers', { method: 'POST', token: A.token,
        body: { name: 'QA Customer ' + tag, phone: '0500000000', city: 'QA test' } });
      status(r, 201, 'create customer');
      ensure(isId(r.data.id), 'new customer missing id');
      customerId = r.data.id;
      const read = await req('/api/customers/' + encodeURIComponent(customerId), { token: A.token });
      status(read, 200, 'read customer');
    });
    if (B && customerId) await check('Cross-tenant customer cannot be read', async () => {
      const r = await req('/api/customers/' + encodeURIComponent(customerId), { token: B.token });
      status(r, 404, 'cross tenant customer');
    });
  }
  await check('Public SPA renders actual Chromium interface', async () => {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, locale: 'ar-MA' });
    const page = await context.newPage();
    page.on('pageerror', err => browserNotes.push(String(err.message || err).slice(0, 160)));
    for (const path of ['/', '/market', '/explore', '/login']) {
      const response = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
      ensure(response && response.status() === 200, 'bad SPA route ' + path + ': ' + (response && response.status()));
      await page.waitForTimeout(700);
      const found = await page.locator('body').innerText();
      ensure(found.trim().length >= 20, 'empty visual content on ' + path);
      browserNotes.push('SPA:' + path + ':chars=' + found.trim().length);
    }
    if (A) {
      await context.addCookies([
        { name: 'token', value: A.token, url: BASE, httpOnly: true, secure: true, sameSite: 'Lax' },
        { name: 'refreshToken', value: A.refresh, url: BASE, httpOnly: true, secure: true, sameSite: 'Lax' },
      ]);
      await page.addInitScript(user => { localStorage.setItem('ai_commerce_user', JSON.stringify(user)); }, A.user);
      for (const path of ['/home', '/dashboard', '/products', '/orders', '/customers']) {
        const response = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 25000 });
        ensure(response && response.status() === 200, 'bad merchant route ' + path);
        await page.waitForTimeout(900);
        const body = await page.locator('body').innerText();
        ensure(body.trim().length >= 20, 'empty merchant page ' + path);
        browserNotes.push('MERCHANT:' + path + ':chars=' + body.trim().length);
      }
    }
    await page.screenshot({ path: 'tmp/staging-browser-last-page.png', fullPage: false });
    ensure(browserNotes.filter(x => !x.startsWith('SPA:') && !x.startsWith('MERCHANT:')).length === 0,
      'Browser JavaScript errors: ' + browserNotes.filter(x => !x.startsWith('SPA:') && !x.startsWith('MERCHANT:')).slice(0, 3).join(' | '));
    await context.close();
  }, 'browser');
  if (A && customerId) await check('Cleanup disposable QA customer', async () => {
    const r = await req('/api/customers/' + encodeURIComponent(customerId), { method: 'DELETE', token: A.token });
    status(r, 200, 'customer delete');
    customerId = null;
  }, 'cleanup');
  if (A && productId) await check('Cleanup disposable QA product', async () => {
    const r = await req('/api/products/' + encodeURIComponent(productId), { method: 'DELETE', token: A.token });
    status(r, 200, 'product delete');
    productId = null;
  }, 'cleanup');
}
await mkdir('tmp', { recursive: true });
try { await main(); }
finally {
  if (browser) await browser.close().catch(() => {});
  // QA users and one QA order are retained for diagnosis; no existing user/data was touched.
  const report = {
    at: runAt, base: BASE, gitSha: process.env.GITHUB_SHA || '',
    checks, browserNotes, qaArtifacts: { usersCreated: [!!A, !!B].filter(Boolean).length,
      orderCreated: !!orderId, customerCleanupComplete: !customerId, productCleanupComplete: !productId },
    summary: { pass: checks.filter(x => x.status === 'PASS').length,
      fail: checks.filter(x => x.status === 'FAIL').length },
  };
  await writeFile('tmp/staging-audit-smoke.json', JSON.stringify(report, null, 2));
  console.log('Summary:', report.summary, 'report=tmp/staging-audit-smoke.json');
  if (report.summary.fail) process.exitCode = 1;
}
