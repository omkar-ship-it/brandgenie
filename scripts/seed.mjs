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
  ["Loop Rentals", "Shopping", "Rent the things you'd use twice", "App · 15 cities", "First rental free", "🔁", 550],
  ["Ember & Oak", "Food & Beverage", "Wood-fired, delivered warm", "Online · 6 cities", "A free starter", "🔥", 4000],
  ["Northbeam Supply", "Shopping", "Everyday carry, built to last", "Online", "20% off anything", "🎒", 3600],
  ["Quietly Coffee", "Food & Beverage", "Decaf that tastes like coffee", "Online", "A free 250g bag", "☕", 3400],
  ["Mornings Co", "Beauty & Wellness", "Three steps, honestly", "Online", "Free travel set", "🧴", 3300],
  ["Tread Lightly", "Fitness", "Trail shoes, resoleable", "Online · 9 stores", "₹1200 off a pair", "👟", 3200],
  ["The Long Table", "Food & Beverage", "Supper clubs, twelve seats", "Pan-India", "A seat on us", "🍽️", 3000],
  ["Folded Paper", "Shopping", "Stationery worth keeping", "Online", "Free notebook set", "📐", 2800],
  ["Stillwater Spa", "Beauty & Wellness", "Ninety quiet minutes", "14 cities", "₹900 off a session", "🛁", 2700],
  ["Cadence Run Club", "Fitness", "Coached runs, any pace", "Pan-India", "One month free", "🏃", 2500],
  ["Reel Archive", "Entertainment", "Restored classics, streamed", "Streaming", "Two months free", "📽️", 2300],
  ["Lantern Stays", "Travel", "Small places, good hosts", "Pan-India", "₹1800 off a stay", "🏮", 2100],
  ["Second Harvest", "Food & Beverage", "Preserves from surplus fruit", "Online", "A free jar trio", "🍯", 1900],
  ["Warp & Weave", "Shopping", "Rugs, knotted to order", "Online", "15% off any rug", "🧶", 1700],
  ["Clear Skin Lab", "Beauty & Wellness", "Dermatologist-written", "Online", "Free consult", "🔬", 1500],
  ["Iron & Ash", "Fitness", "Kettlebells and coffee", "8 cities", "Two weeks free", "🏋️", 1300],
  ["The Slow Screen", "Entertainment", "One film a week, discussed", "Online", "A season free", "🎞️", 1150],
  ["Wander Rail", "Travel", "Train journeys, planned", "Pan-India", "₹1000 off a trip", "🚂", 1050],
  ["Peel & Press", "Food & Beverage", "Cold-pressed, no sugar", "Online · 11 cities", "A free week", "🥤", 950],
  ["Bound Editions", "Shopping", "Books, rebound by hand", "Online", "Free rebinding", "📚", 850],
  ["Rest Index", "Beauty & Wellness", "Sleep, measured properly", "Online", "First month free", "🌙", 750],
  ["Pitch & Putt", "Fitness", "Nine holes, no membership", "6 cities", "A free round", "⛳", 700],
  ["Vinyl Errand", "Entertainment", "Records found for you", "Online", "₹400 off a find", "💿", 650],
  ["Salt Route", "Travel", "Coastal drives, mapped", "Pan-India", "A free itinerary", "🧭", 600],
  ["Crust & Crumb", "Food & Beverage", "Sourdough, shipped frozen", "Online", "A free loaf", "🥖", 560],
  ["Thread Count", "Shopping", "Bedding that lasts a decade", "Online", "₹800 off a set", "🛏️", 540],
  ["Clarity Optics", "Beauty & Wellness", "Frames fitted by video", "Online", "Free lenses", "👓", 520],
  ["Basecamp Gear", "Travel", "Rent the kit, once", "12 cities", "First rental free", "⛺", 510],
  ["Open Mic Co", "Entertainment", "Small rooms, new acts", "Pan-India", "Two tickets free", "🎤", 505],
  ["Root & Pot", "Shopping", "Plants that survive flats", "Online", "A free plant", "🪴", 502],
  ["Morning Mile", "Fitness", "5am runs, real people", "Pan-India", "A month free", "🌅", 500],
];

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}

/**
 * Demo data must never reach a live board. `vercel env pull`, `vercel link`
 * and `vercel blob create-store` all rewrite .env.local with production
 * values, so "it's my local file" is not a safe assumption — check the host
 * rather than trusting where the command was run from.
 */
const remote = !/localhost|127\.0\.0\.1/.test(url);
if (remote && !process.argv.includes("--i-mean-it")) {
  console.error(
    `Refusing to seed into a remote database.\n` +
      `  host: ${url.replace(/\/\/[^@]*@/, "//***@").split("/")[2]}\n` +
      `  These brands are flagged is_demo, so they only ever appear on the\n` +
      `  /try boards and never on the board customers play — but seeding a\n` +
      `  live database should still be a deliberate act.\n` +
      `  Re-run with --i-mean-it if that is what you want.`
  );
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

if (process.argv.includes("wipe")) {
  const { rowCount } = await client.query(
    `delete from brands where user_id in (select id from users where email like 'demo+%@brandgenie.test')`
  );
  await client.query(`delete from users where email like 'demo+%@brandgenie.test'`);
  console.log(`cleared ${rowCount} showcase brands`);
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
    `insert into brands (user_id, name, tagline, category, area, website, instagram, bid_paise, bid_at, is_demo)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) returning id`,
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

console.log(`seeded ${added} showcase brands (is_demo, /try boards only)`);
await client.end();
