'use strict';
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC NOT NULL DEFAULT 0,
      cost NUMERIC DEFAULT 0,
      stock INTEGER DEFAULT 0,
      sku TEXT DEFAULT '',
      category TEXT DEFAULT '',
      emoji TEXT DEFAULT '📦',
      images JSONB DEFAULT '[]',
      sizes JSONB DEFAULT '[]',
      colors JSONB DEFAULT '[]',
      color_images JSONB DEFAULT '{}',
      image_url TEXT DEFAULT '',
      video_url TEXT DEFAULT '',
      is_for_children BOOLEAN DEFAULT FALSE,
      age_range TEXT DEFAULT '',
      size_type TEXT DEFAULT 'adult',
      views INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      offer_type TEXT DEFAULT 'product',
      duration TEXT DEFAULT '',
      service_area TEXT DEFAULT '',
      portfolio JSONB DEFAULT '[]',
      custom_fields JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ⚠️ إضافة عمود type المفقود (تصحيح الخطأ في السجلات)
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product'`);

    await client.query(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_id TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      items JSONB DEFAULT '[]',
      total NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      delivery_provider TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      needs_review BOOLEAN DEFAULT FALSE,
      review_reason TEXT DEFAULT '',
      customer_code TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── سجلُّ أحداث الطلب — دفترٌ يُضاف إليه ولا يُعدَّل ولا يُحذَف منه ──
    //
    //   كانت حياةُ الطلب عمودًا واحدًا بخمس قيم. فإذا أُرجعت قطعةٌ من ثلاثٍ
    //   وسُلِّمت الباقي، لم يكن للطلب حالةٌ تصفه: لا `delivered` صادقةٌ ولا
    //   `returned`. والأسوأ أنّ تعديلَ المبلغ كان يكتب فوق القديم — فلا يبقى
    //   أثرٌ يقول **لماذا** صار ٩٠ بعد أن كان ١٥٠، ولا متى، ولا من فعلها.
    //
    //   القاعدة: **الحالاتُ قليلة، والأحداثُ لا تُحصى.** «أُرجعت قطعةٌ» ليست
    //   حالةً بل حدث؛ و«مُرجَعٌ جزئيًّا» ليست حالةً بل **استنتاجٌ** من الأحداث.
    //   ولذلك لا عمودَ يُحدَّث هنا: كلُّ صفٍّ واقعةٌ حدثت في لحظةٍ ولا تُنكَر.
    //
    //   `amount_delta` يحمل أثرَ الحدث على المال (سالبٌ للإرجاع). فمجموعُه
    //   على الطلب هو المبلغُ الواجبُ تحصيلُه — يُحسَب ولا يُخزَّن، فلا يفترقان.
    await client.query(`CREATE TABLE IF NOT EXISTS order_events (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      note TEXT DEFAULT '',
      amount_delta NUMERIC NOT NULL DEFAULT 0,
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_events_order
      ON order_events(order_id, id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_events_user
      ON order_events(user_id, created_at DESC)`);

    // 🚚 Livo tracking sync (خطوة صغيرة إضافية — لا تمسّ أي عمود موجود):
    // livo_order_id كان يُرسَل من delivery.js لكن يُفقَد لأنه لم يكن له عمود ولا
    // مسار كتابة في updateOrder → استحال جلب حالة الشحنة لاحقاً. هذا يصلح ذلك.
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS livo_order_id TEXT DEFAULT ''`).catch(() => {});
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT ''`).catch(() => {});
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_synced_at TIMESTAMPTZ`).catch(() => {});

    // 💰 اقتصادُ الطلب: ثمنُ التوصيل كان يُدمَج داخل `total` ثمّ يختفي، فلا يستطيع
    // التاجر معرفةَ ربحه الحقيقيّ ولا مطابقةَ فاتورة شركة التوصيل. ومُعرِّفا المزوّد
    // والمدينة عنده يُحفظان لأنّ اسم المدينة النصّيّ لا يكفي لإعادة بناء الشحنة لاحقًا.
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0`).catch(() => {});
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_fee NUMERIC DEFAULT 0`).catch(() => {});
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_id TEXT DEFAULT ''`).catch(() => {});
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_city_id TEXT DEFAULT ''`).catch(() => {});

    // مُعرِّفُ الشحنة عند الشركة — كان اسمُه livo_order_id رغم أنّه عامّ لكلّ
    // مزوّد. العمودُ القديم يبقى للتوافق ويُملأ معه، والقراءةُ تُفضّل الجديد.
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_shipment_id TEXT DEFAULT ''`).catch(() => {});
    await client.query(
      `UPDATE orders SET provider_shipment_id = livo_order_id
       WHERE COALESCE(provider_shipment_id,'') = '' AND COALESCE(livo_order_id,'') <> ''`
    ).catch(() => {});

    await client.query(`CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      city TEXT DEFAULT '',
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      vip BOOLEAN DEFAULT FALSE,
      source TEXT DEFAULT 'manual',
      trust_score INTEGER DEFAULT 80,
      buyer_score INTEGER DEFAULT 50,
      total_spent NUMERIC DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      last_order_date TEXT DEFAULT '',
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_id TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      platform TEXT DEFAULT 'whatsapp',
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'open',
      last_message TEXT DEFAULT '',
      unread INTEGER DEFAULT 0,
      messages JSONB DEFAULT '[]',
      priority TEXT DEFAULT 'medium',
      mood TEXT DEFAULT 'neutral',
      pinned BOOLEAN DEFAULT FALSE,
      label TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS delivery_providers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      website_url TEXT DEFAULT '',
      add_order_page TEXT DEFAULT '',
      tracking_url TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      cost NUMERIC DEFAULT 0,
      enabled BOOLEAN DEFAULT TRUE,
      api_type TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      api_endpoint TEXT DEFAULT '',
      webhook_url TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // 🚚 مصدرُ حقيقةٍ واحد: كان الجدول يعرف الحقول التقنيّة فقط، فبقيت بقيّةُ
    // تعريف الشركة (الشعار، وضعُ التشغيل، صفحاتُ الموقع، بيانات الدخول) حبيسةَ
    // `settings.delivery.providers` في المتصفّح. النتيجة: ثلاثةٌ من أربعة مسارات
    // إضافةٍ لا تصل الخادمَ أصلًا ⇒ «لا توجد شركة توصيل مفعّلة» رغم ظهورها مفعّلة.
    for (const col of [
      `logo TEXT DEFAULT ''`,
      `mode TEXT DEFAULT 'api'`,
      `login_url TEXT DEFAULT ''`,
      `username TEXT DEFAULT ''`,
      `password TEXT DEFAULT ''`,
      `livraison_bon_page TEXT DEFAULT ''`,
      `ramassage_page TEXT DEFAULT ''`,
      `fields JSONB DEFAULT '{}'`,
    ]) {
      await client.query(`ALTER TABLE delivery_providers ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    // 🗺️ خرائطُ المدن: مدينةُ AMANZINE واحدة، ومُعرِّفُها يختلف عند كلّ شركة.
    // بلا هذا يُرسَل اسمُ المدينة نصًّا حرًّا فترفضه الشركةُ أو تُسلّم لغيرها.
    // المدنُ المعياريّة نفسُها مُولَّدةٌ من قاعدة المعرفة (generated/cities.json)
    // ولا تُخزَّن هنا — الجدولُ للخرائط وحدَها كي لا ينشأ مصدرُ حقيقةٍ ثانٍ.
    await client.query(`CREATE TABLE IF NOT EXISTS delivery_provider_city_mappings (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_row_id TEXT NOT NULL REFERENCES delivery_providers(id) ON DELETE CASCADE,
      city_id TEXT NOT NULL,
      city_name TEXT NOT NULL,
      external_id TEXT NOT NULL,
      external_name TEXT DEFAULT '',
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (provider_row_id, city_id)
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_city_map_user
      ON delivery_provider_city_mappings(user_id, city_id)`);

    // 💰 قواعدُ التسعير — «الثمنُ دالّةٌ لا رقم». بياناتٌ يكتبها التاجرُ من
    // لوحته بدل شروطٍ تُضاف في الكود مع كلّ حالةٍ جديدة.
    // provider_row_id فارغٌ ⇒ القاعدةُ تسري على كلّ الشركات.
    await client.query(`CREATE TABLE IF NOT EXISTS delivery_pricing_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_row_id TEXT REFERENCES delivery_providers(id) ON DELETE CASCADE,
      rule_type TEXT NOT NULL,
      city_id TEXT DEFAULT '',
      region TEXT DEFAULT '',
      weight_min NUMERIC,
      weight_max NUMERIC,
      order_min NUMERIC,
      order_max NUMERIC,
      fee NUMERIC NOT NULL DEFAULT 0,
      free_shipping BOOLEAN DEFAULT FALSE,
      priority INTEGER DEFAULT 0,
      enabled BOOLEAN DEFAULT TRUE,
      label TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_user
      ON delivery_pricing_rules(user_id, enabled, priority DESC)`);

    await client.query(`CREATE TABLE IF NOT EXISTS broadcasts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      target TEXT DEFAULT 'all',
      sent_to INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      type TEXT DEFAULT 'custom',
      simulated BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS templates (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      type TEXT DEFAULT 'percentage',
      value NUMERIC DEFAULT 0,
      min_order NUMERIC DEFAULT 0,
      max_uses INTEGER DEFAULT 0,
      uses INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'info',
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT,
      "user" TEXT DEFAULT 'System',
      action TEXT,
      details TEXT DEFAULT '',
      type TEXT DEFAULT 'info',
      severity TEXT DEFAULT 'info',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS loyalty_points (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'silver',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, customer_id)
    )`);

    // Learning loop — «ما لم نفهمه» (unknown queries) لتطوير المعرفة
    //
    //   **الجسرُ كان مقطوعًا.** الجدولُ يحفظ النصَّ وعددَ مرّاته فقط: كلُّ
    //   كلمةٍ يفهمها الذكاءُ الاصطناعيُّ تُنسى فورَ فهمها، فيُسأل عنها من
    //   جديدٍ في كلّ مرّة — وإن انقطع الذكاءُ عاد الجهلُ كما كان.
    //
    //   العمودان يصلانه: `ai_suggestion` يحفظ ما فهمه الذكاءُ (مفهومًا
    //   مقترحًا)، و`status` يحفظ حكمَ الإنسان. **ولا شيءَ يدخل المعرفةَ بلا
    //   اعتماد** — القانون: لا تعلُّمَ ذاتيّ.
    await client.query(`CREATE TABLE IF NOT EXISTS learning_unknowns (
      text TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query(`ALTER TABLE learning_unknowns ADD COLUMN IF NOT EXISTS ai_suggestion TEXT DEFAULT ''`).catch(() => {});
    await client.query(`ALTER TABLE learning_unknowns ADD COLUMN IF NOT EXISTS ai_concept TEXT DEFAULT ''`).catch(() => {});
    await client.query(`ALTER TABLE learning_unknowns ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_unknowns_status ON learning_unknowns(status, count DESC)`).catch(() => {});

    // ما فهمناه **غلطًا** — وردّه صاحبُه بـ«ماشي هادشي».
    //
    //   `learning_unknowns` أعلاه يلتقط ما لم نفهمه. ولم يكن لما فهمناه
    //   غلطًا قناةٌ أصلًا، مع أنّه أخطر: الصامتُ يُسأل فيُصحَّح، والواثقُ
    //   المخطئُ يمضي بالإنسان إلى بابٍ ليس بابَه — فأشدُّ أخطائنا كان وحدَه
    //   بلا قياس.
    //
    //   المفتاحُ (نصّ + حقل): نفسُ الغلطة على نفس الجملة تزيد العدّاد ولا
    //   تُكرّر السطر، فالعدّادُ العالي عطبٌ بنيويٌّ لا هفوةُ إنسان. و`said`
    //   ما ادّعيناه — بدونه نعرف أنّنا أخطأنا ولا نعرف إلى أين انحرفنا.
    await client.query(`CREATE TABLE IF NOT EXISTS learning_misreads (
      text TEXT NOT NULL,
      field TEXT NOT NULL DEFAULT 'all',
      said TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0,
      count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (text, field)
    )`);
    // الترتيبُ بالخطورة: عدّادٌ عالٍ × ثقةٌ عالية. الثقةُ العاليةُ المردودةُ
    // أسوأُ من الضعيفة — تلك تخمينٌ ظاهر، وهذه خطأٌ يمضي واثقًا.
    await client.query(`CREATE INDEX IF NOT EXISTS idx_misreads_rank ON learning_misreads(status, count DESC, confidence DESC)`).catch(() => {});

    // Performance indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_products_user_id    ON products(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_status      ON products(status)`,
      `CREATE INDEX IF NOT EXISTS idx_products_offer_type  ON products(offer_type)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id       ON orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_created       ON orders(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_user_id    ON customers(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_phone      ON customers(phone)`,
      `CREATE INDEX IF NOT EXISTS idx_convos_user_id       ON conversations(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifs_user_id       ON notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_user_id         ON audit_logs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_delivery_user_id     ON delivery_providers(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_loyalty_user_id      ON loyalty_points(user_id)`,
      // Discover/Explore hot paths (Super App)
      `CREATE INDEX IF NOT EXISTS idx_products_status_views ON products(status, views DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category     ON products(category)`,
    ];
    for (const sql of indexes) await client.query(sql);

    // OTP tokens table (Fix #3)
    await client.query(`CREATE TABLE IF NOT EXISTS otp_tokens (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_tokens(email)`);

    // Refresh tokens table (Fix #12)
    await client.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)`);

    // Fix conversation.status default (Fix #13)
    await client.query(`ALTER TABLE conversations ALTER COLUMN status SET DEFAULT 'active'`);
    await client.query(`UPDATE conversations SET status='active' WHERE status='open'`);

    // Add product video column for existing databases
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT ''`).catch(() => {});
    // المدينة: سؤالٌ إجباريٌّ في المساعد كان يسقط عند الحفظ لأنّ لا عمودَ له.
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS city TEXT DEFAULT ''`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_products_city ON products(city) WHERE city <> ''`).catch(() => {});

    // Abandoned-cart reminder flag (H-4) — لتذكير موثوق عبر cron بدل setTimeout
    await client.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS cart_reminded BOOLEAN DEFAULT FALSE`).catch(() => {});

    // Store analytics events (visits + product views) for the storefront
    await client.query(`CREATE TABLE IF NOT EXISTS store_events (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'visit',
      product_id TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      source TEXT DEFAULT 'direct',
      session_id TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_store_events_user ON store_events(user_id, created_at DESC)`);

    // ── Marketplace listings (additive — separate from products) ──
    await client.query(`CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      vendor_id TEXT,
      type TEXT NOT NULL DEFAULT 'product',
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC DEFAULT 0,
      category TEXT DEFAULT '',
      city TEXT DEFAULT '',
      images JSONB DEFAULT '[]',
      duration TEXT DEFAULT '',
      work_area TEXT DEFAULT '',
      seller_name TEXT DEFAULT '',
      seller_phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reject_reason TEXT DEFAULT '',
      promoted BOOLEAN DEFAULT FALSE,
      views INTEGER DEFAULT 0,
      details JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    // بيانات مرنة للخدمة (تخصّصات، طرق الطلب، نموذج التسعير، حقول مخصّصة) — للقواعد القائمة
    await client.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'`).catch(() => {});
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_type   ON listings(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_city   ON listings(city)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_vendor ON listings(vendor_id)`);

    // ── Marketplace reviews (trust) ──
    await client.query(`CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL DEFAULT 5,
      comment TEXT DEFAULT '',
      reviewer_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id)`);

    // ── Services Marketplace (alloservix) — بحجوزات ومقدّمي خدمات ─────────
    // كلها مقيَّدة بـ user_id (المستأجر/المتجر) على نفس نمط products/orders.
    await client.query(`CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      city TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'pending',
      is_verified BOOLEAN DEFAULT FALSE,
      rating_avg DOUBLE PRECISION DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      admin_note TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_user ON providers(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(user_id, status)`);

    await client.query(`CREATE TABLE IF NOT EXISTS provider_services (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      service_key TEXT NOT NULL,
      service_label TEXT NOT NULL,
      skill_level TEXT DEFAULT 'intermediate',
      price_min NUMERIC DEFAULT 0,
      price_max NUMERIC DEFAULT 0,
      duration_min INTEGER DEFAULT 60,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pservices_provider ON provider_services(provider_id)`);

    // جدول أسبوعي متكرر: weekday 0=الأحد..6=السبت، أوقات HH:MM
    await client.query(`CREATE TABLE IF NOT EXISTS availability_templates (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avtpl_provider ON availability_templates(provider_id)`);

    // فترات محدّدة (استثناءات/حجب) — status: open | blocked
    await client.query(`CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'open'
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avslot_provider ON availability_slots(provider_id, starts_at)`);

    await client.query(`CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      service_id TEXT REFERENCES provider_services(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 60,
      status TEXT NOT NULL DEFAULT 'pending',
      price NUMERIC DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id, scheduled_at)`);

    // ── Wallet (محفظة لكل مستخدم: رصيد + معاملات) ────────────────
    await client.query(`CREATE TABLE IF NOT EXISTS wallets (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MAD',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,            -- cashback | refund | credit | debit | payment | commission
      amount NUMERIC NOT NULL,       -- موجب=إضافة، سالب=خصم
      ref TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC)`);

    // سجلّ المدفوعات
    await client.query(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      order_id TEXT,
      provider TEXT NOT NULL,        -- cod | wallet | cmi | stripe | transfer
      amount NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MAD',
      status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | refunded
      ref TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)`);

    // Knowledge layer — عمليات بحث بلا نتيجة (تنمية القاموس من الاستعمال الحقيقي)
    // DR-0002. لا كتابة مباشرة للقاموس: هذه مادة خام تُراجَع وتُربَط بفئة يدويًا.
    await client.query(`CREATE TABLE IF NOT EXISTS search_misses (
      id TEXT PRIMARY KEY,
      raw TEXT NOT NULL,                 -- جملة المستخدم كما كتبها
      normalized TEXT NOT NULL,          -- بعد التطبيع (lowercase + مسافات)
      city TEXT,
      count INTEGER NOT NULL DEFAULT 1,  -- كم مرة تكرّرت
      first_seen TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'open',   -- open | clustered | resolved | ignored
      resolved_category TEXT,            -- الفئة التي ربطها المشرف
      resolved_by TEXT,
      resolved_at TIMESTAMPTZ
    )`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_search_misses_norm ON search_misses(normalized, COALESCE(city, ''))`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_search_misses_status ON search_misses(status, count DESC)`);

    // جودة البحث — تجميع يومي مجهّل (DR-0003 §6.b). لا هوية مستخدم: عدّادات فقط.
    await client.query(`CREATE TABLE IF NOT EXISTS search_daily (
      day DATE NOT NULL DEFAULT CURRENT_DATE,
      city TEXT,
      total INTEGER NOT NULL DEFAULT 0,   -- كل عمليات البحث الحقيقية
      hits INTEGER NOT NULL DEFAULT 0,    -- أعادت نتائج
      misses INTEGER NOT NULL DEFAULT 0   -- بلا نتيجة
    )`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_search_daily_day_city ON search_daily(day, COALESCE(city, ''))`);

    // أكثر الخدمات طلبًا — تجميع يوميّ مجهّل للمصطلح المطبَّع (نفس فلسفة search_daily:
    // عدّادات بلا هوية). كان النجاح يزيد عدّادًا فقط، فتعذّر معرفة «أفضل خدمة».
    await client.query(`CREATE TABLE IF NOT EXISTS search_terms_daily (
      day DATE NOT NULL DEFAULT CURRENT_DATE,
      term TEXT NOT NULL,                 -- المصطلح المطبَّع (لا نصّ المستخدم الخام)
      hits INTEGER NOT NULL DEFAULT 0,    -- أعادت نتائج
      total INTEGER NOT NULL DEFAULT 0
    )`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_search_terms_day_term ON search_terms_daily(day, term)`);

    // مفاهيمُ يضيفها الأدمن من الواجهة. تُقرأ حيّةً بلا إعادة نشرٍ ولا CSV.
    // status: draft (مسوّدة) · published (حيّة) — بوّابةٌ بشريّةٌ قبل أن تؤثّر في الفهم.
    await client.query(`CREATE TABLE IF NOT EXISTS custom_concepts (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT '',
      concept  JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {ar,darija,fr,en}
      variants JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {ar:[],darija:[],fr:[],en:[],arabizi:[]}
      stance   JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {offer:[],seek:[]}
      asks     JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {offer:[],seek:[]}
      links    JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {related:[],needs:[],sells:[],near:[]}
      services JSONB NOT NULL DEFAULT '[]'::jsonb,
      examples JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_custom_concepts_status ON custom_concepts(status, updated_at DESC)`);

    // ── استقرارُ المفهوم ─────────────────────────────────────
    // ثلاثُ إضافاتٍ صغيرة تجعل المعرفة قابلةً للنموّ سنواتٍ بلا إعادة تصميم.
    //
    // ① source — مَن أضاف هذا المفهوم؟ system | admin | ai | community.
    //    ليس ترفًا: طبقةُ الاقتراح الآليّ لا يجوز أن تُخلط باليدويّ، وإلّا صار
    //    التراجعُ عن دفعةِ ذكاءٍ اصطناعيٍّ سيّئةٍ مستحيلًا (لا نعرف ما هي).
    // ② status يقبل `candidate` — «اقتُرح ولم يُراجَع». بدونها يكون اقتراحُ
    //    الـAI إمّا منشورًا (خطر) أو مسوّدةً (لا يُفرَّق عن عملِ إنسانٍ ناقص).
    await client.query(`ALTER TABLE custom_concepts ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin'`);

    // ③ نسخُ المفهوم — لقطةٌ قبل كلّ كتابة. هي **شرطُ** النشر الآليّ لا رفاهيةٌ
    //    بعده: السرعةُ تصير آمنةً حين يكون التراجعُ ممكنًا. والسببُ يُملأ آليًّا
    //    بمعرّف الـmiss الذي سبّب التعديل، فيُجيب سؤال «لماذا تغيّر هذا؟» بنفسه.
    await client.query(`CREATE TABLE IF NOT EXISTS concept_versions (
      id BIGSERIAL PRIMARY KEY,
      concept_id TEXT NOT NULL,
      snapshot JSONB NOT NULL,          -- الصفُّ كاملًا قبل التعديل
      reason TEXT,                      -- miss:<id> · merge:<id> · manual
      changed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_concept_versions ON concept_versions(concept_id, id DESC)`);

    // ④ الأسماءُ البديلة — الدمجُ بلا كسر. حين يُدمَج «auto_mechanic» في
    //    «mechanic» يختفي المعرّفُ الأوّل، فينقطع كلُّ ما يشير إليه (وأهمُّه
    //    provider_concepts). هنا يُسجَّل التحويل، ويُحلّ عند القراءة، فتبقى
    //    كلُّ إشارةٍ قديمةٍ صالحةً للأبد. هذا هو «المعرّف الثابت» عمليًّا —
    //    بلا تحويلِ ٧٨ إشارةً في الكود إلى رموزٍ مبهمةٍ لا تُقرأ.
    await client.query(`CREATE TABLE IF NOT EXISTS concept_aliases (
      from_id TEXT PRIMARY KEY,
      to_id   TEXT NOT NULL,
      reason  TEXT,
      merged_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_concept_aliases_to ON concept_aliases(to_id)`);

    // ── الجسرُ المفقود: مزوّدٌ ⇄ مفهوم ──────────────────────
    // المحرّك يفهم «الورد»، ولا يعرف أيُّ مزوّدٍ بائعُ ورد. هذا الجدولُ هو
    // الشرطُ الوحيد لجملة «أيّ محلٍّ كيفما كان نوعه».
    //
    // ولماذا جدولٌ لا عمود؟ لأنّ المحلّ نادرًا ما يكون شيئًا واحدًا: المخبزةُ
    // تبيع خبزًا وقهوة، والميكانيكيّ يفعل تشخيصًا وعجلات. النشاطُ الواحد حالةٌ
    // خاصّةٌ من المتعدّد، والعكسُ غيرُ صحيح — فلو بدأنا بعمودٍ لاحتجنا هجرةً
    // مؤلمةً بعد شهر. و`is_primary` يبقي «ما هو هذا المحلّ أساسًا؟» مُجابًا.
    await client.query(`CREATE TABLE IF NOT EXISTS provider_concepts (
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      concept_id  TEXT NOT NULL,
      is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (provider_id, concept_id)
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_provider_concepts_concept ON provider_concepts(concept_id)`);
    // نشاطٌ أساسيٌّ واحدٌ لكلّ مزوّد — لا اثنان. «أساسيّان» = لا أساسيّ.
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_primary
      ON provider_concepts(provider_id) WHERE is_primary`);

    // ── الزيارة الميدانيّة ───────────────────────────────────
    // الحسابُ يُنشَأ نيابةً عن الحرفيّ، فيدخل برمزٍ مؤقّت. وبلا إجبارٍ على
    // تغييره يبقى رمزٌ يعرفه شخصان — وهذا حسابُ إنسانٍ حقيقيّ لا حسابُ تجربة.
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`);

    // المحصولُ الحقيقيُّ للزيارة ليس صفَّ المحلّ — بل **اللغة**: جملُ الزبناء،
    // وأسئلةُ التسعير، والكلماتُ التي لا يعرفها أيُّ قاموس. ولو خُزّنت هذه
    // متناثرةً لضاعت؛ ولو لم تُخزَّن خامًّا لما أمكن مراجعةُ ما فهمناه منها.
    // فالجدولُ يحفظ **ما قيل** كما قيل، والتعلّمُ منه فعلٌ لاحقٌ قابلٌ للمراجعة.
    await client.query(`CREATE TABLE IF NOT EXISTS field_visits (
      id TEXT PRIMARY KEY,
      provider_id TEXT REFERENCES providers(id) ON DELETE SET NULL,
      agent_id TEXT,                    -- مَن زار
      services_raw TEXT,                -- «عندي لافاج، طولوري، صباغة» كما نُطقت
      concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
      customer_lines JSONB NOT NULL DEFAULT '[]'::jsonb,  -- «شنو كيقولو لك الزبناء؟»
      pricing_asks  JSONB NOT NULL DEFAULT '[]'::jsonb,   -- «شنو كتسول قبل الثمن؟»
      words         JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{term, conceptId, status}]
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_field_visits_at ON field_visits(created_at DESC)`);

    // ── سلسلةُ التزكية ───────────────────────────────────────
    // «المحلّاتُ اللي كنسجّل أنا يوليو معتمدين، ويقدروا هوما يسجّلو محلّاتٍ
    // أخرى بنفس الطريقة.» فكرةٌ قويّة — وفيها فخٌّ يقتلها إن لم يُسدّ:
    //
    //   لو **ورِث** الاعتمادُ، لصار كلُّ من في السلسلة معتمَدًا بعد شهر،
    //   ولا يعني «معتمَد» شيئًا. والوسمُ الذي لا يميّز أحدًا أسوأُ من غيابه:
    //   يبيع ثقةً لا تقابلها معرفة.
    //
    // فالقاعدة: **الاعتمادُ لا يُورَث.**
    //   depth 0 = الأدمن.
    //   depth 1 = محلٌّ زرتُه بنفسي  ⇒ معتمَد، وله حقُّ تزكية غيره.
    //   depth 2 = محلٌّ زكّاه محلّ    ⇒ **مُزكًّى لا معتمَد**، وينتظر مراجعة.
    //   depth 3 = ممنوع. السلسلةُ الطويلةُ تُخفّف المسؤوليّة حتّى تنعدم.
    //
    // و`vouched_by` مكتوبٌ دائمًا: التزكيةُ اسمٌ يتحمّل، لا زرٌّ مجهول.
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 1`);
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS vouched_by TEXT REFERENCES providers(id) ON DELETE SET NULL`);
    // حصّةُ التزكية: عددٌ محدود. «بلا حدّ» تعني ٢٠٠ محلٍّ وهميٍّ في ليلة.
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS invite_quota INTEGER NOT NULL DEFAULT 0`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_vouched ON providers(vouched_by)`);

    // ── المحلُّ الذي يفتح ويُغلق ──────────────────────────────
    //
    //   **أعمدةٌ لا جداول.** الاقتراحُ الذي وصلنا كان خمسةَ جداولَ جديدة
    //   (`restaurants` · `menu_items` · `food_orders` · `delivery_persons` …)
    //   والمطعمُ **هو** `providers`، والطبقُ **هو** `products`، والطلبُ **هو**
    //   `orders`. جداولُ موازيةٌ تعني تفريعَ التقييمات والولاء والبحث والتوصيل
    //   والدفع — كلٌّ منها بتنفيذَين ينحرفان. الناقصُ فعلًا أربعةُ حقول:
    //
    //     • `opening_hours` — «مفتوح دابا؟» أوّلُ سؤالٍ يسأله جائع
    //     • `open_state`    — مفتوح · مغلق · مشغول · عطلة (يضبطه صاحبُه بيده،
    //                          فالساعاتُ المُعلَنةُ تكذب يومَ يمرض)
    //     • `prep_minutes`  — كم يُنتظَر
    //     • `delivery_modes`— ذاتيّ · شركة · جارٌ قريب · استلامٌ من المحلّ
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}'::jsonb`).catch(() => {});
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS open_state TEXT NOT NULL DEFAULT 'open'`).catch(() => {});
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS prep_minutes INTEGER NOT NULL DEFAULT 0`).catch(() => {});
    await client.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS delivery_modes TEXT[] DEFAULT ARRAY[]::TEXT[]`).catch(() => {});
    // وطريقةُ التوصيل تُحفَظ على الطلب نفسِه: الزبونُ يختار، والاختيارُ يُنفَّذ.
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT ''`).catch(() => {});

    // ── أنواعُ التحقّق ───────────────────────────────────────
    // `is_verified` بتٌّ واحدٌ يحمل **عدّة وقائعَ مختلفة**: هل وُجد المحلّ
    // فعلًا؟ هل الرجلُ صاحبُه؟ هل الموقعُ صحيح؟ هل الهاتفُ يردّ؟ وجمعُها في
    // بتٍّ واحدٍ يُفقد التفصيل: لا يمكن غدًا أن تقول «وريني اللي زرتُهم أنا
    // بنفسي» أو «اللي تأكّدنا من موقعهم». وهو نفسُ صنفِ الخطأ الذي أصلحناه
    // مرارًا: شيئان مختلفان في حقلٍ واحد.
    //
    // فالتحقّقُ **وقائعُ** لكلٍّ منها صاحبٌ ووقت، لا صفةٌ واحدة.
    // و`is_verified` يبقى **مشتقًّا**: صحيحٌ متى وُجدت واقعةُ `business`.
    // مشتقٌّ لا مصدرٌ ثانٍ — كاتبٌ واحدٌ يضبطه (db.verifyProvider).
    //
    // وسمعةُ الزبائن ليست تحقّقًا: هي `rating_avg`/`reviews` وموجودةٌ أصلًا.
    // إدراجُها هنا تكرارٌ لمصدرٍ قائم.
    await client.query(`CREATE TABLE IF NOT EXISTS provider_verifications (
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,               -- business | identity | location | phone
      verified_by TEXT,
      verified_at TIMESTAMPTZ DEFAULT NOW(),
      note TEXT,
      PRIMARY KEY (provider_id, kind)
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pverif_kind ON provider_verifications(kind, verified_at DESC)`);

    // الزيارةُ كيانٌ قائم: تُعاد، وتُقارَن، ويُعرَف من قام بها. الإحداثيّاتُ
    // والمدّةُ يجعلانها قابلةً للمراجعة — «واش فعلًا مشى للمحلّ؟» سؤالٌ
    // مشروعٌ حين يكبر الفريق، وجوابُه لا يُخترَع بعد سنة.
    await client.query(`ALTER TABLE field_visits ADD COLUMN IF NOT EXISTS gps_lat DOUBLE PRECISION`);
    await client.query(`ALTER TABLE field_visits ADD COLUMN IF NOT EXISTS gps_lng DOUBLE PRECISION`);
    await client.query(`ALTER TABLE field_visits ADD COLUMN IF NOT EXISTS duration_sec INTEGER`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_field_visits_provider ON field_visits(provider_id, created_at DESC)`);

    // Learning Loop — تجميع يومي مجهّل لمراحل القمع (DR-0004). لا هوية مستخدم.
    // شكل طويل (day, stage) → إضافة مرحلة جديدة بلا هجرة (القانون ٩).
    await client.query(`CREATE TABLE IF NOT EXISTS learning_daily (
      day DATE NOT NULL DEFAULT CURRENT_DATE,
      stage TEXT NOT NULL,               -- view | click | contact | booking | order | review
      count INTEGER NOT NULL DEFAULT 0
    )`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_daily ON learning_daily(day, stage)`);

    // FK fixes: loyalty_points.customer_id → customers(id) ON DELETE CASCADE
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'loyalty_points_customer_id_fkey'
        ) THEN
          ALTER TABLE loyalty_points
            ADD CONSTRAINT loyalty_points_customer_id_fkey
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
        END IF;
      END $$
    `).catch(() => {});

    // FK fix: audit_logs.user_id → users(id) ON DELETE SET NULL
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'audit_logs_user_id_fkey'
        ) THEN
          ALTER TABLE audit_logs
            ADD CONSTRAINT audit_logs_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$
    `).catch(() => {});

    // Demand Capture — حاجةٌ لم يجد لها السوق عرضًا. أهمّ جدولٍ في البيتا:
    // سوقٌ جديد يبدأ فارغًا، فكلّ «ما لقيناش» بلا التقاطٍ هو زبونٌ ضائع
    // وإشارةُ طلبٍ مهدورة. هذه الصفوف هي ما نذهب به إلى الحرفيّين:
    // «عندي ١٧ زبونًا كيقلّبو على سبّاك فسلا — بغيتي؟».
    await client.query(`CREATE TABLE IF NOT EXISTS need_requests (
      id TEXT PRIMARY KEY,
      raw TEXT NOT NULL,                 -- ما كتبه الإنسان بلغته
      concept TEXT,                      -- المفهوم إن فُهم (سبّاك…)
      city TEXT,
      contact TEXT,                       -- هاتف/بريد — اختياريّ
      contact_kind TEXT,                  -- phone | email
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'open',-- open | matched | closed
      matched_business TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_need_requests_open
      ON need_requests(status, concept, city, created_at DESC)`);

    // ── ذاكرةُ المستخدم: ما يعرفه التطبيقُ عن شخصٍ بعينه ────────────
    // تسعةُ مخازنِ معرفةٍ كانت تعيش في `localStorage` وحدَه، فيفقدها مَن يبدّل
    // هاتفَه ولا يجدها مَن يفتح من حاسوبٍ آخر. صفٌّ لكلّ مخزن، والدمجُ في
    // `lib/userMemory.js` — لأنّ جهازَين يتعلّمان أشياءَ مختلفة.
    await client.query(`CREATE TABLE IF NOT EXISTS user_memory (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value JSONB NOT NULL DEFAULT '{}',
      -- مصدرُ آخر كتابة: يُميّز ما رُفع من متصفّحٍ قديم عن كتابةٍ حيّة.
      source TEXT DEFAULT 'client',
      -- عدّادٌ يتزايد مع كلّ دمج: يعرف العميلُ أنّ عنده قديمًا بلا مقارنة القيمة.
      rev INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, key)
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_memory_user
      ON user_memory(user_id, updated_at DESC)`);

    await client.query('COMMIT');
    console.log('[DB] ✅ Migrations complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] ❌ Migration failed — rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = migrate;

// ── تشغيلٌ مباشر ──────────────────────────────────────────────
//
//   بلا هذا كان `node migrate.js` **يُحمِّل الدالّةَ ويخرج بلا عمل**، ولا
//   شيءَ يقول إنّه لم يحدث شيء: صفرُ خرجٍ وصفرُ خطأ. فتُنشَأ قاعدةُ تطويرٍ
//   نظيفةٌ ويُظنّ أنّها مُرحَّلة، ثمّ تسقط الاختباراتُ بـ«relation does not
//   exist» فيُظنّ العطبُ في الاختبار لا في الترحيل.
//
//   الإنتاجُ لم يُصَب: `server/index.js` ينتظر `migrate()` عند الإقلاع.
//   العطبُ كان في الطريق اليدويّ وحدَه — وهو الطريقُ الذي يسلكه كلُّ من
//   يهيّئ بيئتَه لأوّل مرّة.
if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}