'use strict';
const pool    = require('./db');
const crypto  = require('crypto');
const secrets = require('./lib/secrets');

function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

// ── Column mappers (snake_case PG → camelCase API) ────────────

function _mapProduct(p) {
  if (!p) return null;
  return {
    id:            p.id,
    userId:        p.user_id,
    name:          p.name,
    description:   p.description   || '',
    price:         +p.price        || 0,
    cost:          +p.cost         || 0,
    stock:         +p.stock        || 0,
    sku:           p.sku           || '',
    category:      p.category      || '',
    emoji:         p.emoji         || '📦',
    images:        Array.isArray(p.images)       ? p.images       : [],
    sizes:         Array.isArray(p.sizes)        ? p.sizes        : [],
    colors:        Array.isArray(p.colors)       ? p.colors       : [],
    colorImages:   (p.color_images && typeof p.color_images === 'object') ? p.color_images : {},
    imageUrl:      p.image_url     || '',
    videoUrl:      p.video_url     || '',
    isForChildren: !!p.is_for_children,
    ageRange:      p.age_range     || '',
    sizeType:      p.size_type     || 'adult',
    views:         +p.views        || 0,
    sales:         +p.sales        || 0,
    status:        p.status        || 'draft',
    type:          p.offer_type    || 'product',
    offer_type:    p.offer_type    || 'product',
    duration:      p.duration      || '',
    workArea:      p.service_area  || '',
    service_area:  p.service_area  || '',
    portfolio:     Array.isArray(p.portfolio)    ? p.portfolio    : [],
    customFields:  Array.isArray(p.custom_fields)? p.custom_fields: [],
    createdAt:     p.created_at ? new Date(p.created_at).toISOString() : now(),
  };
}

function _mapCoupon(c) {
  if (!c) return null;
  return {
    id: c.id, userId: c.user_id, code: c.code, type: c.type,
    value: +c.value, minOrder: +c.min_order, maxUses: +c.max_uses,
    uses: +c.uses, usedCount: +c.uses, active: !!c.active,
    expiresAt: c.expires_at ? new Date(c.expires_at).toISOString() : null,
    createdAt: c.created_at ? new Date(c.created_at).toISOString() : now(),
  };
}

function _mapCustomer(c) {
  if (!c) return null;
  return {
    id:            c.id,
    userId:        c.user_id,
    name:          c.name,
    phone:         c.phone           || '',
    email:         c.email           || '',
    city:          c.city            || '',
    address:       c.address         || '',
    notes:         c.notes           || '',
    vip:           !!c.vip,
    source:        c.source          || 'manual',
    trustScore:    +c.trust_score    || 80,
    buyerScore:    +c.buyer_score    || 50,
    totalSpent:    +c.total_spent    || 0,
    totalOrders:   +c.total_orders   || 0,
    lastOrderDate: c.last_order_date || '',
    createdAt:     c.created_at ? new Date(c.created_at).toISOString() : now(),
  };
}

function _mapOrder(o) {
  if (!o) return null;
  return {
    id:               o.id,
    userId:           o.user_id,
    customerId:       o.customer_id     || '',
    customerName:     o.customer_name   || '',
    customerPhone:    o.customer_phone  || '',
    items:            Array.isArray(o.items) ? o.items : [],
    total:            +o.total          || 0,
    status:           o.status          || 'pending',
    notes:            o.notes           || '',
    address:          o.address         || '',
    city:             o.city            || '',
    source:           o.source          || 'manual',
    deliveryProvider: o.delivery_provider || '',
    trackingNumber:   o.tracking_number  || '',
    livoOrderId:      o.livo_order_id   || '',   // ⬅️ جديد
    needsReview:      !!o.needs_review,
    reviewReason:     o.review_reason    || '',
    customerCode:     o.customer_code    || '',
    createdAt:        o.created_at ? new Date(o.created_at).toISOString() : now(),
  };
}

function _mapConv(c) {
  if (!c) return null;
  return {
    id:             c.id,
    userId:         c.user_id,
    customerId:     c.customer_id    || '',
    customerName:   c.customer_name  || '',
    customerPhone:  c.customer_phone || '',
    source:         c.source         || 'manual',
    status:         c.status         || 'active',
    lastMessage:    c.last_message   || '',
    messages:       Array.isArray(c.messages) ? c.messages : [],
    unread:         +c.unread        || 0,
    priority:       c.priority       || 'medium',
    mood:           c.mood           || 'neutral',
    pinned:         !!c.pinned,
    label:          c.label          || '',
    createdAt:      c.created_at ? new Date(c.created_at).toISOString() : now(),
  };
}

function _mapDelivery(p) {
  if (!p) return null;
  return {
    id:           p.id,
    userId:       p.user_id,
    name:         p.name,
    websiteUrl:   p.website_url    || '',
    addOrderPage: p.add_order_page || '',
    trackingUrl:  p.tracking_url   || '',
    phone:        p.phone          || '',
    cost:         +p.cost          || 0,
    enabled:      !!p.enabled,
    apiType:      p.api_type       || '',
    apiKey:       p.api_key        || '',
    apiEndpoint:  p.api_endpoint   || '',
    webhookUrl:   p.webhook_url    || '',
    createdAt:    p.created_at ? new Date(p.created_at).toISOString() : now(),
  };
}

