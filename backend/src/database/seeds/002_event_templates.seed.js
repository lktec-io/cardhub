/**
 * DEVELOPMENT SEED DATA — system-owned template catalog.
 * These are legitimate CardHub product data (not fake customer data):
 * templates are selectable design configurations, not user records.
 * Idempotent — re-running this seed updates existing rows by slug rather
 * than creating duplicates.
 */
import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { DEFAULT_PRICING_TIER } from '../../constants/pricingTiers.js';

const TEMPLATES = [
  {
    name: 'Elegant Ivory',
    slug: 'elegant-ivory',
    category: 'wedding',
    pricingTier: 'classic',
    previewImage: '/cards/elegant-ivory.jpg',
    description: 'Soft ivory tones with refined serif-style headings for a timeless wedding invitation.',
    sortOrder: 1,
    config: {
      theme: 'elegant-ivory',
      layout: 'classic',
      colors: { primary: '#0d2235', accent: '#34d399' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Midnight Romance',
    slug: 'midnight-romance',
    category: 'wedding',
    pricingTier: 'premium',
    previewImage: '/cards/midnight-romance.jpg',
    description: 'Deep navy and gold-green accents for an evening celebration with real presence.',
    sortOrder: 2,
    config: {
      theme: 'midnight-romance',
      layout: 'centered',
      colors: { primary: '#050b14', accent: '#6ee7b7' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Garden Bloom',
    slug: 'garden-bloom',
    category: 'baby_shower',
    pricingTier: 'starter',
    previewImage: '/cards/garden-bloom.jpg',
    description: 'Gentle, welcoming, and fresh — designed for baby showers and new beginnings.',
    sortOrder: 1,
    config: {
      theme: 'garden-bloom',
      layout: 'soft',
      colors: { primary: '#0d2235', accent: '#6ee7b7' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Modern Minimal',
    slug: 'modern-minimal',
    category: 'corporate',
    pricingTier: 'premium',
    previewImage: '/cards/modern-minimal.jpg',
    description: 'Sharp, uncluttered, and confident — built for launches and corporate gatherings.',
    sortOrder: 1,
    config: {
      theme: 'modern-minimal',
      layout: 'grid',
      colors: { primary: '#0a1e30', accent: '#22c55e' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Royal Celebration',
    slug: 'royal-celebration',
    category: 'birthday',
    pricingTier: 'classic',
    previewImage: '/cards/royal-celebration.jpg',
    description: 'Bold and festive, with rich color depth for milestone birthdays and parties.',
    sortOrder: 1,
    config: {
      theme: 'royal-celebration',
      layout: 'classic',
      colors: { primary: '#122c42', accent: '#22c55e' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Classic Gold',
    slug: 'classic-gold',
    category: 'anniversary',
    pricingTier: 'premium',
    previewImage: '/cards/classic-gold.jpg',
    description: 'A timeless, understated design for anniversaries and milestone achievements.',
    sortOrder: 1,
    config: {
      theme: 'classic-gold',
      layout: 'centered',
      colors: { primary: '#06111f', accent: '#16a34a' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Ascend',
    slug: 'ascend',
    category: 'graduation',
    pricingTier: 'starter',
    previewImage: '/cards/ascend.jpg',
    description: 'A confident, achievement-forward layout for graduation celebrations.',
    sortOrder: 1,
    config: {
      theme: 'ascend',
      layout: 'grid',
      colors: { primary: '#0a1e30', accent: '#34d399' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
  {
    name: 'Pulse',
    slug: 'pulse',
    category: 'party',
    pricingTier: 'starter',
    previewImage: '/cards/pulse.jpg',
    description: 'Bold, high-energy invitation styling for any celebration.',
    sortOrder: 1,
    config: {
      theme: 'pulse',
      layout: 'grid',
      colors: { primary: '#081827', accent: '#22c55e' },
      fonts: { heading: 'Poppins', body: 'Poppins' },
    },
  },
];

async function seedEventTemplates(connection) {
  for (const template of TEMPLATES) {
    await connection.query(
      `INSERT INTO event_templates (name, slug, description, category, pricing_tier, preview_image, status, sort_order, config)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         category = VALUES(category),
         pricing_tier = VALUES(pricing_tier),
         preview_image = VALUES(preview_image),
         sort_order = VALUES(sort_order),
         config = VALUES(config)`,
      [
        template.name,
        template.slug,
        template.description,
        template.category,
        template.pricingTier || DEFAULT_PRICING_TIER,
        template.previewImage || null,
        template.sortOrder,
        JSON.stringify(template.config),
      ]
    );
  }
  logger.info(`Seeded ${TEMPLATES.length} event_templates rows`);
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
  });

  try {
    await seedEventTemplates(connection);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  logger.error('Seeding failed', { message: error.message });
  process.exit(1);
});
