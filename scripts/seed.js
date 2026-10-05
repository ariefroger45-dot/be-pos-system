/* eslint-disable */
// Idempotent seed for local development: admin, cashier, outlet, categories,
// products, and per-outlet stock. Run: MONGODB_URI=... node scripts/seed.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

function loadEnv() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const line = raw.split('\n').find((l) => l.startsWith('MONGODB_URI='));
    if (line) return line.slice('MONGODB_URI='.length).trim();
  } catch {}
  return 'mongodb://localhost:27017/pos';
}

const CATEGORIES = ['Makanan', 'Minuman', 'Sembako', 'Kebersihan', 'Camilan'];

const PRODUCTS = [
  { sku: 'MKN-001', title: 'Indomie Goreng', cat: 'Makanan', price: 3500, cost: 2900, stock: 120, unit: 'bungkus' },
  { sku: 'MKN-002', title: 'Mie Sedaap Soto', cat: 'Makanan', price: 3300, cost: 2800, stock: 84, unit: 'bungkus' },
  { sku: 'MKN-003', title: 'Sarden ABC 155 g', cat: 'Makanan', price: 14500, cost: 12400, stock: 22, unit: 'kaleng' },
  { sku: 'MKN-004', title: 'Roti Tawar Sari Roti', cat: 'Makanan', price: 16500, cost: 14200, stock: 7, unit: 'pak' },
  { sku: 'MNM-001', title: 'Aqua 600 ml', cat: 'Minuman', price: 4000, cost: 3000, stock: 96, unit: 'botol' },
  { sku: 'MNM-002', title: 'Teh Pucuk Harum 350 ml', cat: 'Minuman', price: 5000, cost: 3900, stock: 8, unit: 'botol' },
  { sku: 'MNM-003', title: 'Kopi Kapal Api Sachet', cat: 'Minuman', price: 2000, cost: 1600, stock: 150, unit: 'sachet' },
  { sku: 'MNM-004', title: 'Susu Ultra Coklat 200 ml', cat: 'Minuman', price: 6500, cost: 5400, stock: 40, unit: 'kotak' },
  { sku: 'SMB-001', title: 'Beras Premium 5 kg', cat: 'Sembako', price: 72000, cost: 66000, stock: 18, unit: 'karung' },
  { sku: 'SMB-002', title: 'Gula Pasir 1 kg', cat: 'Sembako', price: 17500, cost: 15800, stock: 4, unit: 'kg' },
  { sku: 'SMB-003', title: 'Minyak Goreng 1 L', cat: 'Sembako', price: 19000, cost: 17200, stock: 26, unit: 'pouch' },
  { sku: 'SMB-004', title: 'Telur Ayam 1 kg', cat: 'Sembako', price: 29000, cost: 26500, stock: 12, unit: 'kg' },
  { sku: 'KBR-001', title: 'Sabun Lifebuoy Batang', cat: 'Kebersihan', price: 4500, cost: 3600, stock: 45, unit: 'buah' },
  { sku: 'KBR-002', title: 'Rinso Molto 800 g', cat: 'Kebersihan', price: 21000, cost: 18500, stock: 0, unit: 'pak' },
  { sku: 'CMP-001', title: 'Chitato Sapi Panggang', cat: 'Camilan', price: 11500, cost: 9800, stock: 33, unit: 'bungkus' },
  { sku: 'CMP-002', title: 'Roma Kelapa', cat: 'Camilan', price: 9000, cost: 7600, stock: 28, unit: 'bungkus' },
];

