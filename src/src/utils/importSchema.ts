// ================================================================
// importSchema.ts — Validation Zod pour l'import de données
// ================================================================
// Protège importData() contre tout JSON malveillant ou malformé.
// Seules les clés autorisées (products, orders, customers, settings)
// peuvent entrer dans le state. Token, user, etc. sont refusés.
// ================================================================

import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────

const nonEmptyString = z.string().min(1);

// ── Produits ─────────────────────────────────────────────────────

const ProductStatusSchema = z.enum(['draft', 'published', 'archived']);

export const ProductSchema = z.object({
  id:            nonEmptyString,
  name:          nonEmptyString,
  description:   z.string().default(''),
  price:         z.number().min(0),
  cost:          z.number().min(0).default(0),
  stock:         z.number().int().min(0).default(0),
  category:      z.string().default(''),
  sizes:         z.array(z.string()).default([]),
  colors:        z.array(z.string()).default([]),
  status:        ProductStatusSchema.default('draft'),
  emoji:         z.string().default('📦'),
  imageUrl:      z.string().default(''),
  images:        z.array(z.string()).default([]),
  isForChildren: z.boolean().default(false),
  ageRange:      z.string().optional(),
  views:         z.number().int().min(0).default(0),
  sales:         z.number().int().min(0).default(0),
  createdAt:     z.string().default(new Date().toISOString().split('T')[0]),
  // Champs étendus (non encore dans Product mais utilisés dans le formulaire)
  brand:         z.string().optional(),
  material:      z.string().optional(),
  gender:        z.string().optional(),
  season:        z.string().optional(),
  oldPrice:      z.number().min(0).optional(),
  colorImages:   z.record(z.string(), z.string()).default({}),
  sizeType:      z.enum(['adult', 'shoes', 'children']).optional(),
  sku:           z.string().optional(),
  dimensions:    z.string().optional(),
});

// ── Clients ──────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  id:            nonEmptyString,
  name:          nonEmptyString,
  phone:         z.string().default(''),
  city:          z.string().default(''),
  address:       z.string().default(''),
  totalOrders:   z.number().int().min(0).default(0),
  totalSpent:    z.number().min(0).default(0),
  lastOrderDate: z.string().default(''),
  source:        z.enum(['WhatsApp', 'Instagram', 'Messenger', 'TikTok', 'مباشر']).default('WhatsApp'),
  notes:         z.string().default(''),
  vip:           z.boolean().default(false),
  trustScore:    z.number().min(0).max(100).default(80),
  buyerScore:    z.number().min(0).max(100).default(50),
});

// ── Commandes ────────────────────────────────────────────────────

const OrderStatusSchema = z.enum([
  'pending', 'pending_confirmation', 'approved',
  'processing', 'shipped', 'delivered', 'cancelled',
]);

const OrderItemSchema = z.object({
  productId:   z.string(),
  productName: z.string(),
  price:       z.number().min(0),
  quantity:    z.number().int().min(1),
  size:        z.string().optional(),
  color:       z.string().optional(),
});

export const OrderSchema = z.object({
  id:               nonEmptyString,
  customerId:       z.string().default(''),
  customerName:     nonEmptyString,
  customerPhone:    z.string().default(''),
  city:             z.string().default(''),
  address:          z.string().default(''),
  items:            z.array(OrderItemSchema).min(1),
  total:            z.number().min(0),
  status:           OrderStatusSchema.default('pending'),
  source:           z.string().default(''),
  deliveryProvider: z.string().default(''),
  trackingNumber:   z.string().default(''),
  notes:            z.string().default(''),
  needsReview:      z.boolean().default(false),
  reviewReason:     z.string().optional(),
  createdAt:        z.string().default(new Date().toISOString()),
});

// ── Settings (partiel — uniquement les champs sûrs) ───────────────
// On valide seulement les champs que l'import peut raisonnablement
// modifier. On exclut apiKey, accessToken, password, etc.

const SafeBrandSchema = z.object({
  name:        z.string().optional(),
  currency:    z.string().optional(),
  language:    z.string().optional(),
  timezone:    z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().optional(),
  address:     z.string().optional(),
  description: z.string().optional(),
  workStart:   z.string().optional(),
  workEnd:     z.string().optional(),
}).partial();

const SafeProductSettingsSchema = z.object({
  lowStockAlert:       z.number().int().min(0).optional(),
  defaultSizes:        z.array(z.string()).optional(),
  defaultColors:       z.array(z.string()).optional(),
  categories:          z.array(z.string()).optional(),
  taxRate:             z.number().min(0).max(100).optional(),
  autoPublishOnCreate: z.boolean().optional(),
}).partial();

const SafeGoalsSchema = z.object({
  daily:   z.number().min(0).optional(),
  monthly: z.number().min(0).optional(),
}).partial();

const SafeSettingsSchema = z.object({
  brand:    SafeBrandSchema.optional(),
  products: SafeProductSettingsSchema.optional(),
  goals:    SafeGoalsSchema.optional(),
}).partial();

// ── Schéma racine du fichier d'import ────────────────────────────
// N'accepte QUE ces 4 clés. Toute autre clé (token, user, isOnline…)
// est rejetée grâce à .strict().

export const ImportFileSchema = z.object({
  products: z.array(ProductSchema).optional(),
  orders:   z.array(OrderSchema).optional(),
  customers: z.array(CustomerSchema).optional(),
  settings:  SafeSettingsSchema.optional(),
}).strict(); // ← refuse toute clé non listée

// ── Type inféré ──────────────────────────────────────────────────

export type ImportFile = z.infer<typeof ImportFileSchema>;

// ── Résultat de la validation ─────────────────────────────────────

export interface ImportResult {
  ok:       boolean;
  data?:    ImportFile;
  errors?:  string[];
  stats?: {
    products:  number;
    orders:    number;
    customers: number;
  };
}

// ── Fonction principale ───────────────────────────────────────────

export function validateImport(json: string): ImportResult {
  // 1. Limite de taille : un fichier d'import ne devrait pas dépasser 5 Mo
  //    (évite de bloquer le thread JS avec un JSON énorme)
  if (json.length > 5 * 1024 * 1024) {
    return { ok: false, errors: ['الملف كبير جداً — الحد الأقصى 5MB'] };
  }

  // 2. Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['صيغة JSON غير صحيحة'] };
  }

  // 3. Validation Zod
  const result = ImportFileSchema.safeParse(raw);

  if (!result.success) {
    // Transformer les erreurs Zod en messages lisibles
    const errors = result.error.issues.map(issue => {
      const path = issue.path.join(' → ');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { ok: false, errors };
  }

  const data = result.data;

  return {
    ok: true,
    data,
    stats: {
      products:  data.products?.length  ?? 0,
      orders:    data.orders?.length    ?? 0,
      customers: data.customers?.length ?? 0,
    },
  };
}
