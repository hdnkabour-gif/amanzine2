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
    await client.query(`CREATE TABLE IF NOT EXISTS learning_unknowns (
      text TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

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
