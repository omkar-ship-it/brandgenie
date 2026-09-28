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
  ["Kaapi Kettle", "Food & Beverage", "Filter coffee, ground the morning it ships", "D2C · ships nationwide", "First pack free", "☕", 9800, "online"],
  ["Haldi House", "Beauty & Wellness", "Six products, honestly labelled", "D2C · ships nationwide", "Free 3-step starter set", "✨", 9400, "online"],
  ["Sabzi Direct", "Food & Beverage", "Farm to door, 400 growers listed", "Marketplace · 12 cities", "₹300 off your first basket", "🥬", 9000, "online"],
  ["Charkha Cotton", "Shopping", "Handspun, made to order", "D2C · ships nationwide", "25% off your first order", "🧵", 8600, "online"],
  ["Pehelwan Protein", "Fitness", "Whey, tested batch by batch", "D2C · ships nationwide", "A free 1kg tub", "💪", 8200, "online"],
  ["Purana Bazaar", "Shopping", "Resale, authenticated before it ships", "Marketplace · pan-India", "₹500 off anything", "🔄", 7800, "online"],
  ["Ubtan Lab", "Beauty & Wellness", "Dermatologist-written, not influencer-led", "D2C · ships nationwide", "Free full-size cleanser", "🔬", 7400, "online"],
  ["Taar Audio", "Shopping", "Earphones built to be repaired", "D2C · ships nationwide", "Flat ₹1500 off", "🎧", 7000, "online"],
  ["Dukaan Local", "Shopping", "Your neighbourhood shops, online", "Marketplace · 30 cities", "Free delivery for a month", "🏬", 6700, "online"],
  ["Bajra Bakes", "Food & Beverage", "Millet snacks, no palm oil", "D2C · ships nationwide", "A free sampler box", "🥖", 6400, "online"],
  ["Kajal Eyewear", "Beauty & Wellness", "Frames fitted from a selfie", "D2C · 25 stores", "Free lenses", "👓", 6100, "online"],
  ["Kapda Circle", "Shopping", "Pre-loved fashion, steamed and sorted", "Marketplace · pan-India", "₹400 off your first buy", "👗", 5800, "online"],
  ["Surya Mats", "Fitness", "Mats that don't slip at minute forty", "D2C · ships nationwide", "20% off any mat", "🪷", 5500, "online"],
  ["Masala Mail", "Food & Beverage", "Whole spices, ground to order", "D2C · ships nationwide", "A free starter box", "🌶️", 5200, "online"],
  ["Chikankari Room", "Shopping", "Hand-embroidered in Lucknow", "D2C · ships nationwide", "Free monogram", "🪡", 4950, "online"],
  ["Ticket Adda", "Entertainment", "Gigs and plays, no booking fee", "Marketplace · pan-India", "Two tickets free", "🎫", 4700, "online"],
  ["Reetha Rituals", "Beauty & Wellness", "Refill pouches, not new bottles", "D2C · ships nationwide", "Free refill pouch", "🌿", 4450, "online"],
  ["Nidra Bedding", "Shopping", "Bedding that survives a decade", "D2C · ships nationwide", "₹1000 off a set", "🛏️", 4200, "online"],
  ["Kirayewala", "Shopping", "Rent the things you'd use twice", "Marketplace · 18 cities", "First rental free", "🔁", 3980, "online"],
  ["Chai Patti Co", "Food & Beverage", "Single-estate leaf, vacuum packed", "D2C · ships nationwide", "A free sampler", "🫖", 3760, "online"],
  ["Jhola Goods", "Shopping", "Everyday carry, built to last", "D2C · ships nationwide", "20% off anything", "🎒", 3550, "online"],
  ["Mistri Now", "Shopping", "Electricians and plumbers, rated", "Marketplace · 24 cities", "First visit free", "🔧", 3350, "online"],
  ["Kumkumadi Co", "Beauty & Wellness", "One oil, made the long way", "D2C · ships nationwide", "A free 10ml bottle", "🪔", 3160, "online"],
  ["Achaar Club", "Food & Beverage", "Pickles from surplus fruit", "D2C · ships nationwide", "A free jar trio", "🍯", 2980, "online"],
  ["Safar Luggage", "Travel", "Cabin bags with lifetime wheels", "D2C · ships nationwide", "₹2000 off a cabin bag", "🧳", 2810, "online"],
  ["Jaipur Block Co", "Shopping", "Hand-blocked, small runs", "D2C · ships nationwide", "20% off any set", "🎨", 2650, "online"],
  ["Tiffin Network", "Food & Beverage", "Home cooks, one dabba a day", "Marketplace · 14 cities", "A free week", "🍱", 2500, "online"],
  ["Akhara Supply", "Fitness", "Kettlebells cast in Ludhiana", "D2C · ships nationwide", "Free pair of grips", "🏋️", 2360, "online"],
  ["Matka Home", "Shopping", "Terracotta, thrown by hand", "D2C · ships nationwide", "Free water bottle", "🏺", 2230, "online"],
  ["Filmi Archive", "Entertainment", "Restored classics, streamed", "D2C · subscription", "Three months on us", "📽️", 2100, "online"],
  ["Neel Hair", "Beauty & Wellness", "Colour without the ammonia", "D2C · ships nationwide", "A free kit", "💇", 1980, "online"],
  ["Gaadi Rentals", "Travel", "Self-drive, hourly, no deposit", "Marketplace · 20 cities", "Four hours free", "🚗", 1870, "online"],
  ["Sattu Co", "Fitness", "Protein from roasted gram", "D2C · ships nationwide", "A free month's supply", "🥤", 1760, "online"],
  ["Kitab Bindery", "Entertainment", "Books rebound by hand", "D2C · ships nationwide", "Free rebinding", "📚", 1660, "online"],
  ["Bidri Works", "Shopping", "Inlay metalwork from Bidar", "D2C · ships nationwide", "15% off any piece", "🪙", 1560, "online"],
  ["Nimbu Press", "Food & Beverage", "Cold-pressed, nothing added", "D2C · 18 cities", "A free week", "🍋", 1470, "online"],
  ["Dand Bands", "Fitness", "Resistance bands that don't snap", "D2C · ships nationwide", "A free set", "🧰", 1380, "online"],
  ["Bartan Exchange", "Shopping", "Steel and copper, bought back", "Marketplace · 16 cities", "₹400 off any swap", "🍽️", 1300, "online"],
  ["Kolhapuri Made", "Shopping", "Chappals, resoleable forever", "D2C · 20 stores", "Free resoling", "👞", 1220, "counter"],
  ["Taash Games", "Entertainment", "Card games for Indian living rooms", "D2C · ships nationwide", "A free deck", "🃏", 1150, "online"],
  ["Dhurrie House", "Shopping", "Flatweave rugs, made to order", "D2C · ships nationwide", "15% off any rug", "🧶", 1080, "online"],
  ["Rann Outfitters", "Travel", "Desert and hill gear, rented", "Marketplace · 16 cities", "First rental free", "⛺", 1010, "online"],
  ["Bombay Bindery", "Shopping", "Notebooks that lie flat", "D2C · ships nationwide", "Free pocket notebook", "📓", 950, "online"],
  ["Ganne Press", "Food & Beverage", "Sugarcane, pressed to order", "D2C · 14 cities", "A free week", "🧃", 890, "counter"],
  ["Tulsi & Pot", "Shopping", "Plants that survive flats", "D2C · 15 cities", "A free plant", "🪴", 830, "online"],
  ["Thela Market", "Food & Beverage", "Street carts, licensed and listed", "Marketplace · 9 cities", "₹200 off your first order", "🛒", 770, "online"],
  ["Sleeper Class", "Travel", "Train journeys, planned for you", "Marketplace · pan-India", "A free itinerary", "🚂", 710, "online"],
  ["Konkan Coast Co", "Travel", "Coastal stays, booked direct", "Marketplace · pan-India", "₹2000 off a stay", "🌊", 650, "online"],
  ["Subah Run Club", "Fitness", "Coached 5am runs, any pace", "D2C · subscription", "A month free", "🌅", 580, "online"],
  ["Sukoon Spa", "Beauty & Wellness", "Phones stay in the locker", "18 cities", "₹1000 off a massage", "🤫", 520, "counter"],
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
for (const [i, [name, category, tagline, area, reward, icon, rupees, redemption]] of BRANDS.entries()) {
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

  // D2C and marketplaces ship rather than serve at a till, so their rewards
  // redeem online — which means seeding a real batch of single-use codes,
  // since for that type the batch *is* the stock.
  const online = redemption === "online";
  const { rows: rewardRows } = await client.query(
    `insert into rewards (brand_id, label, icon, total_stock, remaining, valid_days, redemption_type, instructions, redeem_url)
     values ($1,$2,$3,$4,$4,$5,$6,$7,$8) returning id`,
    [
      brandRows[0].id,
      reward,
      icon,
      40,
      14,
      online ? "online" : "counter",
      online ? "Paste at checkout. One per customer, not with other offers." : "Show this screen at the counter.",
      online ? `https://${slug}.example/cart` : null,
    ]
  );

  if (online) {
    const codes = Array.from({ length: 40 }, (_, n) => `${slug.slice(0, 6).toUpperCase()}-${String(n + 1).padStart(3, "0")}`);
    await client.query(
      `insert into coupon_codes (reward_id, code)
       select $1, unnest($2::text[]) on conflict do nothing`,
      [rewardRows[0].id, codes]
    );
  }

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