// ── Flat DB API ───────────────────────────────────────────────
const db = {

  // ── Users ────────────────────────────────────────────────────
  async getUser(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },
  async getUserByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [(email || '').toLowerCase()]);
    return rows[0] || null;
  },
  async listUsers() {
    const { rows } = await pool.query('SELECT * FROM users');
    return rows;
  },
  async createUser({ name, email, password, role = 'admin' }) {
    const id = uid();
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password, role) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, name.trim(), email.toLowerCase().trim(), password, role]
    );
    return rows[0];
  },
  async updateUser(id, u) {
    const allowed = ['name', 'email', 'password', 'role'];
    const parts = []; const vals = [id]; let idx = 2;
    for (const k of allowed) {
      if (u[k] !== undefined) { parts.push(`${k} = $${idx++}`); vals.push(u[k]); }
    }
    if (!parts.length) return;
    await pool.query(`UPDATE users SET ${parts.join(', ')} WHERE id = $1`, vals);
  },
  async updateUserPassword(id, hashed) {
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, id]);
  },

  // ── Settings ─────────────────────────────────────────────────
  async getSettings(userId) {
    const { rows } = await pool.query('SELECT data FROM settings WHERE user_id = $1', [userId]);
    return rows[0] ? secrets.decryptSettings(rows[0].data) : null;
  },
  async saveSettings(userId, data) {
    await pool.query(
      `INSERT INTO settings (user_id, data, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(secrets.encryptSettings(data))]
    );
    return data;
  },

  // ── Products ─────────────────────────────────────────────────
  async getProducts(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC', [userId]
    );
    return rows.map(_mapProduct);
  },
  async getProduct(id) {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return _mapProduct(rows[0]) || null;
  },
  async createProduct(p) {
    const id = p.id || uid();
    const { rows } = await pool.query(
      `INSERT INTO products
        (id,user_id,name,description,price,cost,stock,sku,category,emoji,
         images,sizes,colors,color_images,image_url,video_url,is_for_children,age_range,
         size_type,views,sales,status,offer_type,duration,service_area,
         portfolio,custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
       RETURNING *`,
      [
        id, p.userId, p.name || '', p.description || '',
        +p.price || 0, +(p.cost || 0), +(p.stock || 0),
        p.sku || id.slice(0, 8).toUpperCase(),
        p.category || '', p.emoji || '📦',
        JSON.stringify(p.images || []),
        JSON.stringify(p.sizes || []),
        JSON.stringify(p.colors || []),
        JSON.stringify(p.colorImages || {}),
        p.imageUrl || '',
        p.videoUrl || '',
        p.isForChildren ? true : false,
        p.ageRange || '',
        p.sizeType || 'adult',
        0, 0,
        p.status || 'draft',
        p.offer_type || p.type || 'product',
        p.duration || '',
        p.service_area || p.workArea || '',
        JSON.stringify(p.portfolio || []),
        JSON.stringify(p.customFields || p.custom_fields || []),
      ]
    );
    return _mapProduct(rows[0]);
  },
  async updateProduct(id, u) {
    const map = {
      name:         'name',         description:  'description',  price:   'price',
      cost:         'cost',         stock:        'stock',        sku:     'sku',
      category:     'category',     emoji:        'emoji',        status:  'status',
      imageUrl:     'image_url',    videoUrl:     'video_url',    images:  'images',       sizes:   'sizes',
      colors:       'colors',       colorImages:  'color_images', isForChildren: 'is_for_children',
      ageRange:     'age_range',    sizeType:     'size_type',    views:   'views',
      sales:        'sales',        offer_type:   'offer_type',   type:    'offer_type',
      duration:     'duration',     service_area: 'service_area', workArea: 'service_area',
      portfolio:    'portfolio',    customFields: 'custom_fields',custom_fields: 'custom_fields',
    };
    const parts = []; const vals = [id]; let idx = 2;
    for (const [jsKey, pgCol] of Object.entries(map)) {
      if (u[jsKey] === undefined) continue;
      const v = u[jsKey];
      parts.push(`${pgCol} = $${idx++}`);
      vals.push(Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);
    }
    if (!parts.length) return this.getProduct(id);
    parts.push(`updated_at = NOW()`);
    if (u.userId) { vals.push(u.userId); await pool.query(`UPDATE products SET ${parts.join(', ')} WHERE id = $1 AND user_id = $${idx}`, vals); }
    else await pool.query(`UPDATE products SET ${parts.join(', ')} WHERE id = $1`, vals);
    return this.getProduct(id);
  },
  async deleteProduct(id, userId) {
    if (userId) await pool.query('DELETE FROM products WHERE id = $1 AND user_id = $2', [id, userId]);
    else await pool.query('DELETE FROM products WHERE id = $1', [id]);
  },
  async incrementProductViews(id) {
    await pool.query('UPDATE products SET views = COALESCE(views,0) + 1 WHERE id = $1', [id]).catch(() => {});
  },

  // ── Store analytics events ───────────────────────────────────
  async addStoreEvent({ userId, type = 'visit', productId = '', productName = '', source = 'direct', sessionId = '' }) {
    if (!userId) return;
    await pool.query(
      `INSERT INTO store_events (user_id, type, product_id, product_name, source, session_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, type, productId, productName, source, sessionId]
    ).catch(() => {});
  },
  async getStoreEvents(userId, sinceDays = 30) {
    const { rows } = await pool.query(
      `SELECT type, product_id, product_name, source, session_id, created_at
       FROM store_events
       WHERE user_id = $1 AND created_at >= NOW() - ($2 || ' days')::interval
       ORDER BY created_at DESC LIMIT 5000`,
      [userId, String(sinceDays)]
    ).catch(() => ({ rows: [] }));
    return rows;
  },

  // ── Customers ────────────────────────────────────────────────
  async getCustomers(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM customers WHERE user_id = $1 ORDER BY total_spent DESC', [userId]
    );
    return rows.map(_mapCustomer);
  },
  async getCustomer(id) {
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    return _mapCustomer(rows[0]) || null;
  },
  async createCustomer(c) {
    const id = uid();
    const { rows } = await pool.query(
      `INSERT INTO customers
        (id,user_id,name,phone,email,city,address,notes,vip,source,trust_score,buyer_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id, c.userId, c.name, c.phone || '', c.email || '',
        c.city || '', c.address || '', c.notes || '',
        c.vip ? true : false,
        c.source || 'manual',
        c.trustScore || 80, c.buyerScore || 50,
      ]
    );
    return _mapCustomer(rows[0]);
  },
  async updateCustomer(id, u) {
    const map = {
      name: 'name', phone: 'phone', email: 'email', city: 'city',
      address: 'address', notes: 'notes', vip: 'vip', source: 'source',
      trustScore: 'trust_score', buyerScore: 'buyer_score',
      totalOrders: 'total_orders', totalSpent: 'total_spent',
      lastOrderDate: 'last_order_date',
    };
    const parts = []; const vals = [id]; let idx = 2;
    for (const [jsKey, pgCol] of Object.entries(map)) {
      if (u[jsKey] === undefined) continue;
      parts.push(`${pgCol} = $${idx++}`);
      vals.push(u[jsKey]);
    }
    if (!parts.length) return this.getCustomer(id);
    if (u.userId) { vals.push(u.userId); await pool.query(`UPDATE customers SET ${parts.join(', ')} WHERE id = $1 AND user_id = $${idx}`, vals); }
    else await pool.query(`UPDATE customers SET ${parts.join(', ')} WHERE id = $1`, vals);
    return this.getCustomer(id);
  },
  async deleteCustomer(id, userId) {
    if (userId) await pool.query('DELETE FROM customers WHERE id = $1 AND user_id = $2', [id, userId]);
    else await pool.query('DELETE FROM customers WHERE id = $1', [id]);
  },

  // ── Orders ───────────────────────────────────────────────────
  async getOrders(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]
    );
    return rows.map(_mapOrder);
  },
  async getOrder(id) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return _mapOrder(rows[0]) || null;
  },
  async findOrderByCode(userId, code) {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 AND UPPER(customer_code) = UPPER($2) LIMIT 1',
      [userId, String(code || '').trim()]
    );
    return _mapOrder(rows[0]) || null;
  },
  async createOrder(o) {
    const id = uid();
    const customerCode = o.customerCode || crypto.randomBytes(4).toString('hex').toUpperCase();
    const { rows } = await pool.query(
      `INSERT INTO orders
        (id,user_id,customer_id,customer_name,customer_phone,city,address,
         items,total,status,source,notes,customer_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        id, o.userId, o.customerId || '', o.customerName || '',
        o.customerPhone || '', o.city || '', o.address || '',
        JSON.stringify(o.items || []),
        +o.total || 0,
        o.status || 'pending',
        o.source || 'manual',
        o.notes || '',
        customerCode,
      ]
    );
    return _mapOrder(rows[0]);
  },
  async updateOrder(id, u) {
    const map = {
      customerId:       'customer_id',      customerName:    'customer_name',
      customerPhone:    'customer_phone',   city:            'city',
      address:          'address',          items:           'items',
      total:            'total',            status:          'status',
      source:           'source',           deliveryProvider:'delivery_provider',
      trackingNumber:   'tracking_number',  notes:           'notes',
      needsReview:      'needs_review',     reviewReason:    'review_reason',
      customerCode:     'customer_code',
      livoOrderId:      'livo_order_id',   // ⬅️ جديد
    };
    const parts = []; const vals = [id]; let idx = 2;
    for (const [jsKey, pgCol] of Object.entries(map)) {
      if (u[jsKey] === undefined) continue;
      const v = u[jsKey];
      parts.push(`${pgCol} = $${idx++}`);
      vals.push(Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);
    }
    if (!parts.length) return this.getOrder(id);
    parts.push(`updated_at = NOW()`);
    if (u.userId) {
      vals.push(u.userId);
      await pool.query(`UPDATE orders SET ${parts.join(', ')} WHERE id = $1 AND user_id = $${idx}`, vals);
    } else {
      await pool.query(`UPDATE orders SET ${parts.join(', ')} WHERE id = $1`, vals);
    }
    return this.getOrder(id);
  },
  async deleteOrder(id, userId) {
    if (userId) await pool.query('DELETE FROM orders WHERE id = $1 AND user_id = $2', [id, userId]);
    else await pool.query('DELETE FROM orders WHERE id = $1', [id]);
  },

  // Atomic: find-or-create customer + create order in one transaction
  async createOrderWithCustomer(orderData, customerData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query(
        'SELECT * FROM customers WHERE user_id = $1 AND phone = $2',
        [customerData.userId, customerData.phone || '']
      );
      let customer;
      if (existing.length) {
        customer = _mapCustomer(existing[0]);
        await client.query(
          "UPDATE customers SET last_order_date = $1 WHERE id = $2",
          [new Date().toISOString().split('T')[0], customer.id]
        );
      } else {
        const cid = uid();
        const { rows: nc } = await client.query(
          `INSERT INTO customers (id,user_id,name,phone,email,city,address,notes,vip,source,trust_score,buyer_score)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [cid, customerData.userId, customerData.name, customerData.phone || '',
           customerData.email || '', customerData.city || '', customerData.address || '',
           customerData.notes || '', false, customerData.source || 'manual', 80, 50]
        );
        customer = _mapCustomer(nc[0]);
      }
      const oid = uid();
      const cc = orderData.customerCode || crypto.randomBytes(4).toString('hex').toUpperCase();
      const { rows: no } = await client.query(
        `INSERT INTO orders (id,user_id,customer_id,customer_name,customer_phone,city,address,items,total,status,source,notes,customer_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [oid, orderData.userId, customer.id, orderData.customerName || '',
         orderData.customerPhone || '', orderData.city || '', orderData.address || '',
         JSON.stringify(orderData.items || []),
         +orderData.total || 0,
         orderData.status || 'pending',
         orderData.source || 'manual',
         orderData.notes || '',
         cc]
      );
      const order = _mapOrder(no[0]);
      await client.query('COMMIT');
      return { order, customer };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Conversations ─────────────────────────────────────────────
  async getConversations(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC', [userId]
    );
    return rows.map(_mapConv);
  },
  async getConversation(id) {
    const { rows } = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
    return _mapConv(rows[0]) || null;
  },
  async createConversation(c) {
    const id = uid();
    const { rows } = await pool.query(
      `INSERT INTO conversations
        (id,user_id,customer_id,customer_name,customer_phone,source,status,
         last_message,messages,unread,priority,mood,pinned,label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        id, c.userId, c.customerId || '', c.customerName || '',
        c.customerPhone || '', c.source || 'manual', c.status || 'active',
        c.lastMessage || '',
        JSON.stringify(c.messages || []),
        c.unread || 0, c.priority || 'medium', c.mood || 'neutral',
        c.pinned ? true : false, c.label || '',
      ]
    );
    return _mapConv(rows[0]);
  },
  async updateConversation(id, u) {
    const map = {
      customerId: 'customer_id', customerName: 'customer_name',
      customerPhone: 'customer_phone', source: 'source', status: 'status',
      lastMessage: 'last_message', messages: 'messages', unread: 'unread',
      priority: 'priority', mood: 'mood', pinned: 'pinned', label: 'label',
    };
    const parts = []; const vals = [id]; let idx = 2;
    for (const [jsKey, pgCol] of Object.entries(map)) {
      if (u[jsKey] === undefined) continue;
      const v = u[jsKey];
      parts.push(`${pgCol} = $${idx++}`);
      vals.push(Array.isArray(v) || (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);
    }
    if (!parts.length) return this.getConversation(id);
    parts.push(`updated_at = NOW()`);
    await pool.query(`UPDATE conversations SET ${parts.join(', ')} WHERE id = $1`, vals);
    return this.getConversation(id);
  },
  async addMessage(convId, { content, role }) {
    const conv = await this.getConversation(convId);
    if (!conv) return null;
    const msg = { id: uid(), content, role, timestamp: Date.now() };
    const messages = [...conv.messages, msg];
    await this.updateConversation(convId, {
      messages,
      lastMessage: content,
      unread: role === 'customer' ? (conv.unread || 0) + 1 : conv.unread,
    });
    return msg;
  },
  async deleteConversation(id) {
    await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
  },

  // ── Abandoned-cart reminders ────────────────────────────────
  async getAbandonedConversations(limit = 200) {
    const { rows } = await pool.query(
      `SELECT c.* FROM conversations c
       WHERE c.cart_reminded = FALSE
         AND c.status = 'active'
         AND c.created_at < NOW() - INTERVAL '24 hours'
         AND NOT EXISTS (
           SELECT 1 FROM orders o
           WHERE o.user_id = c.user_id AND o.customer_id = c.customer_id
             AND o.created_at > c.created_at
         )
       ORDER BY c.created_at ASC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }));
    return rows.map(_mapConv);
  },
  async markCartReminded(id) {
    await pool.query('UPDATE conversations SET cart_reminded = TRUE WHERE id = $1', [id]).catch(() => {});
  },

  // ── Delivery providers ────────────────────────────────────────
  async getDeliveryProviders(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM delivery_providers WHERE user_id = $1 ORDER BY name', [userId]
    );
    return rows.map(_mapDelivery);
  },
  async upsertDeliveryProvider(p) {
    if (p.id) {
      const { rows: ex } = await pool.query('SELECT id FROM delivery_providers WHERE id = $1', [p.id]);
      if (ex.length) {
        await pool.query(
          `UPDATE delivery_providers SET name=$1,website_url=$2,add_order_page=$3,tracking_url=$4,
           phone=$5,cost=$6,enabled=$7,api_type=$8,api_key=$9,api_endpoint=$10,webhook_url=$11
           WHERE id=$12`,
          [p.name, p.websiteUrl||'', p.addOrderPage||'', p.trackingUrl||'',
           p.phone||'', +(p.cost||0), p.enabled!==false,
           p.apiType||'', p.apiKey||'', p.apiEndpoint||'', p.webhookUrl||'', p.id]
        );
        return;
      }
    }
    const id = uid();
    await pool.query(
      `INSERT INTO delivery_providers
        (id,user_id,name,website_url,add_order_page,tracking_url,phone,cost,enabled,api_type,api_key,api_endpoint,webhook_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, p.userId, p.name, p.websiteUrl||'', p.addOrderPage||'', p.trackingUrl||'',
       p.phone||'', +(p.cost||0), true,
       p.apiType||'', p.apiKey||'', p.apiEndpoint||'', p.webhookUrl||'']
    );
  },
  async deleteDeliveryProvider(id, userId) {
    if (userId) await pool.query('DELETE FROM delivery_providers WHERE id = $1 AND user_id = $2', [id, userId]);
    else await pool.query('DELETE FROM delivery_providers WHERE id = $1', [id]);
  },

  // ── Broadcasts ────────────────────────────────────────────────
  async getBroadcasts(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM broadcasts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [userId]
    );
    return rows.map(b => ({
      id: b.id, userId: b.user_id, message: b.message,
      target: b.target, sentTo: +b.sent_to, failed: +b.failed,
      type: b.type, simulated: !!b.simulated,
      createdAt: new Date(b.created_at).toISOString(),
    }));
  },
  async saveBroadcast({ userId, message, target, sentTo, failed, type, simulated }) {
    await pool.query(
      `INSERT INTO broadcasts (id,user_id,message,target,sent_to,failed,type,simulated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uid(), userId, message, target||'all', sentTo||0, failed||0, type||'custom', !!simulated]
    );
  },

  // ── Templates ─────────────────────────────────────────────────
  async getTemplates(userId) {
    const { rows } = await pool.query('SELECT data FROM templates WHERE user_id = $1', [userId]);
    return rows[0] ? (Array.isArray(rows[0].data) ? rows[0].data : []) : [];
  },
  async saveTemplates(userId, data) {
    await pool.query(
      `INSERT INTO templates (user_id, data, updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (user_id) DO UPDATE SET data=$2, updated_at=NOW()`,
      [userId, JSON.stringify(data)]
    );
  },

  // ── Coupons ───────────────────────────────────────────────────
  async getCoupons(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM coupons WHERE user_id = $1 ORDER BY created_at DESC', [userId]
    );
    return rows.map(_mapCoupon);
  },
  async getCouponByCode(userId, code) {
    const { rows } = await pool.query(
      'SELECT * FROM coupons WHERE user_id = $1 AND UPPER(code) = UPPER($2) LIMIT 1',
      [userId, String(code || '').trim()]
    );
    return rows[0] || null;
  },
  async getCoupon(id) {
    const { rows } = await pool.query('SELECT * FROM coupons WHERE id = $1', [id]);
    return _mapCoupon(rows[0]) || null;
  },
  async validateCoupon(userId, code, orderTotal = 0) {
    const c = await this.getCouponByCode(userId, code);
    if (!c) return { valid: false, discount: 0, message: 'الكود غير صحيح' };
    if (c.active === false) return { valid: false, discount: 0, message: 'هذا الكوبون غير مفعّل' };
    if (c.expires_at && new Date(c.expires_at) < new Date())
      return { valid: false, discount: 0, message: 'انتهت صلاحية الكوبون' };
    if (+c.max_uses > 0 && +c.uses >= +c.max_uses)
      return { valid: false, discount: 0, message: 'استُنفد عدد مرات استخدام الكوبون' };
    if (+c.min_order > 0 && orderTotal < +c.min_order)
      return { valid: false, discount: 0, message: `الحد الأدنى للطلب ${+c.min_order} درهم` };
    let discount = 0;
    if (c.type === 'fixed') discount = Math.min(+c.value, orderTotal);
    else if (c.type === 'shipping') discount = 0;
    else discount = Math.round(orderTotal * (+c.value / 100));
    return { valid: true, discount, type: c.type, value: +c.value, couponId: c.id, freeShipping: c.type === 'shipping' };
  },
  async incrementCouponUse(id) {
    await pool.query('UPDATE coupons SET uses = uses + 1 WHERE id = $1', [id]);
  },
  async countCouponsCreatedToday(userId, codePrefix) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM coupons
       WHERE user_id = $1 AND code LIKE $2 AND created_at > NOW() - INTERVAL '1 day'`,
      [userId, `${codePrefix}%`]
    );
    return rows[0]?.n || 0;
  },
  async createCoupon(c) {
    const id = uid();
    const { rows } = await pool.query(
      `INSERT INTO coupons (id,user_id,code,type,value,min_order,max_uses,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, c.userId, c.code, c.type||'percentage', +c.value||0,
       +c.minOrder||0, +c.maxUses||0, c.expiresAt||null]
    );
    return _mapCoupon(rows[0]);
  },
  async updateCoupon(id, u, userId) {
    const map = { code:'code', type:'type', value:'value', minOrder:'min_order',
                  maxUses:'max_uses', uses:'uses', active:'active', expiresAt:'expires_at' };
    const parts = []; const vals = [id]; let idx = 2;
    for (const [jsKey, pgCol] of Object.entries(map)) {
      if (u[jsKey] === undefined) continue;
      parts.push(`${pgCol} = $${idx++}`); vals.push(u[jsKey]);
    }
    if (!parts.length) return;
    if (userId) { vals.push(userId); await pool.query(`UPDATE coupons SET ${parts.join(', ')} WHERE id = $1 AND user_id = $${idx}`, vals); }
    else await pool.query(`UPDATE coupons SET ${parts.join(', ')} WHERE id = $1`, vals);
  },
  async deleteCoupon(id, userId) {
    if (userId) await pool.query('DELETE FROM coupons WHERE id = $1 AND user_id = $2', [id, userId]);
    else await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
  },

  // ── Notifications ─────────────────────────────────────────────
  async getNotifications(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`, [userId]
    );
    return rows.map(n => ({
      id: n.id, userId: n.user_id, type: n.type,
      message: n.message, read: !!n.read,
      timestamp: new Date(n.created_at).getTime(),
      createdAt: new Date(n.created_at).toISOString(),
    }));
  },
  async addNotification({ userId, type = 'info', message }) {
    await pool.query(
      'INSERT INTO notifications (id,user_id,type,message) VALUES ($1,$2,$3,$4)',
      [uid(), userId, type, message]
    );
  },
  async markAllRead(userId) {
    await pool.query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [userId]);
  },
  async clearNotifications(userId) {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
  },

  // ── Logs ─────────────────────────────────────────────────────
  async addLog({ userId, user = 'System', action, details = '', type = 'info', severity = 'info' }) {
    await pool.query(
      `INSERT INTO audit_logs (user_id,"user",action,details,type,severity) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, user, action, details, type, severity]
    );
  },
  async getLogs(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY id DESC LIMIT 500`, [userId]
    );
    return rows.map(r => ({
      id: r.id, userId: r.user_id, user: r.user,
      action: r.action, details: r.details, type: r.type,
      severity: r.severity,
      timestamp: new Date(r.created_at).toISOString(),
    }));
  },

  // ── Loyalty ───────────────────────────────────────────────────
  async getLoyalty(userId, customerId) {
    const { rows } = await pool.query(
      'SELECT * FROM loyalty_points WHERE user_id=$1 AND customer_id=$2', [userId, customerId]
    );
    return rows[0] || null;
  },
  async getLoyaltyAll(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM loyalty_points WHERE user_id=$1 ORDER BY total_earned DESC', [userId]
    );
    return rows;
  },
  async addLoyaltyPoints(userId, customerId, amount) {
    const pts = Math.floor(amount / 10);
    if (pts <= 0) return;
    const existing = await this.getLoyalty(userId, customerId);
    if (existing) {
      const newTotal = (existing.total_earned || 0) + pts;
      const tier = newTotal >= 5000 ? 'diamond' : newTotal >= 2000 ? 'gold' : 'silver';
      await pool.query(
        `UPDATE loyalty_points SET points=points+$1,total_earned=total_earned+$2,tier=$3,updated_at=NOW()
         WHERE user_id=$4 AND customer_id=$5`,
        [pts, pts, tier, userId, customerId]
      );
    } else {
      const tier = pts >= 5000 ? 'diamond' : pts >= 2000 ? 'gold' : 'silver';
      await pool.query(
        `INSERT INTO loyalty_points (user_id,customer_id,points,total_earned,tier)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,customer_id) DO UPDATE
         SET points=loyalty_points.points+$3, total_earned=loyalty_points.total_earned+$4,
             tier=$5, updated_at=NOW()`,
        [userId, customerId, pts, pts, tier]
      );
    }
  },
  async redeemLoyaltyPoints(userId, customerId, pts) {
    await pool.query(
      `UPDATE loyalty_points SET points=GREATEST(0,points-$1),updated_at=NOW()
       WHERE user_id=$2 AND customer_id=$3`,
      [pts, userId, customerId]
    );
  },
};

// ── OTP functions ──────────────────────────────────────────────
db.createOTP = async ({ email, code, expiresAt }) => {
  await pool.query(
    `INSERT INTO otp_tokens (email, code, expires_at) VALUES ($1, $2, $3)`,
    [email.toLowerCase(), code, expiresAt]
  );
};
db.getValidOTP = async (email, code) => {
  const r = await pool.query(
    `SELECT * FROM otp_tokens WHERE email=$1 AND code=$2 AND used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase(), code]
  );
  return r.rows[0] || null;
};
db.invalidateOTPs = async (email) => {
  await pool.query(`UPDATE otp_tokens SET used=TRUE WHERE email=$1`, [email.toLowerCase()]);
};

