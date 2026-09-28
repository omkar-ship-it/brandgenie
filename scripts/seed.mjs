/**
 * Fills the board with demo brands so the walk has somewhere to go.
 *
 * WHY THESE ARE ALL INVENTED
 *
 * The obvious way to make an example board look credible is to fill it with
 * the brands everyone recognises. Don't. A public board showing real
 * companies claims they are customers when they are not — that misleads the
 * people it is meant to impress, it is the brand's name to license and not
 * ours to borrow, and a screenshot of it travels without whatever caption
 * said "example".
 *
 * So these are invented, rooted in Indian craft, food and language so the
 * board reads like the market it serves, and their links point at the
 * reserved `.example` TLD. Names were also checked against real Indian
 * brands — an invented name that sits a letter away from a real company is
 * the same problem wearing a disguise. Real social proof is the first real
 * logo on the real board; this is a furnished room, and it should read as
 * one.
 *
 *   npm run db:seed          # add missing brands
 *   npm run db:seed -- wipe  # clear demo brands first
 */
import { Client } from "pg";

const BRANDS = [
  ["Kaapi Kettle", "Food & Beverage", "Filter coffee, ground the morning it ships", "Online · 40 cities", "First pack free", "☕", 9800],
  ["Haldi House", "Beauty & Wellness", "Six things, honestly labelled", "Online · 60 stores", "Free 3-step starter set", "✨", 9200],
  ["Akhara Strength", "Fitness", "Old-school strength, modern coaching", "App · pan-India", "One month free", "🏋️", 8700],
  ["Charkha Cotton", "Shopping", "Handspun, made to order", "Online · 22 stores", "25% off your first order", "🧵", 8100],
  ["Talkies Weekly", "Entertainment", "Independent cinema, streamed", "Streaming", "Three months on us", "🎬", 7600],
  ["Konkan Coast Co", "Travel", "Small-group coastal trips", "Pan-India", "₹3000 off any trip", "🥾", 7100],
  ["Dabba Daily", "Food & Beverage", "Lunch, cooked this morning", "14 cities", "A free week", "🍱", 6700],
  ["Reetha Rituals", "Beauty & Wellness", "Plant-based, refillable", "Online · 30 stores", "Free refill pouch", "🌿", 6300],
  ["Surya Flow", "Fitness", "Forty-minute classes, live", "Online", "Two weeks free", "🧘", 5900],
  ["Bombay Bindery", "Shopping", "Notebooks that lie flat", "Online", "Free pocket notebook", "📓", 5500],
  ["Sleeper Class", "Travel", "Train journeys, planned for you", "Pan-India", "A free itinerary", "🚂", 5200],
  ["Nimbu Press", "Food & Beverage", "Cold-pressed, nothing added", "Online · 18 cities", "A free week", "🥤", 4900],
  ["Chandan Works", "Beauty & Wellness", "Therapists, booked in two taps", "App · 45 cities", "First session free", "💆", 4600],
  ["Pehelwan Athletics", "Fitness", "Shoes fitted by gait, online", "Online", "Flat ₹2000 off", "👟", 4300],
  ["Jaipur Block Co", "Shopping", "Hand-blocked, small runs", "Online", "20% off any set", "🪡", 4050],
  ["Baithak Live", "Entertainment", "Small rooms, new voices", "Pan-India", "Two tickets free", "🎤", 3850],
  ["Ghat & Gully", "Travel", "Weekend drives, mapped", "Pan-India", "A free route pack", "🧭", 3650],
  ["Bajra Bakes", "Food & Beverage", "Millet breads, baked overnight", "Online · 12 cities", "A free loaf", "🥖", 3450],
  ["Kajal & Clear", "Beauty & Wellness", "Frames fitted over video", "Online · 25 stores", "Free lenses", "👓", 3280],
  ["Dand Baithak", "Fitness", "Bodyweight, no equipment", "Online", "A month free", "💪", 3120],
  ["Jhola Goods", "Shopping", "Everyday carry, built to last", "Online", "20% off anything", "🎒", 2960],
  ["Rangmanch Club", "Entertainment", "Theatre without the booking fee", "Pan-India", "Two tickets free", "🎭", 2820],
  ["Haveli Stays", "Travel", "Four rooms, good hosts", "Pan-India", "₹2500 off a night", "🏮", 2680],
  ["Masala Mail", "Food & Beverage", "Spice boxes, ground to order", "Online", "A free starter box", "🌶️", 2540],
  ["Neend Index", "Beauty & Wellness", "Sleep, measured properly", "Online", "First month free", "🌙", 2420],
  ["Chakra Cycles", "Fitness", "Service while you wait", "20 cities", "A free service", "🚲", 2300],
  ["Dhurrie House", "Shopping", "Flatweave rugs, made to order", "Online", "15% off any rug", "🧶", 2190],
  ["Filmi Archive", "Entertainment", "Restored classics, streamed", "Streaming", "Two months free", "📽️", 2080],
  ["Rann Outfitters", "Travel", "Rent the kit, use it once", "16 cities", "First rental free", "⛺", 1980],
  ["Chai Patti Co", "Food & Beverage", "Single-estate tea, loose leaf", "Online", "A free sampler", "🫖", 1880],
  ["Ubtan Lab", "Beauty & Wellness", "Dermatologist-written, not influencer-led", "Online", "Free consult", "🔬", 1790],
  ["Maidan Sports", "Fitness", "Turf booked by the hour", "9 cities", "A free hour", "⛳", 1700],
  ["Tulsi & Pot", "Shopping", "Plants that survive flats", "Online · 15 cities", "A free plant", "🪴", 1620],
  ["Dastangoi Co", "Entertainment", "Storytelling nights, one a week", "Online", "A season free", "🎞️", 1540],
  ["Backwater Bound", "Travel", "Kerala by boat, slowly", "Pan-India", "A free itinerary", "🗺️", 1470],
  ["Sigri & Smoke", "Food & Beverage", "Coal-grilled, delivered warm", "10 cities", "A free starter", "🔥", 1400],
  ["Shanti Rooms", "Beauty & Wellness", "Ninety quiet minutes", "18 cities", "₹1200 off a session", "🛁", 1330],
  ["Subah Run Club", "Fitness", "5am runs, real people", "Pan-India", "A month free", "🌅", 1270],
  ["Chikankari Room", "Shopping", "Hand-embroidered, Lucknow-made", "Online", "Free monogram", "📐", 1210],
  ["Mehfil Nights", "Entertainment", "Live music, no booking fee", "Pan-India", "Two tickets free", "🎫", 1150],
  ["Pahadi Homes", "Travel", "Hill homestays, four rooms each", "Pan-India", "₹2000 off a night", "🏡", 1100],
  ["Achaar Club", "Food & Beverage", "Pickles from surplus fruit", "Online", "A free jar trio", "🍯", 1050],
  ["Sukoon Spa", "Beauty & Wellness", "Phones stay in the locker", "12 cities", "₹1000 off a massage", "🤫", 1000],
  ["Yoga Patti", "Fitness", "Mat work for desk-bound backs", "Online", "Three classes free", "🪷", 950],
  ["Nidra Bedding", "Shopping", "Bedding that lasts a decade", "Online", "₹1000 off a set", "🛏️", 900],
  ["Kitab Bindery", "Entertainment", "Books, rebound by hand", "Online", "Free rebinding", "📚", 850],
  ["Toy Train Trails", "Travel", "Hill railways, curated", "Pan-India", "₹1500 off a trip", "🛤️", 800],
  ["Ganne Ka Ras", "Food & Beverage", "Sugarcane, pressed to order", "14 cities", "A free week", "🍊", 720],
  ["Kolhapuri Made", "Shopping", "Chappals, resoleable forever", "20 cities", "Free resoling", "👞", 620],
  ["Kirayewala", "Shopping", "Rent the things you'd use twice", "App · 18 cities", "First rental free", "🔁", 520],
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
