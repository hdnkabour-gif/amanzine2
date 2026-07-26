'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const aiQuota = require('../middleware/ai-quota'); // H-5
const https  = require('https');
const { db } = require('../database');

/* ══════════════════════════════════════════════
   PRODUCT SEARCH — by name, SKU, or description
   ══════════════════════════════════════════════ */
function searchProducts(query, products) {
  if (!query || !products?.length) return [];
  const q = query.toLowerCase().trim();
  const scored = products
    .filter(p => p.status === 'published' && p.stock > 0)
    .map(p => {
      let score = 0;
      const name = (p.name || '').toLowerCase();
      const sku  = (p.sku || p.id || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat  = (p.category || '').toLowerCase();
      if (sku === q || sku.includes(q)) score += 100;
      if (name === q) score += 90;
      if (name.startsWith(q)) score += 70;
      if (name.includes(q)) score += 50;
      if (desc.includes(q)) score += 20;
      if (cat.includes(q)) score += 15;
      return { ...p, _score: score };
    })
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score);
  return scored.slice(0, 3);
}

/* ══════════════════════════════════════════════
   ORDER DATA EXTRACTION from conversation
   ══════════════════════════════════════════════ */
function extractOrderData(history) {
  const text = (history || []).map(m => m.content).join('\n');
  const extracted = {};

  // Phone
  const phoneMatch = text.match(/(?:^|\s)(\+?212\d{9}|0[5-7]\d{8}|\+?[\d\s\-]{10,13})(?:\s|$)/m);
  if (phoneMatch) extracted.phone = phoneMatch[1].replace(/\s/g, '');

  // Moroccan cities
  const cities = ['الدار البيضاء','كازابلانكا','casablanca','الرباط','rabat','فاس','fes','مراكش','marrakech','طنجة','tanger','أكادير','agadir','مكناس','meknès','وجدة','oujda','تطوان','tetouan','القنيطرة','kenitra','سلا','sale','الجديدة','el jadida','بني ملال','beni mellal','خريبكة','khouribga','تازة','taza','الحسيمة','al hoceima','نادور','nador','برشيد','berrechid','سطات','settat'];
  for (const city of cities) {
    if (text.toLowerCase().includes(city.toLowerCase())) {
      extracted.city = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  // Name (simple heuristic: line after asking for name, or "اسمي X")
  const nameMatch = text.match(/(?:اسمي|اسم|my name is|je m'appelle)\s+([^\n،,.؟?]{3,30})/i);
  if (nameMatch) extracted.name = nameMatch[1].trim();

  // Size
  const sizeMatch = text.match(/(?:مقاس|taille|size)\s*:?\s*(XS|S|M|L|XL|XXL|XXXL|\d{2,3})/i);
  if (sizeMatch) extracted.size = sizeMatch[1].toUpperCase();

  // Color
  const colorMatch = text.match(/(?:لون|couleur|color)\s*:?\s*(أسود|أبيض|أحمر|أزرق|أخضر|رمادي|بيج|وردي|بني|كحلي|noir|blanc|rouge|bleu|black|white|red|blue)/i);
  if (colorMatch) extracted.color = colorMatch[1];

  return extracted;
}

/* ══════════════════════════════════════════════
   SMART LOCAL AI
   ══════════════════════════════════════════════ */
function smartReply(msg, history, products, settings) {
  const lo  = (msg || '').toLowerCase();
  const D   = settings?.ai?.language !== 'Arabic';
  const cur = settings?.brand?.currency || 'MAD';
  const pub = (products || []).filter(p => p.status === 'published' && p.stock > 0);
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  // Search by product name/sku in message
  const found = searchProducts(msg, products);
  if (found.length > 0 && /(عندكم|كاين|منتج|بغيت|طلب|سعر|ثمن|بكام|هاد)/i.test(lo)) {
    const p = found[0];
    const sizes = p.sizes?.join(' · ') || 'S M L XL';
    const colors = p.colors?.join(' · ') || '—';
    return D
      ? `وجدت المنتج! 🎉\n\n${p.emoji || '📦'} **${p.name}**\n💰 السعر: ${p.price} ${cur}\n📏 المقاسات: ${sizes}\n🎨 الألوان: ${colors}\n📦 المخزون: ${p.stock} قطعة\n\nواش بغيت هاد المنتج؟`
      : `وجدت المنتج:\n\n${p.emoji || '📦'} ${p.name}\n💰 ${p.price} ${cur}\n📏 ${sizes}\n🎨 ${colors}\n\nهل تريد الطلب؟`;
  }

  if (/(سلام|مرحبا|hello|salut|bonjour|هاي|hi\b|صباح|مساء)/i.test(lo))
    return D ? `مرحباً! 👋 كيداير؟ ${pub.length ? `عندنا ${pub.length} منتج متوفر دابا!` : 'مرحباً بك!'}\nواش بغيتي تشوف المنتجات أو تطلب شي محدد؟` : `مرحباً! 👋 يسعدني مساعدتك. ${pub.length ? `لدينا ${pub.length} منتج متوفر.` : ''}`;

  if (/(ثمن|سعر|بكام|prix|price|كم|combien|شحال)/i.test(lo)) {
    if (pub.length === 0) return D ? 'ما كاين منتجات منشورة دابا.' : 'لا منتجات متوفرة حالياً.';
    const p = rand(pub);
    return D
      ? `${p.emoji || '📦'} **${p.name}**\nالثمن: ${p.price} ${cur} 💎\nالتوصيل: 25-40 MAD\nواش بغيتيه؟ عطيني الاسم والمدينة 😊`
      : `${p.emoji || '📦'} ${p.name} — ${p.price} ${cur}`;
  }

  if (/(طلب|نطلب|bghit|commander|أبغى|شري|أطلب|اطلب)/i.test(lo))
    return D
      ? `ممتاز! 🎉 باش نكملو الطلب محتاجين:\n1️⃣ الاسم الكامل\n2️⃣ رقم الهاتف 📱\n3️⃣ المدينة والعنوان 🏠\n4️⃣ المقاس واللون\n\nأبدأ بالاسم الكامل 😊`
      : `رائع! 🎉 للطلب أحتاج: الاسم الكامل، رقم الهاتف، المدينة والعنوان، المقاس واللون.`;

  if (/(توصيل|livraison|delivery|يوصل|فين|wين)/i.test(lo))
    return D
      ? `التوصيل لجميع مدن المغرب 🇲🇦\n⏱️ 24-48 ساعة\n💰 20-40 MAD حسب المدينة:\n• كازا/الرباط: 20 MAD\n• فاس/مراكش/طنجة: 30 MAD\n• باقي المدن: 35-40 MAD\nواش بغيتي تطلب؟`
      : `نوصل لجميع المدن 🇲🇦 في 24-48 ساعة. السعر 20-40 MAD.`;

  if (/(غالي|cher|expensive|خصم|discount|نقص|تخفيض|رخص)/i.test(lo)) {
    const max = settings?.ai?.maxDiscount || 15;
    const d   = Math.round(max * 0.7);
    if (settings?.ai?.autoDiscount)
      return D ? `فاهمك! 😊 نقدر نعطيك خصم **${d}%** إذا طلبت أكثر من قطعة 🎁\nواش هاد العرض مناسب؟` : `يمكنني تقديم خصم ${d}% على الطلبات المتعددة.`;
    return D ? `الثمن مناسب جداً للجودة العالية 💎\nوعندنا ضمان كامل + توصيل سريع 🚚` : `السعر مناسب مع ضمان الجودة.`;
  }

  if (/(مقاس|تاي|taille|size|قياس)/i.test(lo)) {
    const sizes = settings?.products?.defaultSizes?.join(' · ') || 'S · M · L · XL · XXL';
    return D ? `المقاسات المتوفرة: **${sizes}** 📏\nأي مقاس مناسب ليك؟` : `المقاسات: ${sizes}`;
  }

  if (/(لون|ألوان|couleur|color|لونات)/i.test(lo)) {
    const colors = settings?.products?.defaultColors?.join(' · ') || 'أسود · أبيض · أحمر';
    return D ? `الألوان المتوفرة: **${colors}** 🎨\nأي لون تبغي؟` : `الألوان: ${colors}`;
  }

  if (/(تتبع|tracking|طلبي|وين طلبي|وصل|status)/i.test(lo))
    return D ? `باش تتبع طلبك:\n1️⃣ ابعث رقم هاتفك\n2️⃣ أو رقم الطلب\nنشوف ليك الحالة مباشرة 📦` : `لمتابعة طلبك أرسل رقم هاتفك.`;

  if (/^[\+\d\s\-]{8,15}$/.test(msg.replace(/\s/g, ''))) {
    const extracted = extractOrderData([...( history || []), { content: msg, role: 'customer' }]);
    if (extracted.city)
      return D ? `شكراً! 📱 لاحظت أنك من **${extracted.city}**.\nدابا عطيني العنوان بالتفصيل 🏠` : `شكراً! أعطني العنوان الكامل.`;
    return D ? `شكراً! 📱 دابا عطيني المدينة والعنوان 🏠` : `شكراً! أعطني المدينة والعنوان.`;
  }

  if (/(شكرا|merci|thanks|بارك الله|يسلمو)/i.test(lo))
    return D ? `العفو! 😊 واش كاين شي آخر نقدر نساعدك فيه؟` : `العفو! هل تحتاج شيئاً آخر؟`;

  const lastAI = [...(history || [])].reverse().find(m => m.role === 'ai');
  if (lastAI?.content?.includes('الاسم'))
    return D ? `مزيان ${msg}! 😊 دابا عطيني رقم الهاتف 📱` : `شكراً ${msg}! أعطني رقم هاتفك.`;

  const generics = D
    ? [`فاهمت! 😊 واش عندك سؤال آخر؟`, `أكيد! عندنا أحسن المنتجات 🔥 واش تبغي تشوف؟`, `دابا نشوف ليك! 😊 وصف أكثر باش نساعدك`]
    : [`بالتأكيد! 😊 كيف أساعدك؟`, `شكراً لتواصلك!`, `أنا هنا للمساعدة 😊`];
  return rand(generics);
}

/* ══════════════════════════════════════════════
   ROUTES
   ══════════════════════════════════════════════ */

// POST /api/ai/reply — main AI endpoint
router.post('/reply', auth, aiQuota, async (req, res) => {
  try {
    const { message, history, products, settings: reqSettings, systemPrompt } = req.body;

    const dbSettings  = await db.getSettings(req.user.id) || {};
    const openaiKey   = reqSettings?.ai?.apiKey   || dbSettings.ai?.apiKey   || process.env.OPENAI_API_KEY;
    const geminiKey   = reqSettings?.ai?.geminiKey || dbSettings.ai?.geminiKey || process.env.GEMINI_API_KEY;
    const provider    = reqSettings?.ai?.provider  || dbSettings.ai?.provider  || 'openai';
    const mergedSettings = { ...dbSettings, ...reqSettings, ai: { ...dbSettings.ai, ...reqSettings?.ai } };
    const brand = mergedSettings.brand || {};
    const delivery = mergedSettings.delivery || {};
    const cur = brand.currency || 'MAD';
    const allProds = (products || (await db.getProducts(req.user.id)) || []).slice(0, 30)
      .filter(p => p.status === 'published' && p.stock > 0)
      .map(p => `- ${p.emoji||'📦'} ${p.name}: ${p.price} ${cur}${(p.sizes||[]).length?` (${p.sizes.join('/')})`:''}`).join('\n');
    const autoSysPrompt = `أنت مساعد بيع ذكي لمتجر "${brand.name||'متجر مغربي'}". تتحدث بالدارجة المغربية بأسلوب ودود واحترافي.
معلومات المتجر:
• الهاتف: ${brand.phone||''}
• الوصف: ${brand.description||''}
• التوصيل: ${delivery.defaultCost||'20-40'} ${cur} — 24-48 ساعة لجميع مدن المغرب
• الدفع: ${delivery.paymentMethod||'عند الاستلام (COD)'}
المنتجات المتوفرة:
${allProds||'لا منتجات منشورة'}
قواعد: رد بالدارجة، كن مقنعاً، اطلب الاسم والهاتف والمدينة عند الطلب.`;
    const sysPrompt = systemPrompt || reqSettings?.ai?.systemPrompt || dbSettings.ai?.systemPrompt || autoSysPrompt;

    const temperature = reqSettings?.ai?.temperature || dbSettings.ai?.temperature || 0.7;
    const model       = reqSettings?.ai?.model       || dbSettings.ai?.model       || 'gpt-4o-mini';

    // الموجّه الموحد: المزود المفضل أولاً ثم البقية تلقائياً
    const keys = _resolveAIKeys(reqSettings?.ai, dbSettings.ai);
    const out = await aiChat({
      keys, provider,
      models: { openai: model, claude: dbSettings.ai?.claudeModel, grok: dbSettings.ai?.grokModel, mistral: dbSettings.ai?.mistralModel },
      sysPrompt, history, message, maxTokens: 400, temperature,
    });
    if (out) return res.json({ reply: out.text, model: out.provider });

    const allProducts = products || (await db.getProducts(req.user.id));
    const allSettings = reqSettings || dbSettings;
    res.json({ reply: smartReply(message, history, allProducts, allSettings), model: 'local' });
  } catch (e) { console.error('[ai/reply]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/ai/generate-description — dedicated product description generator
router.post('/generate-description', auth, aiQuota, async (req, res) => {
  try {
    const { name, category, price, sizes, colors, type, imageUrl } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const dbSettings = await db.getSettings(req.user.id) || {};
    const provider   = req.body.provider  || dbSettings.ai?.provider  || 'openai';
    const aiModel    = req.body.model     || dbSettings.ai?.model     || 'gpt-4o-mini';

    // صورة المنتج تُمرَّر للمزودين القادرين على الرؤية — بحد أقصى ~2MB base64
    const okImage = (typeof imageUrl === 'string' && imageUrl.length > 50 && imageUrl.length < 2_800_000) ? imageUrl : '';

    const kind = type === 'service' ? 'خدمة' : type === 'digital' ? 'منتج رقمي' : 'منتج';
    const prompt = `اكتب وصفاً تسويقياً قصيراً (جملتين إلى ثلاث جمل) بالدارجة المغربية ل${kind}: "${name}" من فئة "${category || 'عام'}".${price ? ` السعر: ${price} درهم.` : ''}${sizes?.length ? ` المقاسات: ${sizes.join('، ')}.` : ''}${colors?.length ? ` الألوان: ${colors.join('، ')}.` : ''}${okImage ? ' انظر جيداً إلى صورة المنتج المرفقة وصِف ما تراه فعلاً (الخامة، التصميم، التفاصيل المرئية الحقيقية).' : ''} الوصف يكون جذاباً، يبرز الجودة ويشجع على الشراء. أعطِ الوصف مباشرة بدون مقدمات.`;
    const sysPrompt = 'أنت خبير كتابة إعلانية لمتجر مغربي. اكتب وصفاً جذاباً مباشراً فقط.';

    const keys = _resolveAIKeys(req.body, dbSettings.ai);
    const out = await aiChat({
      keys, provider, models: { openai: aiModel, claude: dbSettings.ai?.claudeModel, grok: dbSettings.ai?.grokModel, mistral: dbSettings.ai?.mistralModel },
      sysPrompt, history: [], message: prompt, maxTokens: 260, temperature: 0.8,
      imageUrl: okImage,
    });
    if (out) return res.json({ description: out.text, model: out.provider, usedImage: !!out.usedImage });

    const desc = `${name} — منتج مميز من فئة ${category || 'الملابس'} بجودة عالية. ${sizes?.length ? `متوفر بمقاسات ${sizes.join('، ')}.` : ''} سارع بالطلب قبل نفاد الكمية! 🛒`;
    res.json({ description: desc, model: 'local' });
  } catch (e) { console.error('[ai/generate-description]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/ai/generate-hashtags — generate social media hashtags
router.post('/generate-hashtags', auth, aiQuota, async (req, res) => {
  try {
    const { name, category, description, storeName } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const dbSettings = await db.getSettings(req.user.id) || {};
    const openaiKey  = req.body.apiKey    || dbSettings.ai?.apiKey   || process.env.OPENAI_API_KEY;
    const geminiKey  = req.body.geminiKey || dbSettings.ai?.geminiKey || process.env.GEMINI_API_KEY;
    const provider   = req.body.provider  || dbSettings.ai?.provider  || 'openai';

    const prompt = `Generate 15 social media hashtags for a Moroccan online store product.
Product: "${name}"${category ? `\nCategory: ${category}` : ''}${description ? `\nDescription: ${description.slice(0,100)}` : ''}${storeName ? `\nStore: ${storeName}` : ''}
Return ONLY a valid JSON object: {"hashtags":["#tag1","#tag2",...]}
Include: Arabic hashtags for Morocco (#تسوق_المغرب etc.), English hashtags, product-specific, and trending e-commerce tags.`;

    const keys = _resolveAIKeys(req.body, dbSettings.ai);
    const out = await aiChat({
      keys, provider, models: { openai: dbSettings.ai?.model, claude: dbSettings.ai?.claudeModel, grok: dbSettings.ai?.grokModel, mistral: dbSettings.ai?.mistralModel },
      sysPrompt: 'You generate social media hashtags. Reply ONLY with the JSON object requested.',
      history: [], message: prompt, maxTokens: 250, temperature: 0.7, jsonMode: true,
    });
    if (out) {
      try {
        const match = out.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const tags = parsed.hashtags || parsed;
          if (Array.isArray(tags) && tags.length) return res.json({ hashtags: tags, model: out.provider });
        }
      } catch (e) { console.warn('[hashtags] parse:', e.message); }
    }

    const safeStore = (storeName || 'متجر').replace(/\s+/g, '_');
    const safeName  = name.replace(/\s+/g, '_');
    const localTags = [
      '#تسوق_اونلاين', '#متجر_مغربي', '#شحن_لجميع_المدن', '#جودة_عالية',
      '#توصيل_سريع', `#${safeName}`, `#${safeStore}`,
      '#المغرب', '#Maroc', '#MarocShopping', '#MoroccanBusiness',
      '#دفع_عند_الاستلام', '#COD', '#تسوق_المغرب', '#منتجات_مغربية',
    ];
    res.json({ hashtags: localTags, model: 'local' });
  } catch (e) { console.error('[ai/generate-hashtags]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/ai/design-product-image — توليد صورة المنتج
// المزودون المدعومون فعلياً: OpenAI (DALL-E 3) · Gemini (توليد صور) · Grok (xAI)
// provider: 'auto' يجرب المتاح بالترتيب، أو حدد مزوداً بعينه
router.post('/design-product-image', auth, aiQuota, async (req, res) => {
  try {
    const { productName, price, storeName, description, category, colors, sizes, customPrompt, baseImage, provider = 'auto' } = req.body;
    if (!productName) return res.status(400).json({ error: 'productName required' });

    const dbSettings = await db.getSettings(req.user.id) || {};
    const keys = _resolveAIKeys(req.body, dbSettings.ai);

    // مزودو الصور المتاحون حسب المفاتيح المربوطة فعلاً
    const IMG_PROVIDERS = ['openai', 'gemini', 'grok'];
    const order = (provider === 'auto' ? IMG_PROVIDERS : [provider])
      .filter(p => IMG_PROVIDERS.includes(p) && keys[p]);
    if (!order.length) {
      return res.status(400).json({
        error: provider === 'auto'
          ? 'توليد الصور يتطلب مفتاح OpenAI أو Gemini أو Grok — اربط واحداً من صفحة الاتصالات'
          : `المزود المختار (${provider}) غير مربوط — أضف مفتاحه من صفحة الاتصالات أو اختر Auto`,
        needsKey: true,
      });
    }

    const cur   = dbSettings.brand?.currency || 'MAD';
    const store = storeName || dbSettings.brand?.name || 'متجر';
    const prompt = [
      `Professional Moroccan e-commerce product marketing photo for Instagram/Facebook.`,
      `Product: "${productName}"`,
      description  ? `Description: ${description.slice(0, 120)}` : '',
      category     ? `Category: ${category}` : '',
      colors?.length ? `Colors: ${colors.slice(0,4).join(', ')}` : '',
      sizes?.length  ? `Sizes: ${sizes.slice(0,4).join(', ')}` : '',
      `Price: ${price} ${cur}`,
      `Store: ${store}`,
      ``,
      // User's custom design request takes top priority
      customPrompt ? `IMPORTANT USER REQUEST: ${customPrompt}` : '',
      ``,
      `Create a stunning commercial product photo:`,
      `- Clean white or soft gradient background`,
      `- Product displayed prominently and clearly`,
      `- Professional studio lighting, sharp focus`,
      `- Price tag "${price} ${cur}" tastefully shown`,
      `- Store name "${store}" in elegant corner branding`,
      `- Modern Moroccan aesthetic, suitable for social media marketing`,
      `- No busy backgrounds, no clutter`,
    ].filter(Boolean).join('\n');

    // جرّب المزودين بالترتيب — كل فشل يُسجَّل بسببه الحقيقي ويُعرض للمستخدم
    const failures = [];
    for (const p of order) {
      try {
        if (p === 'openai') {
          const body = JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard', style: 'natural' });
          const data = JSON.parse(await _https('api.openai.com', '/v1/images/generations', { 'Authorization': `Bearer ${keys.openai}` }, body, 'POST', 60000));
          if (data.error) throw new Error(data.error.message);
          const url = data.data?.[0]?.url;
          if (url) return res.json({ url, model: 'dall-e-3', provider: 'openai' });
          throw new Error('رد بدون صورة');
        }
        if (p === 'gemini') {
          const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
          const data = JSON.parse(await _https('generativelanguage.googleapis.com',
            `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${keys.gemini}`, {}, body, 'POST', 60000));
          if (data.error) throw new Error(data.error.message);
          const parts = data.candidates?.[0]?.content?.parts || [];
          const imgPart = parts.find(pt => pt.inlineData?.data || pt.inline_data?.data);
          const b64  = imgPart?.inlineData?.data || imgPart?.inline_data?.data;
          const mime = imgPart?.inlineData?.mimeType || imgPart?.inline_data?.mime_type || 'image/png';
          if (b64) return res.json({ url: `data:${mime};base64,${b64}`, model: 'gemini-2.5-flash-image', provider: 'gemini' });
          throw new Error('رد بدون صورة');
        }
        if (p === 'grok') {
          const body = JSON.stringify({ model: 'grok-2-image', prompt, n: 1 });
          const data = JSON.parse(await _https('api.x.ai', '/v1/images/generations', { 'Authorization': `Bearer ${keys.grok}` }, body, 'POST', 60000));
          if (data.error) throw new Error(data.error.message || data.error);
          const item = data.data?.[0];
          if (item?.url) return res.json({ url: item.url, model: 'grok-2-image', provider: 'grok' });
          if (item?.b64_json) return res.json({ url: `data:image/png;base64,${item.b64_json}`, model: 'grok-2-image', provider: 'grok' });
          throw new Error('رد بدون صورة');
        }
      } catch (e) {
        console.warn(`[design-image] ${p}:`, e.message);
        failures.push(`${p}: ${e.message}`);
      }
    }
    return res.status(502).json({ error: `فشل توليد الصورة لدى ${failures.length > 1 ? 'كل المزودين' : 'المزود'} — ${failures.join(' · ')}` });
  } catch (e) {
    console.warn('[design-image]', e.message);
    return res.status(500).json({ error: e.message || 'خطأ في توليد الصورة' });
  }
});

// POST /api/ai/product-search — search product by name/sku/description
router.post('/product-search', async (req, res) => {
  try {
    const { query, userId } = req.body;
    if (!query || !userId) return res.status(400).json({ error: 'query and userId required' });
    const products = await db.getProducts(userId);
    const results  = searchProducts(query, products);
    res.json({ results, found: results.length > 0 });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/ai/extract-order — extract order data from conversation
router.post('/extract-order', async (req, res) => {
  res.json(extractOrderData(req.body.history));
});

// POST /api/ai/public-reply — مساعد المتجر للزبون (no auth)
// يعرف المنتجات والخدمات وأنماط حجزها، يتتبع الطلبات الحقيقية من قاعدة
// البيانات، ويرشّح منتجات تظهر للزبون كبطاقات «أضف للسلة» بضغطة واحدة.
router.post('/public-reply', async (req, res) => {
  try {
    const { message, history, userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const products = await db.getProducts(userId);
    const settings = await db.getSettings(userId) || {};
    // المجيب الآلي للزبون يقرأ المفاتيح من قاعدة البيانات فقط (لا auth هنا)
    const keys = _resolveAIKeys(null, settings?.ai);
    const hasAnyKey = Object.values(keys).some(Boolean);
    const cur = settings?.brand?.currency || 'MAD';
    const pub = products.filter(p => p.status === 'published');
    const goods = pub.filter(p => p.type !== 'service');
    const services = pub.filter(p => p.type === 'service');
    const cfv = (p, id) => (Array.isArray(p.customFields) ? p.customFields.find(f => f && f.id === id)?.value : '') || '';
    const slim = p => ({ id: p.id, name: p.name, price: p.price, emoji: p.emoji || '', imageUrl: p.imageUrl || (p.images || [])[0] || '', type: p.type });
    const STATUS_AR = { pending: '⏳ بانتظار التأكيد', approved: '✅ مؤكد', processing: '⚙️ قيد التحضير', shipped: '🚚 في الطريق', delivered: '📦 تم التوصيل', cancelled: '❌ ملغي', rejected: '❌ مرفوض' };

    // ── تتبع حقيقي من قاعدة البيانات: نلتقط هاتفاً أو كوداً من الرسالة ──
    const msgStr = String(message || '');
    const phoneM = msgStr.match(/(?:\+?212|0)[\s.-]?[67](?:[\s.-]?\d){8}/);
    const tokens = (msgStr.toUpperCase().match(/\b[A-Z0-9][A-Z0-9-]{5,19}\b/g) || []);
    const trackIntent = /(طلبي|طلباتي|تتبع|فين وصل|وصل الطلب|حالة الطلب|كود التتبع|tracking)/i.test(msgStr);
    let orderContext = '';
    if (phoneM || tokens.length) {
      const norm = s => String(s || '').replace(/\D/g, '').slice(-9);
      const all = await db.getOrders(userId);
      let mine = [];
      if (phoneM) {
        const tail = norm(phoneM[0]);
        if (tail.length === 9) mine = all.filter(o => norm(o.customerPhone) === tail);
      }
      if (!mine.length && tokens.length) {
        mine = all.filter(o =>
          tokens.includes(String(o.customerCode || '').toUpperCase()) ||
          tokens.includes(String(o.trackingNumber || '').toUpperCase()) ||
          tokens.includes(String(o.id || '').toUpperCase()));
      }
      if (mine.length) {
        mine = mine.slice(-3); // أحدث 3 طلبات
        const lines = mine.map(o => `• طلب ${o.customerCode || o.id}: ${STATUS_AR[o.status] || o.status} — المجموع ${o.total} ${cur}${o.trackingNumber ? `\n  رقم التتبع: ${o.trackingNumber}` : ''}${o.deliveryProvider ? ` (${o.deliveryProvider})` : ''}`).join('\n');
        const direct = `لقيت ${mine.length > 1 ? 'الطلبات ديالك' : 'الطلب ديالك'} ✅\n\n${lines}\n\n${mine.some(o => o.status === 'shipped') ? 'الطلب في الطريق ليك 🚚' : 'إلا حتاجيتي شي حاجة أخرى أنا هنا 😊'}`;
        // سؤال تتبع صريح → رد مباشر ببيانات حقيقية بدون توليد
        if (trackIntent || !hasAnyKey) return res.json({ reply: direct, model: 'order-tracking' });
        orderContext = `\n\nطلبات هذا الزبون الحقيقية (من قاعدة البيانات الآن):\n${lines}\nإذا سأل عن طلبه أعطه هذه الحالة الحقيقية حرفياً ولا تخترع غيرها.`;
      } else if (trackIntent) {
        return res.json({ reply: 'ما لقيتش طلب بهاد المعلومات 😕\nتأكد من رقم الهاتف اللي درتي به الطلب (مثال: 06XXXXXXXX) أو كود التتبع اللي وصلك، وعاود صيفطو ليا.', model: 'order-tracking' });
      }
    } else if (trackIntent) {
      return res.json({ reply: 'باش نتبع ليك الطلب 🚚\nصيفط ليا رقم الهاتف اللي درتي به الطلب (06... أو 07...) أو كود التتبع، ونجيب ليك الحالة الحقيقية دابا.', model: 'order-tracking' });
    }

    // Product search first
    const found = searchProducts(message, pub.length ? pub : products);
    if (found.length > 0 && /(عندكم|كاين|منتج|بغيت|سعر|ثمن|بكام|هاد)/i.test(message)) {
      const p = found[0];
      const isSvc = p.type === 'service';
      const reply = isSvc
        ? `عندنا هاد الخدمة! 🛠️\n\n${p.emoji||'🛠️'} **${p.name}**\n💰 السعر: ${p.price} ${cur}${p.duration?`\n⏱️ المدة: ${p.duration}`:''}${p.workArea?`\n📍 منطقة العمل: ${p.workArea}`:''}${cfv(p,'serviceMode')?`\n📅 الحجز: ${cfv(p,'serviceMode')}`:''}\n\nتقدر تحجز من بطاقة الخدمة فالمتجر 👇`
        : `وجدت المنتج! 🎉\n\n${p.emoji||'📦'} **${p.name}**\n💰 السعر: ${p.price} ${cur}\n📏 المقاسات: ${(p.sizes||[]).join(' · ')||'S M L XL'}\n🎨 الألوان: ${(p.colors||[]).join(' · ')||'—'}\n📦 المخزون: ${p.stock} قطعة\n\nواش بغيت هاد المنتج؟`;
      return res.json({ reply, model: 'product-search', product: p, products: [slim(p)] });
    }

    if (hasAnyKey) {
      const prodLines = goods.slice(0, 35).map(p =>
        `- ${p.emoji||'📦'} ${p.name}: ${p.price} ${cur}${p.description ? ' — ' + p.description.slice(0, 80) : ''}${(p.sizes||[]).length ? ' (مقاسات: ' + p.sizes.join('/') + ')' : ''}${(p.colors||[]).length ? ' (ألوان: ' + p.colors.join('/') + ')' : ''} [مخزون: ${p.stock}]`
      ).join('\n');
      const svcLines = services.slice(0, 20).map(s => {
        const mode = cfv(s, 'serviceMode');
        const sPhone = cfv(s, 'servicePhone') || settings?.brand?.phone || '';
        return `- 🛠️ ${s.name}: ${s.price} ${cur}${s.duration ? ` (المدة: ${s.duration})` : ''}${s.workArea ? ` [منطقة العمل: ${s.workArea}]` : ''}${mode ? ` [نمط الحجز: ${mode}]` : ''}${sPhone ? ` [هاتف مباشر: ${sPhone}]` : ''}${s.description ? ' — ' + s.description.slice(0, 60) : ''}`;
      }).join('\n');
      const sysPrompt = settings?.ai?.systemPrompt || `أنت ${settings?.brand?.name||'صاحب المتجر'} تبيع مباشرة للزبائن بالدارجة المغربية. أنت الشخص المسؤول عن المتجر وتتكلم معهم كأنك أنت صاحب المتجر — شخصية مغربية ودودة وراقية.

معلومات متجرك:
• اسم المتجر: ${settings?.brand?.name||'متجر'}
• الهاتف: ${settings?.brand?.phone||''}
• العنوان: ${settings?.brand?.address||'—'}
• ساعات العمل: ${settings?.brand?.workStart||'9:00'} إلى ${settings?.brand?.workEnd||'21:00'}
• التوصيل: ${settings?.delivery?.defaultCost||'20-40'} ${cur} لجميع مدن المغرب خلال 24-48 ساعة
• الدفع: عند الاستلام (COD)
• الوصف: ${settings?.brand?.description||''}
• العروض الحالية: توصيل مجاني للطلبات فوق ${settings?.promotions?.freeShippingThreshold??400} ${cur}${settings?.promotions?.bundle?.enabled!==false?`، وخصم ${settings?.promotions?.bundle?.percent??10}% تلقائي عند شراء ${settings?.promotions?.bundle?.minItems??3} قطع أو أكثر`:''}${settings?.promotions?.wheel?.enabled!==false?'، وعجلة حظ يومية في المتجر تمنح أكواد خصم':''}

منتجاتك المتوفرة:
${prodLines || 'لا منتجات متوفرة حالياً'}

خدماتك المتاحة (تُحجز ولا تُشترى كسلعة):
${svcLines || 'لا خدمات حالياً'}

تعليمات مهمة:
- أجب دائماً بالدارجة المغربية
- أنت صاحب المتجر — تكلم كأنك شخصياً تبيع للزبون
- أعطِ السعر والتفاصيل مباشرة عند السؤال عن منتج
- للخدمات: اشرح نمط الحجز — «استعجالية» يعني اتصال فوري بالهاتف المباشر، و«بموعد» يعني الحجز من بطاقة الخدمة في المتجر (اختيار اليوم والساعة والمكان)
- إذا سأل الزبون عن حالة طلبه: اطلب منه رقم الهاتف الذي طلب به أو كود التتبع
- عند اقتراح منتج أو خدمة اذكر اسمه الدقيق حرفياً كما هو في القائمة
- إذا أراد الطلب: اطلب الاسم الكامل، رقم الهاتف، المدينة، العنوان — أو وجّهه يضيف المنتج للسلة ويكمل من المتجر
- كن إيجابياً، مقنعاً، ومشجعاً على الشراء
- إذا لم يكن المنتج متوفراً، اعتذر بأدب واقترح بديلاً من القائمة${orderContext}`;
      const out = await aiChat({
        keys,
        provider: settings?.ai?.provider || 'openai',
        models: { openai: settings?.ai?.model, claude: settings?.ai?.claudeModel, grok: settings?.ai?.grokModel, mistral: settings?.ai?.mistralModel },
        sysPrompt, history: (history || []).slice(-6), message,
        maxTokens: 350, temperature: 0.8,
      });
      if (out) {
        // سلة جاهزة بضغطة: أي منتج/خدمة ذُكر اسمه حرفياً في الرد يظهر كبطاقة قابلة للإضافة
        const mentioned = pub.filter(p => p.name && p.name.length > 2 && out.text.includes(p.name)).slice(0, 3).map(slim);
        return res.json({ reply: out.text, model: out.provider, products: mentioned });
      }
    }

    res.json({ reply: smartReply(message, history, products, settings), model: 'local' });
  } catch (e) { console.error('[ai/public-reply]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/ai/whatsapp-confirm — send WhatsApp confirmation
router.post('/whatsapp-confirm', auth, async (req, res) => {
  try {
    const { orderId, to, type } = req.body;
    const order = await db.getOrder(orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });
    const settings = await db.getSettings(req.user.id) || {};
    const waToken  = settings.social?.whatsapp?.accessToken;
    const waPhoneId= settings.social?.whatsapp?.pageId;
    const cur = settings.brand?.currency || 'MAD';

    let msg = '';
    if (type === 'customer') {
      const items = (order.items || []).map(i => `• ${i.productName} x${i.quantity||1} — ${i.price} ${cur}`).join('\n');
      msg = `مرحباً ${order.customerName}! 👋\n\n✅ تم تأكيد طلبك بنجاح!\n\n${items}\n\n💰 الإجمالي: ${order.total} ${cur}\n🚚 التوصيل: 24-48 ساعة\n\nسنبلغك عند الشحن. شكراً لثقتك بنا! 🙏`;
    } else {
      const items = (order.items || []).map(i => `• ${i.productName} (${i.size||''} ${i.color||''}) x${i.quantity||1}`).join('\n');
      msg = `🔔 طلب جديد يحتاج موافقتك!\n\n👤 ${order.customerName}\n📱 ${order.customerPhone}\n📍 ${order.city} — ${order.address||''}\n\n${items}\n\n💰 الإجمالي: ${order.total} ${cur}\n\nرد بـ ✅ للموافقة أو ❌ للرفض`;
    }

    if (waToken && waPhoneId && to) {
      try {
        const body = JSON.stringify({ messaging_product:'whatsapp', to:to.replace(/\s/g,''), type:'text', text:{ body:msg } });
        const https2 = require('https');
        await new Promise((resolve,reject) => {
          const r = https2.request({ hostname:'graph.facebook.com', path:`/v19.0/${waPhoneId}/messages`, method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${waToken}`, 'Content-Length':Buffer.byteLength(body) } }, res => { res.resume(); resolve(res.statusCode < 300); });
          r.on('error', reject); r.write(body); r.end();
        });
        return res.json({ sent: true, via: 'whatsapp_api', message: msg });
      } catch (e) { console.warn('[WhatsApp]', e.message); }
    }

    const phone = (to || settings.brand?.phone || '').replace(/\D/g,'');
    res.json({ sent: false, via: 'wa_me', url: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, message: msg });
  } catch (e) { console.error('[ai/whatsapp-confirm]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/ai/publish — post to social media
router.post('/publish', auth, async (req, res) => {
  try {
    const { platform, message, imageUrl } = req.body;
    const settings = await db.getSettings(req.user.id) || {};
    const social   = settings.social || {};

    if (platform === 'facebook') {
      const token  = social.facebook?.accessToken;
      const pageId = social.facebook?.pageId;
      if (!token || !pageId) return res.status(400).json({ error: 'Facebook غير مربوط. اذهب لصفحة الربط أولاً.' });
      try {
        const body = imageUrl
          ? JSON.stringify({ message, url: imageUrl, access_token: token })
          : JSON.stringify({ message, access_token: token });
        const endpoint = imageUrl ? `/v19.0/${pageId}/photos` : `/v19.0/${pageId}/feed`;
        const resp = await _https('graph.facebook.com', endpoint, {}, body);
        const data = JSON.parse(resp);
        if (data.error) return res.status(400).json({ error: data.error.message });
        await db.addLog({ userId: req.user.id, user: 'System', action: `Published to Facebook`, details: message.slice(0,50), type: 'notification', severity: 'success' });
        return res.json({ success: true, postId: data.id });
      } catch (e) { return res.status(500).json({ error: e.message }); }
    }

    if (platform === 'instagram') {
      const token  = social.instagram?.accessToken;
      const accId  = social.instagram?.pageId;
      if (!token || !accId) return res.status(400).json({ error: 'Instagram غير مربوط.' });
      if (!imageUrl) return res.status(400).json({ error: 'Instagram يتطلب صورة للنشر.' });
      try {
        const container = await _https('graph.facebook.com', `/v19.0/${accId}/media`,
          {}, JSON.stringify({ image_url: imageUrl, caption: message, access_token: token }));
        const { id: containerId } = JSON.parse(container);
        if (!containerId) return res.status(500).json({ error: 'فشل إنشاء المحتوى.' });
        const publish = await _https('graph.facebook.com', `/v19.0/${accId}/media_publish`,
          {}, JSON.stringify({ creation_id: containerId, access_token: token }));
        const { id: mediaId } = JSON.parse(publish);
        await db.addLog({ userId: req.user.id, user: 'System', action: `Published to Instagram`, details: message.slice(0,50), type: 'notification', severity: 'success' });
        return res.json({ success: true, mediaId });
      } catch (e) { return res.status(500).json({ error: e.message }); }
    }

    res.status(400).json({ error: `Platform "${platform}" غير مدعوم بعد.` });
  } catch (e) { console.error('[ai/publish]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/ai/comments/:platform — get comments from posts
router.get('/comments/:platform', auth, async (req, res) => {
  try {
    const settings = await db.getSettings(req.user.id) || {};
    const { platform } = req.params;

    if (platform === 'facebook') {
      const token  = settings.social?.facebook?.accessToken;
      const pageId = settings.social?.facebook?.pageId;
      if (!token || !pageId) return res.json({ comments: [] });
      try {
        const data = await _https('graph.facebook.com', `/v19.0/${pageId}/feed?fields=id,message,comments{message,from,created_time}&access_token=${token}&limit=10`, {}, null, 'GET');
        const posts = JSON.parse(data).data || [];
        const comments = [];
        posts.forEach(post => {
          (post.comments?.data || []).forEach(c => {
            comments.push({ id: c.id, text: c.message, from: c.from?.name, time: c.created_time, postId: post.id, platform: 'facebook' });
          });
        });
        return res.json({ comments });
      } catch (e) { return res.json({ comments: [], error: e.message }); }
    }
    res.json({ comments: [] });
  } catch (e) { console.error('[ai/comments]', e.message); res.status(500).json({ error: 'Server error' }); }
});

/* ══════════════════════════════════════════════
   MULTI-PROVIDER AI ROUTER
   موجّه موحد: OpenAI / Gemini / Claude / DeepSeek
   يجرب مزوّدك المفضل أولاً ثم البقية التي لها مفاتيح
   (Fallback تلقائي)، وأخيراً الرد المحلي الذكي.
   ══════════════════════════════════════════════ */

const AI_PROVIDERS = ['openai', 'gemini', 'claude', 'deepseek', 'grok', 'mistral'];

// جمع المفاتيح: الطلب ← قاعدة البيانات ← متغيرات البيئة
function _resolveAIKeys(reqAi, dbAi) {
  return {
    openai:   reqAi?.apiKey      || dbAi?.apiKey      || process.env.OPENAI_API_KEY    || '',
    gemini:   reqAi?.geminiKey   || dbAi?.geminiKey   || process.env.GEMINI_API_KEY    || '',
    claude:   reqAi?.claudeKey   || dbAi?.claudeKey   || process.env.ANTHROPIC_API_KEY || '',
    deepseek: reqAi?.deepseekKey || dbAi?.deepseekKey || process.env.DEEPSEEK_API_KEY  || '',
    grok:     reqAi?.grokKey     || dbAi?.grokKey     || process.env.XAI_API_KEY || process.env.GROK_API_KEY || '',
    mistral:  reqAi?.mistralKey  || dbAi?.mistralKey  || process.env.MISTRAL_API_KEY   || '',
  };
}

function _providerOrder(preferred, keys) {
  const order = [preferred, ...AI_PROVIDERS.filter(p => p !== preferred)];
  return order.filter(p => keys[p]);
}

// فرع موحد لكل المزودين المتوافقين مع واجهة OpenAI
// (OpenAI نفسها، DeepSeek، Grok/xAI، Mistral)
async function _oaiCompatChat(hostname, key, model, sysPrompt, history, message, maxTokens, temperature, jsonMode, imageUrl) {
  // الرؤية (قراءة الصور) مدعومة لدى OpenAI فقط من هذا الفرع
  const userContent = (imageUrl && hostname === 'api.openai.com')
    ? [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: imageUrl } }]
    : message;
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: sysPrompt },
      ...(history || []).slice(-10).filter(m => m.content).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: userContent },
    ],
    max_tokens: maxTokens, temperature,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });
  const r = await _https(hostname, '/v1/chat/completions', { 'Authorization': `Bearer ${key}` }, body);
  const parsed = JSON.parse(r);
  if (parsed.error) throw new Error(parsed.error.message || 'API error');
  return parsed.choices?.[0]?.message?.content?.trim() || null;
}

async function _geminiChat(key, sysPrompt, history, message, maxTokens, temperature, imageUrl) {
  const rawHistory = (history || []).slice(-8).filter(m => m.content).map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  // Gemini يتطلب تناوب الأدوار وينتهي التاريخ بدور model
  const altHistory = [];
  for (const turn of rawHistory) {
    if (altHistory.length === 0 || altHistory[altHistory.length - 1].role !== turn.role) altHistory.push(turn);
  }
  while (altHistory.length > 0 && altHistory[altHistory.length - 1].role === 'user') altHistory.pop();
  const userParts = [{ text: message }];
  const img = _parseDataUrl(imageUrl);
  if (img) userParts.push({ inline_data: { mime_type: img.mime, data: img.b64 } });
  const body = JSON.stringify({
    contents: [...altHistory, { role: 'user', parts: userParts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature },
    systemInstruction: { parts: [{ text: sysPrompt }] },
  });
  const r = await _https('generativelanguage.googleapis.com', `/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {}, body);
  return JSON.parse(r).candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

// Claude (Anthropic) — عبر SDK الرسمي. claude-haiku-4-5 هو الأنسب
// سعراً وسرعة لمحادثات الزبائن اليومية.
let _AnthropicSDK = null;
async function _claudeChat(key, model, sysPrompt, history, message, maxTokens, imageUrl) {
  if (_AnthropicSDK === null) {
    try { _AnthropicSDK = require('@anthropic-ai/sdk'); }
    catch { _AnthropicSDK = false; console.warn('[AI] @anthropic-ai/sdk غير مثبت — شغّل npm install في مجلد server'); }
  }
  if (!_AnthropicSDK) return null;
  const anthropic = new _AnthropicSDK({ apiKey: key });
  // أول رسالة يجب أن تكون من المستخدم
  const msgs = (history || []).slice(-10)
    .filter(m => m.content)
    .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
  while (msgs.length && msgs[0].role === 'assistant') msgs.shift();
  const img = _parseDataUrl(imageUrl);
  msgs.push({
    role: 'user',
    content: img
      ? [{ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.b64 } }, { type: 'text', text: message }]
      : message,
  });
  const resp = await anthropic.messages.create({
    model: model || 'claude-haiku-4-5',
    max_tokens: maxTokens,
    system: sysPrompt,
    messages: msgs,
  });
  if (resp.stop_reason === 'refusal') return null;
  const block = (resp.content || []).find(b => b.type === 'text');
  return block?.text?.trim() || null;
}

// المزودون القادرون على قراءة الصور (Vision)
const VISION_PROVIDERS = { openai: true, gemini: true, claude: true };

// الواجهة الموحدة — تُرجع { text, provider, usedImage } أو null إذا فشل الجميع
async function aiChat({ keys, provider, models = {}, sysPrompt, history, message, maxTokens = 400, temperature = 0.7, jsonMode = false, imageUrl = '' }) {
  for (const p of _providerOrder(provider, keys)) {
    try {
      // OpenAI يقبل روابط http وdata معاً؛ Gemini وClaude يحتاجان data URL (base64)
      const img = imageUrl && VISION_PROVIDERS[p] && (p === 'openai' || imageUrl.startsWith('data:')) ? imageUrl : '';
      let text = null;
      if (p === 'openai')   text = await _oaiCompatChat('api.openai.com',   keys.openai,   models.openai  || 'gpt-4o-mini',          sysPrompt, history, message, maxTokens, temperature, jsonMode, img);
      if (p === 'deepseek') text = await _oaiCompatChat('api.deepseek.com', keys.deepseek, models.deepseek || 'deepseek-chat',        sysPrompt, history, message, maxTokens, temperature, false);
      if (p === 'grok')     text = await _oaiCompatChat('api.x.ai',         keys.grok,     models.grok    || 'grok-3-mini',          sysPrompt, history, message, maxTokens, temperature, false);
      if (p === 'mistral')  text = await _oaiCompatChat('api.mistral.ai',   keys.mistral,  models.mistral || 'mistral-small-latest', sysPrompt, history, message, maxTokens, temperature, false);
      if (p === 'gemini')   text = await _geminiChat(keys.gemini, sysPrompt, history, message, maxTokens, temperature, img);
      if (p === 'claude')   text = await _claudeChat(keys.claude, models.claude, sysPrompt, history, message, maxTokens, img);
      if (text) return { text, provider: p, usedImage: !!img };
    } catch (e) { console.warn(`[AI] ${p}:`, e.message); }
  }
  return null;
}

function _https(hostname, path, extraHeaders, body, method = 'POST', timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path, method,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    // توليد الصور قد يستغرق 20-40 ثانية — المهلة قابلة للتخصيص لكل نداء
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// يحوّل data URL إلى { mime, b64 } أو null إن لم يكن صورة base64 صالحة
function _parseDataUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:')) return null;
  const m = imageUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  return m ? { mime: m[1], b64: m[2] } : null;
}

// ══════════════════════════════════════════════════════════════
//   UNDERSTAND — طبقة فهمِ المحتاج (Context Engine عبر LLM). آخر خطوة (fallback)
//   فوق القواعد: النصّ الحرّ الطويل/الغامض الذي تُفوِّته القواعد ⇒ JSON منظّم فقط
//   (لا ردّ بيع، لا محادثة). عامّ (للمحتاج قبل التسجيل)؛ المفاتيح من env المنصّة
//   أو إعدادات userId إن مُرِّر. بلا مفتاح ⇒ { available:false } فيسقط العميل للقواعد.
// ══════════════════════════════════════════════════════════════
const UNDERSTAND_SYS = [
  'أنت طبقة فهمٍ داخل AMANZINE (المغرب). حوّل ما يكتبه المستخدم بأيّ لغة',
  '(دارجة/عربية/فرنسية/إنجليزية/Arabizi) إلى JSON منظّم فقط — لا ردّ محادثة، لا بيع.',
  'افهم السياق لا الكلمات: «الما كيقطر من الصالون»→تسرّب ماء→سبّاك؛',
  '«الباب ما بقا كيسدش»→نجّار؛ «المكينة ما بقاتش كتخدم»→تقنيّ إصلاح؛',
  '«بغيت ندهّن الدار قبل العيد»→صبّاغ، urgency=true.',
  'أعِد JSON فقط بهذا الشكل بلا أيّ نصٍّ إضافيّ:',
  '{"intent":"find_pro|buy|sell|book|question|explore|none","service":"<الخدمة بالعربية>",',
  '"problem":"<المشكلة إن وُجدت أو null>","category":"automotive|home_services|health|beauty|food|digital|other",',
  '"city":"<المدينة أو null>","urgency":true|false,"language":"darija|ar|fr|en|mixed",',
  '"confidence":0.0,"reasoning":["سبب مختصر"],"possible_questions":["سؤال توضيحيّ"]}',
].join(' ');

function _safeJson(s) {
  if (!s) return null;
  let t = String(s).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch { return null; }
}
function _normUnderstanding(p) {
  if (!p || typeof p !== 'object') return null;
  const clamp = n => (typeof n === 'number' && n >= 0 && n <= 1 ? n : 0.7);
  const arr = x => (Array.isArray(x) ? x.filter(v => typeof v === 'string').slice(0, 6) : []);
  const nn = v => (v == null || v === 'null' || v === '' ? undefined : String(v));
  return {
    intent: nn(p.intent) || 'none',
    service: nn(p.service),
    problem: nn(p.problem),
    category: nn(p.category),
    city: nn(p.city),
    urgency: p.urgency === true || p.urgency === 'true',
    language: nn(p.language) || 'mixed',
    confidence: clamp(p.confidence),
    reasoning: arr(p.reasoning),
    possible_questions: arr(p.possible_questions),
  };
}

router.post('/understand', async (req, res) => {
  try {
    const text = String(req.body?.text || '').slice(0, 500).trim();
    const hasImage = typeof req.body?.image === 'string' && req.body.image.startsWith('data:');
    if (!text && !hasImage) return res.status(400).json({ error: 'text or image required' });
    let dbAi = null;
    if (req.body?.userId) { try { const s = await db.getSettings(req.body.userId); dbAi = s?.ai || null; } catch { /* noop */ } }
    const keys = _resolveAIKeys(req.body?.ai, dbAi);
    if (!Object.values(keys).some(Boolean)) return res.json({ available: false });
    // مزوّدٌ رخيصٌ جيّدٌ بالدارجة أوّلًا (DeepSeek/Gemini)، ثمّ الباقي.
    const ctx = req.body?.context || {};
    const ctxLine = ctx && (ctx.city || ctx.activity) ? `\n[سياق: ${[ctx.city && 'مدينة:' + ctx.city, ctx.activity && 'نشاط:' + ctx.activity].filter(Boolean).join(' · ')}]` : '';
    // Vision Engine — صورة (base64) اختياريّة. نُعيد استعمال دعم aiChat للرؤية (Gemini/OpenAI/Claude).
    const img = (typeof req.body?.image === 'string' && req.body.image.startsWith('data:') && req.body.image.length < 2_800_000) ? req.body.image : '';
    // Gemini قويٌّ بالرؤية ورخيص؛ نفضّله للصور إن توفّر مفتاحه.
    const provider = req.body?.provider || (img && keys.gemini ? 'gemini' : dbAi?.provider) || (keys.deepseek ? 'deepseek' : keys.gemini ? 'gemini' : 'openai');
    const out = await aiChat({
      keys, provider,
      models: { openai: 'gpt-4o-mini', claude: dbAi?.claudeModel },
      sysPrompt: img ? UNDERSTAND_SYS + ' إن وُجدت صورةٌ: استخرج الأشياء/العلامات/الأضرار ثمّ استنتج service (مثال: سيّارة+عجلة مثقوبة→mechanic). JSON فقط.' : UNDERSTAND_SYS,
      history: [], message: (text || 'صف المشكلة في الصورة واستنتج الخدمة') + ctxLine,
      imageUrl: img, maxTokens: img ? 380 : 320, temperature: 0, jsonMode: true,
    });
    if (!out || !out.text) return res.json({ available: true, result: null });
    const parsed = _normUnderstanding(_safeJson(out.text));
    return res.json({ available: true, provider: out.provider, result: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'understand failed' });
  }
});

// ── Learning loop: تبليغ «ما لم نفهمه» (عامّ) + مراجعته (أدمن) ──
router.post('/report-unknown', async (req, res) => {
  try {
    const t = String(req.body?.text || '').trim().slice(0, 200);
    if (t.length < 2) return res.json({ ok: false });
    await db.bumpUnknownText(t);
    return res.json({ ok: true });
  } catch { return res.json({ ok: false }); }
});
router.get('/unknown-report', auth, async (req, res) => {
  try {
    const rows = await db.topUnknownTexts(Number(req.query.limit) || 100);
    return res.json({ unknowns: rows });
  } catch { return res.status(500).json({ error: 'report failed' }); }
});

module.exports = router;
