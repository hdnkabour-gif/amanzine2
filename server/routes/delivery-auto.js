'use strict';
const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');

// POST /api/delivery-auto/:orderId — execute URL automation recipe
router.post('/:orderId', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });

    const providers = (await db.getDeliveryProviders(req.user.id)).filter(p => p.enabled && p.apiType === 'url-recipe');
    if (!providers.length) return res.status(400).json({ error: 'No URL automation provider configured' });

    const prov = providers[0];
    let recipe;
    try { recipe = JSON.parse(prov.webhookUrl || '{}'); } catch { return res.status(400).json({ error: 'Invalid recipe JSON' }); }

    // Try Puppeteer if available
    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();

      // 1. Login
      if (recipe.loginUrl && recipe.usernameSelector && recipe.passwordSelector) {
        await page.goto(recipe.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.type(recipe.usernameSelector, recipe.username || '');
        await page.type(recipe.passwordSelector, recipe.password || '');
        if (recipe.loginSubmit) await page.click(recipe.loginSubmit);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      }

      // 2. Navigate to create order page
      if (recipe.createOrderUrl) {
        await page.goto(recipe.createOrderUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      }

      // 3. Fill fields
      const fieldValues = {
        recipientName: order.customerName,
        phone: order.customerPhone,
        city: order.city,
        address: order.address,
        cod: String(order.total),
        notes: order.notes || '',
      };

      for (const [key, selector] of Object.entries(recipe.fields || {})) {
        if (!selector || !fieldValues[key]) continue;
        try {
          const tagName = await page.$eval(selector, el => el.tagName.toLowerCase()).catch(() => 'input');
          if (tagName === 'select') {
            await page.select(selector, fieldValues[key]);
          } else {
            await page.click(selector, { clickCount: 3 });
            await page.type(selector, fieldValues[key]);
          }
        } catch {}
      }

      // 4. Submit
      if (recipe.submitSelector) {
        await page.click(recipe.submitSelector);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      }

      // 5. Extract tracking
      let tracking = 'TRK-' + require('crypto').randomBytes(3).toString('hex').toUpperCase();
      if (recipe.trackingSelector) {
        try {
          const text = await page.$eval(recipe.trackingSelector, el => el.textContent || '');
          if (text.trim()) tracking = text.trim();
        } catch {}
      }

      await browser.close();

      await db.updateOrder(order.id, { status: 'processing', trackingNumber: tracking, deliveryProvider: prov.name });
      await db.addLog({ userId: req.user.id, user: 'System', action: `URL automation delivery: ${order.id}`, details: tracking, type: 'delivery', severity: 'success' });
      return res.json({ success: true, tracking, provider: prov.name, real: true, method: 'puppeteer' });

    } catch (puppeteerError) {
      // Puppeteer not available — return manual assist data
      // لا رقمَ مُفبرك: `trackingNumber` يعني رقمًا جاء من شركةِ توصيل، لا غير.
      await db.updateOrder(order.id, {
        status: 'processing', deliveryProvider: prov.name,
        deliveryStatus: 'manual_required', trackingNumber: '',
      });
      await db.addLog({ userId: req.user.id, user: 'System', action: `Manual delivery assist: ${order.id}`, details: `Open ${recipe.createOrderUrl || prov.websiteUrl}`, type: 'delivery', severity: 'info' });

      return res.json({
        success: true,
        tracking: '',
        needsManual: true,
        provider: prov.name,
        real: false,
        method: 'manual-assist',
        manualData: {
          loginUrl: recipe.loginUrl,
          createOrderUrl: recipe.createOrderUrl || prov.websiteUrl,
          fields: {
            'اسم الزبون': order.customerName,
            'هاتف الزبون': order.customerPhone,
            'المدينة': order.city,
            'العنوان': order.address,
            'مبلغ COD': String(order.total),
            'ملاحظات': order.notes || '',
          }
        }
      });
    }
  } catch (e) { console.error('[delivery-auto]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
