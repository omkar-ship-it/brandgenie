/**
 * Fills the board with demo brands so the walk has somewhere to go.
 *
 * These are generic campaign brands, not neighbourhood shops — the board is
 * pitched at brands running a national campaign, so nothing here is tied to a
 * locality. Every name is invented and the links point at the reserved
 * `.example` TLD on purpose: a real brand's name and Instagram on a live
 * board would imply they'd signed up when they haven't.
 *
 *   npm run db:seed          # add missing brands
 *   npm run db:seed -- wipe  # clear demo brands first
 */
import { Client } from "pg";

const BRANDS = [
  ["Perch Coffee", "Food & Beverage", "Cold brew, delivered fortnightly", "Online · ships nationwide", "₹200 off your first box", "☕", 4200],
  ["Lumen Skincare", "Beauty & Wellness", "Six products, no ten-step routine", "Online", "Free 3-step starter set", "✨", 3800],
  ["Ironclad Fitness", "Fitness", "Strength programmes that fit a lunch break", "App · pan-India", "One month free", "🏋️", 3500],
  ["Weft & Warp", "Shopping", "Handloom, made to order", "Online · 12 stores", "25% off your first order", "🧵", 3100],
  ["Reel & Row", "Entertainment", "Independent cinema, streamed", "Streaming · pan-India", "3 months on us", "🎬", 2900],
  ["Slow Miles", "Travel", "Small-group trips, no coaches", "Pan-India", "₹2000 off any trip", "🥾", 2600],
  ["Batch No. 9", "Food & Beverage", "Small-batch bakes, shipped cold", "Online", "A free first box", "🍞", 2400],
  ["Halo Wellness", "Beauty & Wellness", "Therapists, booked in two taps", "App · 40 cities", "First session free", "💆", 2200],
  ["Pace Athletics", "Fitness", "Running shoes fitted by gait, online", "Online", "Flat ₹1500 off", "👟", 2000],
  ["Paperbound", "Shopping", "Notebooks that actually lie flat", "Online", "Free pocket notebook", "📓", 1800],
  ["Vinyl Vault", "Entertainment", "Records, curated monthly", "Subscription · pan-India", "₹500 off a subscription", "🎵", 1600],
  ["Altitude Stays", "Travel", "Hill homestays, four rooms each", "Pan-India", "₹1500 off a night", "🏡", 1400],
  ["The Daily Pour", "Food & Beverage", "Tea, sourced single-estate", "Online", "A free sampler set", "🫖", 1200],
  ["Studio Forty", "Fitness", "Forty-minute classes, live", "Online classes", "Two weeks free", "🧘", 1100],
  ["Highline Goods", "Shopping", "Everyday carry, built to last", "Online", "20% off anything", "🎒", 1000],
  ["Verdant Apothecary", "Beauty & Wellness", "Plant-based, refillable", "Online · 20 stores", "Free refill pouch", "🌿", 900],
  ["Encore Live", "Entertainment", "Gigs, without the booking fee", "Pan-India", "Two tickets free", "🎫", 800],
  ["Salt & Ember", "Food & Beverage", "Meal kits for people who can cook", "Online · 8 cities", "First kit free", "🍲", 700],
  ["Compass & Co", "Travel", "Weekend itineraries, planned for you", "Online", "A free itinerary", "🧭", 600],
  ["Loop Rentals", "Shopping", "Rent the things you'd use twice", "App · 15 cities", "First rental free", "🔁", 500],
];

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

if (process.argv.includes("wipe")) {
  const { rowCount } = await client.query(
    `delete from brands where user_id in (select id from users where email like 'demo+%@brandgenie.test')`
  );
  await client.query(`delete from users where email like 'demo+%@brandgenie.test'`);
  console.log(`cleared ${rowCount} demo brands`);
}

let added = 0;
for (const [i, [name, category, tagline, area, reward, icon, rupees]] of BRANDS.entries()) {
  const email = `demo+${i + 1}@brandgenie.test`;
  const slug = name.toLowerCase().replace(/[^a-z]+/g, "");

  const { rows: userRows } = await client.query(
    `insert into users (email) values ($1)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [email]
  );
  const userId = userRows[0].id;

  const { rows: existing } = await client.query(`select id from brands where user_id = $1`, [userId]);
  if (existing.length) continue;

  // Bids get staggered timestamps so the tie-break ordering is deterministic.
  const bidAt = new Date(Date.now() - (BRANDS.length - i) * 60_000);
  const { rows: brandRows } = await client.query(
    `insert into brands (user_id, name, tagline, category, area, website, instagram, bid_paise, bid_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [
      userId,
      name,
      tagline,
      category,
      area,
      `https://${slug}.example`,
      `https://instagram.com/${slug}`,
      rupees * 100,
      bidAt,
    ]
  );

  await client.query(
    `insert into rewards (brand_id, label, icon, total_stock, remaining, valid_days)
     values ($1,$2,$3,$4,$4,$5)`,
    [brandRows[0].id, reward, icon, 40, 14]
  );

  await client.query(
    `insert into bids (brand_id, amount_paise, status, razorpay_order_id, razorpay_payment_id, paid_at)
     values ($1,$2,'paid',$3,$4,$5)`,
    [brandRows[0].id, rupees * 100, `seed_order_${i}`, `seed_pay_${i}`, bidAt]
  );

  added++;
}

// A few wishes so the wish page has something to show between windows.
const WISHES = [
  ["A coffee subscription that doesn't cost a fortune", "Food & Beverage"],
  ["Running shoes that actually suit my gait", "Fitness"],
  ["Skincare that doesn't need a ten-step routine", "Beauty & Wellness"],
  ["One good bag that lasts a decade", "Shopping"],
  ["A film night with no booking fee", "Entertainment"],
  ["Two quiet nights somewhere with hills", "Travel"],
];

const { rows: wishUser } = await client.query(
  `insert into users (email) values ('demo+wisher@brandgenie.test')
   on conflict (email) do update set email = excluded.email returning id`
);
const { rows: haveWishes } = await client.query(`select id from wishes where user_id = $1 limit 1`, [
  wishUser[0].id,
]);
if (!haveWishes.length) {
  for (const [text, category] of WISHES) {
    await client.query(
      `insert into wishes (user_id, text, category, day_key) values ($1,$2,$3,$4)`,
      [wishUser[0].id, text, category, new Date().toISOString().slice(0, 10)]
    );
  }
  console.log(`seeded ${WISHES.length} wishes`);
}

console.log(`seeded ${added} brands`);
await client.end();