// ── Refresh token functions ────────────────────────────────────
db.createRefreshToken = async (userId, tokenHash, expiresAt) => {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
};
db.getRefreshToken = async (tokenHash) => {
  const r = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked=FALSE AND expires_at > NOW()`,
    [tokenHash]
  );
  return r.rows[0] || null;
};
db.revokeRefreshToken = async (tokenHash) => {
  await pool.query(`UPDATE refresh_tokens SET revoked=TRUE WHERE token_hash=$1`, [tokenHash]);
};
db.revokeAllRefreshTokens = async (userId) => {
  await pool.query(`UPDATE refresh_tokens SET revoked=TRUE WHERE user_id=$1`, [userId]);
};

// ── Nested aliases ─────────────────────────────────────────────
db.users = {
  listUsers:   () => db.listUsers(),
  get:         (id) => db.getUser(id),
  getByEmail:  (e)  => db.getUserByEmail(e),
};
db.settings = {
  get:  (uid) => db.getSettings(uid),
  save: (uid, data) => db.saveSettings(uid, data),
};
db.products = {
  list: (uid) => db.getProducts(uid),
  get:  (id)  => db.getProduct(id),
};
db.conversations = {
  list:       (uid)       => db.getConversations(uid),
  get:        (id)        => db.getConversation(id),
  create:     (c)         => db.createConversation(c),
  addMessage: (id, msg)   => db.addMessage(id, msg),
};
db.notifications = {
  add: (n) => db.addNotification(n),
};

// ── Marketplace listings ──────────────────────────────────────
function _mapListing(l) {
  if (!l) return null;
  return {
    id: l.id, vendorId: l.vendor_id || null,
    type: l.type || 'product', name: l.name, description: l.description || '',
    price: +l.price || 0, category: l.category || '', city: l.city || '',
    images: Array.isArray(l.images) ? l.images : [],
    duration: l.duration || '', workArea: l.work_area || '',
    sellerName: l.seller_name || '', sellerPhone: l.seller_phone || '',
    status: l.status || 'pending', rejectReason: l.reject_reason || '',
    promoted: !!l.promoted, views: +l.views || 0,
    ratingAvg: +l.rating_avg || 0, ratingCount: +l.rating_count || 0,
    details: (l.details && typeof l.details === 'object') ? l.details : {},
    createdAt: l.created_at ? new Date(l.created_at).toISOString() : now(),
  };
}
db.createListing = async (l) => {
  const id = uid();
  const { rows } = await pool.query(
    `INSERT INTO listings
      (id,vendor_id,type,name,description,price,category,city,images,duration,work_area,seller_name,seller_phone,details,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending') RETURNING *`,
    [id, l.vendorId || null, l.type === 'service' ? 'service' : 'product',
     l.name, l.description || '', +l.price || 0, l.category || '', l.city || '',
     JSON.stringify(Array.isArray(l.images) ? l.images : []),
     l.duration || '', l.workArea || '', l.sellerName || '', l.sellerPhone || '',
     JSON.stringify(l.details && typeof l.details === 'object' ? l.details : {})]
  );
  return _mapListing(rows[0]);
};
db.getListing = async (id) => {
  const { rows } = await pool.query('SELECT * FROM listings WHERE id = $1', [id]);
  return _mapListing(rows[0]) || null;
};
db.getPublicListings = async ({ city, type, q, limit = 60 } = {}) => {
  const conds = ["status = 'approved'"]; const vals = []; let i = 1;
  if (city) { conds.push(`city = $${i++}`); vals.push(city); }
  if (type) { conds.push(`type = $${i++}`); vals.push(type); }
  if (q)    { conds.push(`(LOWER(name) LIKE $${i} OR LOWER(description) LIKE $${i} OR LOWER(category) LIKE $${i})`); vals.push('%' + String(q).toLowerCase() + '%'); i++; }
  vals.push(Math.min(+limit || 60, 200));
  const { rows } = await pool.query(
    `SELECT l.*,
       COALESCE((SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.listing_id = l.id),0) AS rating_avg,
       COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id),0) AS rating_count
     FROM listings l WHERE ${conds.join(' AND ')}
     ORDER BY l.promoted DESC, l.created_at DESC LIMIT $${i}`,
    vals
  );
  return rows.map(_mapListing);
};
db.getPublicStats = async () => {
  const one = async (sql) => {
    try { const { rows } = await pool.query(sql); return +(rows[0]?.n) || 0; }
    catch { return 0; }
  };
  const many = async (sql) => {
    try { const { rows } = await pool.query(sql); return rows; }
    catch { return []; }
  };
  const [merchants, products, services, orders, listings] = await Promise.all([
    one(`SELECT COUNT(*) AS n FROM users`),
    one(`SELECT COUNT(*) AS n FROM products WHERE status = 'published'`),
    one(`SELECT COUNT(*) AS n FROM products WHERE status = 'published' AND type = 'service'`),
    one(`SELECT COUNT(*) AS n FROM orders`),
    one(`SELECT COUNT(*) AS n FROM listings WHERE status = 'approved'`),
  ]);
  const cityRows = await many(
    `SELECT city, COUNT(*) AS n FROM listings
     WHERE status = 'approved' AND city IS NOT NULL AND city <> ''
     GROUP BY city ORDER BY n DESC LIMIT 8`
  );
  return {
    merchants, products, services, orders, listings,
    cities: cityRows.map(c => ({ city: c.city, count: +c.n || 0 })),
  };
};
db.getListingsForModeration = async (status) => {
  const { rows } = status
    ? await pool.query('SELECT * FROM listings WHERE status = $1 ORDER BY created_at DESC LIMIT 500', [status])
    : await pool.query('SELECT * FROM listings ORDER BY created_at DESC LIMIT 500');
  return rows.map(_mapListing);
};
db.setListingStatus = async (id, status, reason = '') => {
  const { rows } = await pool.query(
    'UPDATE listings SET status = $1, reject_reason = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [status, reason, id]
  );
  return _mapListing(rows[0]) || null;
};
db.incrementListingViews = async (id) => {
  await pool.query('UPDATE listings SET views = COALESCE(views,0)+1 WHERE id = $1', [id]).catch(() => {});
};
db.addReview = async (r) => {
  const id = uid();
  const { rows } = await pool.query(
    'INSERT INTO reviews (id,listing_id,rating,comment,reviewer_name) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [id, r.listingId, Math.min(5, Math.max(1, Math.round(+r.rating) || 5)), r.comment || '', r.reviewerName || '']
  );
  const x = rows[0];
  return { id: x.id, rating: +x.rating, comment: x.comment, reviewerName: x.reviewer_name, createdAt: x.created_at ? new Date(x.created_at).toISOString() : now() };
};
db.getListingReviews = async (listingId) => {
  const { rows } = await pool.query(
    'SELECT id,rating,comment,reviewer_name,created_at FROM reviews WHERE listing_id = $1 ORDER BY created_at DESC LIMIT 100',
    [listingId]
  );
  return rows.map(r => ({ id: r.id, rating: +r.rating, comment: r.comment, reviewerName: r.reviewer_name, createdAt: r.created_at ? new Date(r.created_at).toISOString() : now() }));
};
db.getListingRating = async (listingId) => {
  const { rows } = await pool.query('SELECT COALESCE(ROUND(AVG(rating),1),0) AS avg, COUNT(*)::int AS count FROM reviews WHERE listing_id = $1', [listingId]);
  const r = rows[0] || {};
  return { avg: +r.avg || 0, count: +r.count || 0 };
};