async function main() {
  const uri = loadEnv();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log('connected ->', uri.replace(/\/\/.*@/, '//***@'));

  const now = new Date();

  // Outlet
  const outlet = await db.collection('outlets').findOneAndUpdate(
    { code: 'MAIN' },
    { $set: { name: 'Toko Utama', code: 'MAIN', isActive: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: 'after' },
  );
  const outletId = outlet._id;

  // Users
  const adminHash = await bcrypt.hash('admin1234', 10);
  await db.collection('users').updateOne(
    { email: 'admin@pos.test' },
    {
      $set: { name: 'Admin', role: 'ADMIN', isActive: true, updatedAt: now },
      $setOnInsert: { email: 'admin@pos.test', passwordHash: adminHash, createdAt: now },
    },
    { upsert: true },
  );

  const cashierHash = await bcrypt.hash('kasir1234', 10);
  await db.collection('users').updateOne(
    { email: 'agus@pos.test' },
    {
      $set: { name: 'Agus Santoso', role: 'CASHIER', outletId, isActive: true, updatedAt: now },
      $setOnInsert: { email: 'agus@pos.test', passwordHash: cashierHash, createdAt: now },
    },
    { upsert: true },
  );

  const cashier = await db.collection('users').findOne({ email: 'agus@pos.test' });

  // Categories
  for (const name of CATEGORIES) {
    await db.collection('categories').updateOne(
      { name },
      { $set: { name, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }
  const cats = await db.collection('categories').find().toArray();
  const catId = new Map(cats.map((c) => [c.name, c._id]));

  // Products + stock
  for (const p of PRODUCTS) {
    await db.collection('products').updateOne(
      { sku: p.sku },
      {
        $set: {
          title: p.title,
          price: p.price,
          cost: p.cost,
          unit: p.unit,
          category: catId.get(p.cat),
          stock: p.stock,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: { sku: p.sku, createdAt: now },
      },
      { upsert: true },
    );
    const prod = await db.collection('products').findOne({ sku: p.sku });
    await db.collection('product_stocks').updateOne(
      { productId: prod._id, outletId },
      { $set: { quantity: p.stock, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }

  // Sample sales (idempotent by invoiceNumber)
  const SALES = [
    { invoiceNumber: 'SEED-0001', method: 'CASH', paid: 50000, items: [{ sku: 'MKN-001', qty: 3 }, { sku: 'MNM-001', qty: 2 }] },
    { invoiceNumber: 'SEED-0002', method: 'QRIS', paid: 20000, items: [{ sku: 'CMP-001', qty: 1 }, { sku: 'MNM-003', qty: 5 }] },
  ];

  const existingSales = await db
    .collection('sales')
    .countDocuments({ invoiceNumber: { $in: SALES.map((s) => s.invoiceNumber) } });

  if (existingSales > 0) {
    console.log('sales already seeded, skipping');
  } else {
    for (const s of SALES) {
      const products = await db
        .collection('products')
        .find({ sku: { $in: s.items.map((i) => i.sku) } })
        .toArray();
      const bySku = new Map(products.map((p) => [p.sku, p]));

      const items = s.items.map((i) => {
        const p = bySku.get(i.sku);
        return {
          productId: p._id,
          titleSnapshot: p.title,
          priceSnapshot: p.price,
          quantity: i.qty,
          lineTotal: p.price * i.qty,
        };
      });
      const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
      const change = s.method === 'CASH' ? s.paid - subtotal : 0;

      const saleInsert = await db.collection('sales').insertOne({
        invoiceNumber: s.invoiceNumber,
        outletId,
        cashierId: cashier._id,
        subtotal,
        discount: 0,
        total: subtotal,
        paymentMethod: s.method,
        amountPaid: s.paid,
        change,
        status: 'COMPLETED',
        createdAt: now,
        updatedAt: now,
      });
      const saleId = saleInsert.insertedId;

      await db.collection('sale_items').insertMany(
        items.map((i) => ({
          saleId,
          outletId,
          productId: i.productId,
          titleSnapshot: i.titleSnapshot,
          priceSnapshot: i.priceSnapshot,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
          createdAt: now,
          updatedAt: now,
        })),
      );

      for (const i of items) {
        await db.collection('product_stocks').updateOne(
          { productId: i.productId, outletId },
          { $inc: { quantity: -i.quantity }, $set: { updatedAt: now } },
        );
        await db.collection('stock_movements').insertOne({
          productId: i.productId,
          outletId,
          type: 'SALE',
          quantity: i.quantity,
          reason: s.invoiceNumber,
          saleId,
          userId: cashier._id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  console.log('seed done');
  console.log('admin login   : admin@pos.test / admin1234');
  console.log('cashier login : agus@pos.test / kasir1234');
  console.log('outletId      :', String(outletId));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('seed failed:', e.message);
  process.exit(1);
});