// ── Learning loop ──────────────────────────────────────────────
db.bumpUnknownText = async (text) => {
  const t = String(text || '').trim().slice(0, 200);
  if (t.length < 2) return;
  try {
    await pool.query(
      `INSERT INTO learning_unknowns (text, count) VALUES ($1, 1)
       ON CONFLICT (text) DO UPDATE SET count = learning_unknowns.count + 1, last_seen = NOW()`, [t]);
  } catch { /* ignore */ }
};
db.topUnknownTexts = async (limit = 100) => {
  try {
    const { rows } = await pool.query(
      `SELECT text, count, last_seen FROM learning_unknowns ORDER BY count DESC, last_seen DESC LIMIT $1`,
      [Math.min(Number(limit) || 100, 500)]);
    return rows.map(r => ({ text: r.text, count: +r.count, lastSeen: r.last_seen }));
  } catch { return []; }
};

// ── Wallet & Payments ─────────────────────────────────────────
db.getWallet = async (userId) => {
  const { rows } = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  if (rows[0]) return { userId, balance: +rows[0].balance || 0, currency: rows[0].currency || 'MAD' };
  return { userId, balance: 0, currency: 'MAD' };
};
db.getWalletTx = async (userId, limit = 50) => {
  const { rows } = await pool.query('SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, Math.min(+limit || 50, 200)]);
  return rows.map(t => ({ id: t.id, type: t.type, amount: +t.amount, ref: t.ref || '', note: t.note || '', createdAt: t.created_at ? new Date(t.created_at).toISOString() : now() }));
};
db.walletApply = async (userId, { type, amount, ref = '', note = '' }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`, [userId]);
    const { rows } = await client.query('SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    const bal = +rows[0].balance || 0;
    const next = bal + (+amount);
    if (next < 0) { await client.query('ROLLBACK'); return { ok: false, error: 'رصيد غير كافٍ', balance: bal }; }
    await client.query('UPDATE wallets SET balance = $1, updated_at = NOW() WHERE user_id = $2', [next, userId]);
    await client.query('INSERT INTO wallet_transactions (id,user_id,type,amount,ref,note) VALUES ($1,$2,$3,$4,$5,$6)', [uid(), userId, type, +amount, ref, note]);
    await client.query('COMMIT');
    return { ok: true, balance: next };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
};
db.createPayment = async (p) => {
  const id = uid();
  await pool.query(
    'INSERT INTO payments (id,user_id,order_id,provider,amount,currency,status,ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, p.userId || null, p.orderId || null, p.provider, p.amount || 0, p.currency || 'MAD', p.status || 'pending', p.ref || '']
  );
  return { id, ...p };
};
db.updatePaymentStatus = async (id, status) => {
  await pool.query('UPDATE payments SET status = $1 WHERE id = $2', [status, id]);
};
db.getProviderById = async (id) => {
  const { rows } = await pool.query("SELECT * FROM providers WHERE id = $1 AND status = 'approved'", [id]);
  return _mapProvider(rows[0]);
};

// ── Discover ───────────────────────────────────────────────────
db.discoverProducts = async ({ city, q, limit = 24 } = {}) => {
  const conds = ["p.status = 'published'"]; const vals = []; let i = 1;
  if (city) { conds.push(`s.data->'brand'->>'city' = $${i++}`); vals.push(city); }
  if (q)    { conds.push(`(LOWER(p.name) LIKE $${i} OR LOWER(p.description) LIKE $${i} OR LOWER(p.category) LIKE $${i})`); vals.push('%' + String(q).toLowerCase() + '%'); i++; }
  vals.push(Math.min(+limit || 24, 60));
  const { rows } = await pool.query(
    `SELECT p.id, p.user_id, p.name, p.price, p.category, p.emoji, p.image_url, p.views, p.offer_type,
            s.data->'brand'->>'name' AS store_name,
            s.data->'brand'->>'city' AS store_city,
            s.data->'brand'->>'logo' AS store_logo
     FROM products p LEFT JOIN settings s ON s.user_id = p.user_id
     WHERE ${conds.join(' AND ')}
     ORDER BY p.views DESC NULLS LAST, p.created_at DESC LIMIT $${i}`, vals);
  return rows.map(r => ({
    id: r.id, storeId: r.user_id, name: r.name, price: +r.price || 0,
    category: r.category || '', emoji: r.emoji || '📦', imageUrl: r.image_url || '',
    views: +r.views || 0, type: r.offer_type || 'product',
    storeName: r.store_name || '', storeCity: r.store_city || '', storeLogo: r.store_logo || '',
  }));
};
db.discoverProviders = async ({ city, q, limit = 24 } = {}) => {
  const conds = ["pr.status = 'approved'"]; const vals = []; let i = 1;
  if (city) { conds.push(`pr.city = $${i++}`); vals.push(city); }
  if (q) {
    conds.push(`(LOWER(pr.name) LIKE $${i} OR LOWER(pr.bio) LIKE $${i} OR EXISTS (
       SELECT 1 FROM provider_services ps WHERE ps.provider_id = pr.id
         AND (LOWER(ps.service_label) LIKE $${i} OR LOWER(ps.service_key) LIKE $${i})))`);
    vals.push('%' + String(q).toLowerCase() + '%'); i++;
  }
  vals.push(Math.min(+limit || 24, 60));
  const { rows } = await pool.query(
    `SELECT pr.id, pr.user_id, pr.name, pr.bio, pr.city, pr.avatar_url, pr.is_verified,
            pr.rating_avg, pr.rating_count,
            (SELECT COALESCE(json_agg(ps.service_label), '[]'::json)
               FROM provider_services ps WHERE ps.provider_id = pr.id) AS service_labels
     FROM providers pr WHERE ${conds.join(' AND ')}
     ORDER BY pr.is_verified DESC, pr.rating_avg DESC, pr.created_at DESC LIMIT $${i}`, vals);
  return rows.map(r => ({
    id: r.id, storeId: r.user_id, name: r.name, bio: r.bio || '', city: r.city || '',
    avatarUrl: r.avatar_url || '', isVerified: !!r.is_verified,
    ratingAvg: +r.rating_avg || 0, ratingCount: +r.rating_count || 0,
    serviceLabels: Array.isArray(r.service_labels) ? r.service_labels : [],
  }));
};
db.discoverStores = async ({ city, q, limit = 24 } = {}) => {
  const conds = ['TRUE']; const vals = []; let i = 1;
  if (city) { conds.push(`s.data->'brand'->>'city' = $${i++}`); vals.push(city); }
  if (q)    { conds.push(`LOWER(s.data->'brand'->>'name') LIKE $${i++}`); vals.push('%' + String(q).toLowerCase() + '%'); }
  vals.push(Math.min(+limit || 24, 60));
  const { rows } = await pool.query(
    `SELECT s.user_id,
            s.data->'brand'->>'name' AS name,
            s.data->'brand'->>'logo' AS logo,
            s.data->'brand'->>'city' AS city,
            s.data->'brand'->>'description' AS description,
            s.data->'brand'->>'workStart' AS work_start,
            s.data->'brand'->>'workEnd'   AS work_end,
            s.data->'brand'->>'statusOverride' AS status_override,
            (SELECT COUNT(*) FROM products p WHERE p.user_id = s.user_id AND p.status = 'published') AS product_count
     FROM settings s
     WHERE ${conds.join(' AND ')}
       AND (SELECT COUNT(*) FROM products p WHERE p.user_id = s.user_id AND p.status = 'published') > 0
     ORDER BY product_count DESC LIMIT $${i}`, vals);
  return rows.map(r => ({
    storeId: r.user_id, name: r.name || 'متجر', logo: r.logo || '', city: r.city || '',
    description: r.description || '', productCount: +r.product_count || 0,
    workStart: r.work_start || '', workEnd: r.work_end || '', statusOverride: r.status_override || '',
  }));
};

// ── Services Marketplace ──────────────────────────────────────
function _mapProvider(p) {
  if (!p) return null;
  return {
    id: p.id, userId: p.user_id, name: p.name, bio: p.bio || '', phone: p.phone || '',
    city: p.city || '', avatarUrl: p.avatar_url || '',
    latitude: p.latitude != null ? +p.latitude : null,
    longitude: p.longitude != null ? +p.longitude : null,
    status: p.status, isVerified: !!p.is_verified,
    ratingAvg: +p.rating_avg || 0, ratingCount: +p.rating_count || 0,
    adminNote: p.admin_note || '',
    createdAt: p.created_at ? new Date(p.created_at).toISOString() : now(),
  };
}
function _mapBooking(b) {
  if (!b) return null;
  return {
    id: b.id, userId: b.user_id, providerId: b.provider_id, serviceId: b.service_id,
    customerName: b.customer_name, customerPhone: b.customer_phone,
    scheduledAt: b.scheduled_at ? new Date(b.scheduled_at).toISOString() : null,
    durationMin: +b.duration_min || 60, status: b.status, price: +b.price || 0,
    notes: b.notes || '', createdAt: b.created_at ? new Date(b.created_at).toISOString() : now(),
  };
}
db.getProviders = async (userId, { status, q } = {}) => {
  const cond = ['user_id = $1'], args = [userId];
  if (status) { cond.push(`status = $${args.length + 1}`); args.push(status); }
  if (q)      { cond.push(`(LOWER(name) LIKE $${args.length + 1} OR LOWER(city) LIKE $${args.length + 1})`); args.push('%' + String(q).toLowerCase() + '%'); }
  const { rows } = await pool.query(`SELECT * FROM providers WHERE ${cond.join(' AND ')} ORDER BY is_verified DESC, rating_avg DESC, created_at DESC LIMIT 200`, args);
  return rows.map(_mapProvider);
};
db.getProvider = async (userId, id) => {
  const { rows } = await pool.query('SELECT * FROM providers WHERE id = $1 AND user_id = $2', [id, userId]);
  return _mapProvider(rows[0]);
};
db.createProvider = async (userId, d) => {
  const id = uid();
  const { rows } = await pool.query(
    `INSERT INTO providers (id,user_id,name,bio,phone,city,avatar_url,latitude,longitude,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [id, userId, d.name, d.bio || '', d.phone || '', d.city || '', d.avatarUrl || '',
     d.latitude ?? null, d.longitude ?? null, d.status || 'pending']
  );
  return _mapProvider(rows[0]);
};
db.updateProvider = async (userId, id, d) => {
  const fields = { name: d.name, bio: d.bio, phone: d.phone, city: d.city, avatar_url: d.avatarUrl,
    latitude: d.latitude, longitude: d.longitude, status: d.status, is_verified: d.isVerified, admin_note: d.adminNote };
  const set = [], args = [];
  for (const [col, v] of Object.entries(fields)) if (v !== undefined) { args.push(v); set.push(`${col} = $${args.length}`); }
  if (!set.length) return db.getProvider(userId, id);
  args.push(id, userId);
  const { rows } = await pool.query(`UPDATE providers SET ${set.join(', ')} WHERE id = $${args.length - 1} AND user_id = $${args.length} RETURNING *`, args);
  return _mapProvider(rows[0]);
};
db.deleteProvider = async (userId, id) => {
  const { rowCount } = await pool.query('DELETE FROM providers WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
};
db.getProviderServices = async (providerId) => {
  const { rows } = await pool.query('SELECT * FROM provider_services WHERE provider_id = $1 ORDER BY created_at', [providerId]);
  return rows.map(s => ({ id: s.id, providerId: s.provider_id, serviceKey: s.service_key, serviceLabel: s.service_label,
    skillLevel: s.skill_level, priceMin: +s.price_min || 0, priceMax: +s.price_max || 0, durationMin: +s.duration_min || 60, description: s.description || '' }));
};
db.addProviderService = async (providerId, d) => {
  const id = uid();
  await pool.query(
    `INSERT INTO provider_services (id,provider_id,service_key,service_label,skill_level,price_min,price_max,duration_min,description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, providerId, d.serviceKey, d.serviceLabel, d.skillLevel || 'intermediate', d.priceMin || 0, d.priceMax || 0, d.durationMin || 60, d.description || '']
  );
  return id;
};
db.removeProviderService = async (providerId, id) => {
  const { rowCount } = await pool.query('DELETE FROM provider_services WHERE id = $1 AND provider_id = $2', [id, providerId]);
  return rowCount > 0;
};
db.getAvailabilityTemplates = async (providerId) => {
  const { rows } = await pool.query('SELECT * FROM availability_templates WHERE provider_id = $1 ORDER BY weekday, start_time', [providerId]);
  return rows.map(t => ({ id: t.id, providerId: t.provider_id, weekday: +t.weekday, startTime: t.start_time, endTime: t.end_time }));
};
db.setAvailabilityTemplates = async (providerId, list) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM availability_templates WHERE provider_id = $1', [providerId]);
    for (const t of (list || [])) {
      await client.query('INSERT INTO availability_templates (id,provider_id,weekday,start_time,end_time) VALUES ($1,$2,$3,$4,$5)',
        [uid(), providerId, t.weekday, t.startTime, t.endTime]);
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
};
db.getAvailabilitySlots = async (providerId, fromISO, toISO) => {
  const { rows } = await pool.query(
    'SELECT * FROM availability_slots WHERE provider_id = $1 AND starts_at >= $2 AND starts_at <= $3 ORDER BY starts_at',
    [providerId, fromISO, toISO]
  );
  return rows.map(s => ({ id: s.id, providerId: s.provider_id, startsAt: new Date(s.starts_at).toISOString(), endsAt: new Date(s.ends_at).toISOString(), status: s.status }));
};
db.addAvailabilitySlot = async (providerId, d) => {
  const id = uid();
  await pool.query('INSERT INTO availability_slots (id,provider_id,starts_at,ends_at,status) VALUES ($1,$2,$3,$4,$5)',
    [id, providerId, d.startsAt, d.endsAt, d.status || 'open']);
  return id;
};
db.getBookings = async (userId, { providerId, status } = {}) => {
  const cond = ['user_id = $1'], args = [userId];
  if (providerId) { cond.push(`provider_id = $${args.length + 1}`); args.push(providerId); }
  if (status)     { cond.push(`status = $${args.length + 1}`); args.push(status); }
  const { rows } = await pool.query(`SELECT * FROM bookings WHERE ${cond.join(' AND ')} ORDER BY scheduled_at DESC LIMIT 300`, args);
  return rows.map(_mapBooking);
};
db.findBookingConflict = async (providerId, scheduledAtISO, durationMin) => {
  const start = new Date(scheduledAtISO);
  const end = new Date(start.getTime() + (durationMin || 60) * 60000);
  const { rows } = await pool.query(
    `SELECT * FROM bookings
     WHERE provider_id = $1 AND status IN ('pending','confirmed')
       AND scheduled_at < $3
       AND (scheduled_at + (duration_min * interval '1 minute')) > $2
     LIMIT 1`,
    [providerId, start.toISOString(), end.toISOString()]
  );
  return _mapBooking(rows[0]);
};
db.createBooking = async (userId, d) => {
  const id = uid();
  const { rows } = await pool.query(
    `INSERT INTO bookings (id,user_id,provider_id,service_id,customer_name,customer_phone,scheduled_at,duration_min,status,price,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, userId, d.providerId, d.serviceId || null, d.customerName, d.customerPhone,
     d.scheduledAt, d.durationMin || 60, d.status || 'pending', d.price || 0, d.notes || '']
  );
  return _mapBooking(rows[0]);
};
db.updateBookingStatus = async (userId, id, status) => {
  const { rows } = await pool.query('UPDATE bookings SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *', [status, id, userId]);
  return _mapBooking(rows[0]);
};

// ── Knowledge layer: search misses ────────────────────────────
db.recordSearchMiss = async ({ raw, normalized, city }) => {
  await pool.query(
    `INSERT INTO search_misses (id, raw, normalized, city, count)
       VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (normalized, COALESCE(city, '')) DO UPDATE
       SET count = search_misses.count + 1, last_seen = NOW(), raw = EXCLUDED.raw`,
    [uid(), raw, normalized, city || null]
  );
};
db.listSearchMisses = async ({ status = 'open', limit = 100 } = {}) => {
  const { rows } = await pool.query(
    `SELECT * FROM search_misses
      WHERE ($1 = 'all' OR status = $1)
      ORDER BY count DESC, last_seen DESC
      LIMIT $2`,
    [status, limit]
  );
  return rows;
};
db.getSearchMiss = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM search_misses WHERE id = $1`, [id]);
  return rows[0] || null;
};
db.resolveSearchMiss = async (id, { category, adminId, status = 'resolved' } = {}) => {
  const { rows } = await pool.query(
    `UPDATE search_misses
        SET status = $2, resolved_category = $3, resolved_by = $4, resolved_at = NOW()
      WHERE id = $1 RETURNING *`,
    [id, status, category || null, adminId || null]
  );
  return rows[0] || null;
};
db.recordSearchTerm = async ({ term, hit }) => {
  const t = String(term || '').trim().slice(0, 60);
  if (t.length < 2) return;
  await pool.query(
    `INSERT INTO search_terms_daily (day, term, hits, total)
       VALUES (CURRENT_DATE, $1, $2, 1)
     ON CONFLICT (day, term) DO UPDATE
       SET hits = search_terms_daily.hits + $2, total = search_terms_daily.total + 1`,
    [t, hit ? 1 : 0]
  );
};
db.getNewSince = async ({ days = 7 } = {}) => {
  const one = async (sql) => {
    try { const { rows } = await pool.query(sql, [days]); return +(rows[0]?.n) || 0; }
    catch { return 0; }
  };
  const W = `created_at >= NOW() - (($1::int) || ' days')::interval`;
  const [users, products, services, listings, providers, orders, bookings] = await Promise.all([
    one(`SELECT COUNT(*) AS n FROM users WHERE ${W}`),
    one(`SELECT COUNT(*) AS n FROM products WHERE type <> 'service' AND ${W}`),
    one(`SELECT COUNT(*) AS n FROM products WHERE type =  'service' AND ${W}`),
    one(`SELECT COUNT(*) AS n FROM listings WHERE ${W}`),
    one(`SELECT COUNT(*) AS n FROM providers WHERE ${W}`),
    one(`SELECT COUNT(*) AS n FROM orders   WHERE ${W}`),
    one(`SELECT COUNT(*) AS n FROM bookings WHERE ${W}`),
  ]);
  return { days, users, products, services, listings, providers, orders, bookings };
};

// ── Custom concepts ────────────────────────────────────────────
db.listCustomConcepts = async ({ status } = {}) => {
  const { rows } = status
    ? await pool.query('SELECT * FROM custom_concepts WHERE status = $1 ORDER BY updated_at DESC', [status])
    : await pool.query('SELECT * FROM custom_concepts ORDER BY updated_at DESC');
  return rows;
};
db.getCustomConcept = async (id) => {
  const direct = await pool.query('SELECT * FROM custom_concepts WHERE id = $1', [id]);
  if (direct.rows[0]) return direct.rows[0];
  const live = await db.resolveConceptAlias(id);
  if (live === String(id)) return null;
  const { rows } = await pool.query('SELECT * FROM custom_concepts WHERE id = $1', [live]);
  return rows[0] || null;
};
const CONCEPT_STATUS = ['draft', 'candidate', 'published'];
db.upsertCustomConcept = async (c) => {
  const j = (v, d) => JSON.stringify(v == null ? d : v);
  const before = (await pool.query('SELECT * FROM custom_concepts WHERE id = $1', [String(c.id)])).rows[0];
  if (before) {
    await pool.query(
      `INSERT INTO concept_versions (concept_id, snapshot, reason, changed_by) VALUES ($1,$2::jsonb,$3,$4)`,
      [before.id, JSON.stringify(before), c.reason || 'manual', c.createdBy || null]
    );
  }
  const { rows } = await pool.query(
    `INSERT INTO custom_concepts (id, category, concept, variants, stance, asks, links, services, examples, status, source, created_by, updated_at)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,NOW())
     ON CONFLICT (id) DO UPDATE SET
       category = EXCLUDED.category, concept = EXCLUDED.concept, variants = EXCLUDED.variants,
       stance = EXCLUDED.stance, asks = EXCLUDED.asks, links = EXCLUDED.links,
       services = EXCLUDED.services, examples = EXCLUDED.examples,
       status = EXCLUDED.status, source = EXCLUDED.source, updated_at = NOW()
     RETURNING *`,
    [String(c.id), String(c.category || ''), j(c.concept, {}), j(c.variants, {}), j(c.stance, {}),
     j(c.asks, {}), j(c.links, {}), j(c.services, []), j(c.examples, []),
     CONCEPT_STATUS.includes(c.status) ? c.status : 'draft',
     ['system', 'admin', 'ai', 'community'].includes(c.source) ? c.source : 'admin',
     c.createdBy || null]
  );
  return rows[0];
};
db.listConceptVersions = async (conceptId, limit = 20) => {
  const { rows } = await pool.query(
    `SELECT id, concept_id, reason, changed_by, created_at FROM concept_versions
      WHERE concept_id = $1 ORDER BY id DESC LIMIT $2`, [String(conceptId), Math.min(limit, 100)]);
  return rows;
};
db.revertConcept = async (versionId, changedBy) => {
  const { rows } = await pool.query('SELECT * FROM concept_versions WHERE id = $1', [versionId]);
  const v = rows[0];
  if (!v) return null;
  const s = v.snapshot;
  return db.upsertCustomConcept({
    id: s.id, category: s.category, concept: s.concept, variants: s.variants,
    stance: s.stance, asks: s.asks, links: s.links, services: s.services,
    examples: s.examples, status: s.status, source: s.source,
    createdBy: changedBy, reason: `revert:${versionId}`,
  });
};
db.resolveConceptAlias = async (id) => {
  let cur = String(id);
  for (let i = 0; i < 10; i++) {
    const { rows } = await pool.query('SELECT to_id FROM concept_aliases WHERE from_id = $1', [cur]);
    if (!rows[0]) return cur;
    cur = rows[0].to_id;
  }
  console.warn('[concepts] سلسلةُ أسماءٍ بديلةٍ أطولُ من ١٠ — يُرجَّح وجودُ حلقة:', id);
  return cur;
};
db.listConceptAliases = async () => (await pool.query('SELECT * FROM concept_aliases ORDER BY created_at DESC')).rows;
db.mergeConcepts = async ({ fromId, toId, reason, by }) => {
  const from = String(fromId), to = String(toId);
  if (from === to) throw new Error('لا يُدمَج مفهومٌ في نفسه');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO provider_concepts (provider_id, concept_id, is_primary)
         SELECT provider_id, $2, FALSE FROM provider_concepts WHERE concept_id = $1
       ON CONFLICT (provider_id, concept_id) DO NOTHING`, [from, to]);
    await client.query('DELETE FROM provider_concepts WHERE concept_id = $1', [from]);
    const old = (await client.query('SELECT * FROM custom_concepts WHERE id = $1', [from])).rows[0];
    if (old) {
      await client.query(
        `INSERT INTO concept_versions (concept_id, snapshot, reason, changed_by) VALUES ($1,$2::jsonb,$3,$4)`,
        [from, JSON.stringify(old), `merged_into:${to}`, by || null]);
      await client.query('DELETE FROM custom_concepts WHERE id = $1', [from]);
    }
    await client.query(
      `INSERT INTO concept_aliases (from_id, to_id, reason, merged_by) VALUES ($1,$2,$3,$4)
       ON CONFLICT (from_id) DO UPDATE SET to_id = EXCLUDED.to_id`, [from, to, reason || null, by || null]);
    await client.query('COMMIT');
    return { from, to };
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
};
db.setProviderConcepts = async (providerId, items) => {
  const pid = String(providerId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM provider_concepts WHERE provider_id = $1', [pid]);
    let primaryTaken = false;
    for (const it of items) {
      const cid = await db.resolveConceptAlias(it.conceptId ?? it.concept_id ?? it);
      const primary = !primaryTaken && !!(it.isPrimary ?? it.is_primary);
      if (primary) primaryTaken = true;
      await client.query(
        `INSERT INTO provider_concepts (provider_id, concept_id, is_primary) VALUES ($1,$2,$3)
         ON CONFLICT (provider_id, concept_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
        [pid, cid, primary]);
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  return db.getProviderConcepts(pid);
};
db.getProviderConcepts = async (providerId) => {
  const { rows } = await pool.query(
    `SELECT concept_id, is_primary FROM provider_concepts WHERE provider_id = $1
      ORDER BY is_primary DESC, concept_id`, [String(providerId)]);
  return rows;
};
db.providersByConcept = async ({ conceptId, city, limit = 20 } = {}) => {
  const cid = await db.resolveConceptAlias(conceptId);
  const { rows } = await pool.query(
    `SELECT p.*, pc.is_primary
       FROM provider_concepts pc
       JOIN providers p ON p.id = pc.provider_id
      WHERE pc.concept_id = $1
        AND ($2::text IS NULL OR p.city = $2)
        AND p.status = 'active'
      ORDER BY pc.is_primary DESC, p.is_verified DESC, p.rating_avg DESC NULLS LAST
      LIMIT $3`, [cid, city || null, Math.min(limit, 100)]);
  return rows;
};
db.deleteCustomConcept = async (id) => {
  const { rowCount } = await pool.query('DELETE FROM custom_concepts WHERE id = $1', [id]);
  return rowCount > 0;
};
db.getTopCities = async ({ days = 30, limit = 8 } = {}) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(city, 'غير محدّدة') AS city,
            SUM(total)::int AS total, SUM(hits)::int AS hits, SUM(misses)::int AS misses
       FROM search_daily
      WHERE day >= CURRENT_DATE - (($1::int - 1) || ' days')::interval
      GROUP BY COALESCE(city, 'غير محدّدة')
      ORDER BY total DESC LIMIT $2`,
    [days, limit]
  );
  return rows;
};
db.getTopTerms = async ({ days = 30, limit = 10 } = {}) => {
  const { rows } = await pool.query(
    `SELECT term, SUM(total)::int AS total, SUM(hits)::int AS hits
       FROM search_terms_daily
      WHERE day >= CURRENT_DATE - (($1::int - 1) || ' days')::interval
      GROUP BY term ORDER BY total DESC LIMIT $2`,
    [days, limit]
  );
  return rows;
};
db.getPublicTrendingTerms = async ({ days = 7, limit = 8, minCount = 3 } = {}) => {
  const { rows } = await pool.query(
    `SELECT term, SUM(total)::int AS total
       FROM search_terms_daily
      WHERE day >= CURRENT_DATE - (($1::int - 1) || ' days')::interval
        AND term !~ '[0-9]'
        AND char_length(term) BETWEEN 4 AND 40
      GROUP BY term
     HAVING SUM(total) >= $3
      ORDER BY SUM(total) DESC LIMIT $2`,
    [days, limit, minCount]
  );
  return rows;
};
db.recordSearchDay = async ({ city, hit }) => {
  await pool.query(
    `INSERT INTO search_daily (day, city, total, hits, misses)
       VALUES (CURRENT_DATE, $1, 1, $2, $3)
     ON CONFLICT (day, COALESCE(city, '')) DO UPDATE
       SET total  = search_daily.total  + 1,
           hits   = search_daily.hits   + $2,
           misses = search_daily.misses + $3`,
    [city || null, hit ? 1 : 0, hit ? 0 : 1]
  );
};
db.getSearchQuality = async ({ days = 30 } = {}) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(total),0)::int  AS total,
            COALESCE(SUM(hits),0)::int   AS hits,
            COALESCE(SUM(misses),0)::int AS misses
       FROM search_daily
      WHERE day >= CURRENT_DATE - (($1::int - 1) || ' days')::interval`,
    [days]
  );
  const r = rows[0] || { total: 0, hits: 0, misses: 0 };
  const successRate = r.total ? Math.round((r.hits / r.total) * 1000) / 1000 : 0;
  return { ...r, successRate, days };
};
db.recordLearningStage = async (stage) => {
  await pool.query(
    `INSERT INTO learning_daily (day, stage, count) VALUES (CURRENT_DATE, $1, 1)
     ON CONFLICT (day, stage) DO UPDATE SET count = learning_daily.count + 1`,
    [stage]
  );
};
db.getLearningStages = async ({ days = 30 } = {}) => {
  const { rows } = await pool.query(
    `SELECT stage, COALESCE(SUM(count),0)::int AS count
       FROM learning_daily
      WHERE day >= CURRENT_DATE - (($1::int - 1) || ' days')::interval
      GROUP BY stage`,
    [days]
  );
  const m = {}; for (const r of rows) m[r.stage] = r.count; return m;
};

// ── Demand Capture ─────────────────────────────────────────────
db.createNeedRequest = async (n) => {
  const id = n.id || uid();
  const { rows } = await pool.query(
    `INSERT INTO need_requests (id, raw, concept, city, contact, contact_kind, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [id, String(n.raw || '').slice(0, 500), n.concept || null, n.city || null,
     n.contact || null, n.contactKind || null, n.userId || null]
  );
  return rows[0];
};
db.needDemand = async ({ days = 30, limit = 50 } = {}) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(concept,'—') AS concept, COALESCE(city,'—') AS city,
            COUNT(*)::int AS count,
            COUNT(contact)::int AS reachable,
            MAX(created_at) AS last_at
       FROM need_requests
      WHERE status = 'open'
        AND created_at >= NOW() - (($1::int) || ' days')::interval
      GROUP BY 1, 2 ORDER BY count DESC, last_at DESC LIMIT $2`,
    [days, limit]
  );
  return rows;
};
db.listNeedRequests = async ({ status = 'open', concept, city, limit = 100 } = {}) => {
  const { rows } = await pool.query(
    `SELECT * FROM need_requests
      WHERE status = $1
        AND ($2::text IS NULL OR concept = $2)
        AND ($3::text IS NULL OR city = $3)
      ORDER BY created_at DESC LIMIT $4`,
    [status, concept || null, city || null, limit]
  );
  return rows;
};
db.updateNeedRequest = async (id, { status, matchedBusiness }) => {
  const { rows } = await pool.query(
    `UPDATE need_requests
        SET status = COALESCE($2, status),
            matched_business = COALESCE($3, matched_business),
            updated_at = NOW()
      WHERE id = $1 RETURNING *`,
    [id, status || null, matchedBusiness || null]
  );
  return rows[0] || null;
};

module.exports = { db };
