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
 * So these are invented — but they occupy the slots people actually open
 * every day: quick commerce, food delivery, ride-hailing, pharmacy,
 * streaming, recharges, groceries. A board of artisanal millet snacks and
 * flatweave rugs is charming and completely unlike anybody's phone.
 *
 * Names are checked against real Indian brands as well as against being
 * fictional — an invented name a letter away from a real company is the
 * same problem wearing a disguise — and links point at the reserved
 * `.example` TLD. Real social proof is the first real logo on the real
 * board; this is a furnished room and should read as one.
 *
 *   npm run db:seed          # add missing brands
 *   npm run db:seed -- wipe  # clear demo brands first
 */
import { Client } from "pg";

const BRANDS = [
  ["Turant", "Shopping", "Groceries at your door in ten minutes", "Quick commerce · 22 cities", "Free delivery for a month", "⚡", 9800, "online"],
  ["Zaika Now", "Food & Beverage", "Food delivery from 40,000 kitchens", "Marketplace · 35 cities", "₹150 off your next four orders", "🍛", 9500, "online"],
  ["Sawari", "Travel", "Autos and cabs, fixed fares", "Ride-hailing · 28 cities", "₹100 off five rides", "🛺", 9200, "online"],
  ["Kaapi Kettle", "Food & Beverage", "Filter coffee, 300 counters", "D2C + cafés · pan-India", "A free coffee every week", "☕", 8900, "counter"],
  ["Dawai Direct", "Beauty & Wellness", "Medicines delivered in two hours", "Pharmacy · 40 cities", "20% off your first order", "💊", 8600, "online"],
  ["Sur Stream", "Entertainment", "Music without the ad breaks", "Streaming · pan-India", "Three months free", "🎵", 8300, "online"],
  ["Pehnava", "Shopping", "Fashion from 3,000 labels", "Marketplace · pan-India", "₹500 off your first order", "👗", 8000, "online"],
  ["Haldi House", "Beauty & Wellness", "Daily skincare, honestly labelled", "D2C · ships nationwide", "Free 3-step starter set", "✨", 7700, "online"],
  ["Khata Pay", "Shopping", "Bills, recharges and UPI in one app", "Payments · pan-India", "₹200 cashback on recharges", "💳", 7400, "online"],
  ["Sabzi Direct", "Food & Beverage", "Farm to door, 400 growers listed", "Marketplace · 12 cities", "₹300 off your first basket", "🥬", 7100, "online"],
  ["Manoranjan+", "Entertainment", "Films and series, one subscription", "Streaming · pan-India", "Two months on us", "📺", 6800, "online"],
  ["Dabba Daily", "Food & Beverage", "Home-cooked lunch, every working day", "Marketplace · 14 cities", "A free week", "🍱", 6550, "online"],
  ["Taar Audio", "Shopping", "Earphones built to be repaired", "D2C · ships nationwide", "Flat ₹1500 off", "🎧", 6300, "online"],
  ["Chalo Rides", "Travel", "Daily commute, monthly pass", "Mobility · 18 cities", "A free week of rides", "🚌", 6050, "online"],
  ["Saboon Co", "Beauty & Wellness", "Soap and shampoo, refillable", "D2C · ships nationwide", "Free refill pouch", "🧼", 5800, "online"],
  ["Bazaar Box", "Shopping", "Everything, next-day", "Marketplace · pan-India", "₹400 off anything", "📦", 5600, "online"],
  ["Chai Patti Co", "Food & Beverage", "The tea you drink twice a day", "D2C · ships nationwide", "A free month's leaf", "🫖", 5400, "online"],
  ["Sehat Store", "Beauty & Wellness", "Lab tests booked at home", "Healthtech · 30 cities", "A free full-body test", "🩺", 5200, "online"],
  ["Khel Arcade", "Entertainment", "Games, no in-app purchases", "Subscription · pan-India", "Three months free", "🎮", 5000, "online"],
  ["Pehelwan Protein", "Fitness", "Whey, tested batch by batch", "D2C · ships nationwide", "A free 1kg tub", "💪", 4800, "online"],
  ["Raashan Room", "Food & Beverage", "The monthly grocery run, automated", "Subscription · 20 cities", "₹500 off your first month", "🛒", 4600, "online"],
  ["Charger Club", "Shopping", "Cables that outlive the phone", "D2C · ships nationwide", "A free fast charger", "🔌", 4400, "online"],
  ["Kapda Circle", "Shopping", "Pre-loved fashion, steamed and sorted", "Marketplace · pan-India", "₹400 off your first buy", "♻️", 4200, "online"],
  ["Recharge Adda", "Shopping", "Mobile and DTH, one tap", "Payments · pan-India", "₹100 off four recharges", "📱", 4000, "online"],
  ["Nimbu Press", "Food & Beverage", "Cold-pressed, delivered daily", "D2C · 18 cities", "A free week", "🍋", 3820, "online"],
  ["Subah Run Club", "Fitness", "Coached 5am runs, any pace", "Subscription · pan-India", "A month free", "🌅", 3650, "online"],
  ["Safar Luggage", "Travel", "Cabin bags with lifetime wheels", "D2C · ships nationwide", "₹2000 off a cabin bag", "🧳", 3480, "online"],
  ["Manjan Co", "Beauty & Wellness", "Toothpaste without the plastic tube", "D2C · ships nationwide", "A free three-month pack", "🪥", 3320, "online"],
  ["Tiffin Network", "Food & Beverage", "Home cooks, one dabba a day", "Marketplace · 14 cities", "A free week", "🥘", 3170, "online"],
  ["Mistri Now", "Shopping", "Electricians and plumbers, rated", "Services · 24 cities", "First visit free", "🔧", 3020, "online"],
  ["Kajal Eyewear", "Beauty & Wellness", "Frames fitted from a selfie", "D2C · 25 stores", "Free lenses", "👓", 2880, "online"],
  ["Filmi Archive", "Entertainment", "Restored classics, streamed", "Streaming · pan-India", "Three months on us", "📽️", 2740, "online"],
  ["Gaadi Rentals", "Travel", "Self-drive, hourly, no deposit", "Marketplace · 20 cities", "Four hours free", "🚗", 2610, "online"],
  ["Nidra Bedding", "Shopping", "Bedding that survives a decade", "D2C · ships nationwide", "₹1000 off a set", "🛏️", 2480, "online"],
  ["Sattu Co", "Fitness", "Protein from roasted gram", "D2C · ships nationwide", "A free month's supply", "🥤", 2360, "online"],
  ["Purana Bazaar", "Shopping", "Resale, authenticated before it ships", "Marketplace · pan-India", "₹500 off anything", "🔄", 2240, "online"],
  ["Masala Mail", "Food & Beverage", "Whole spices, ground to order", "D2C · ships nationwide", "A free starter box", "🌶️", 2130, "online"],
  ["Akhara Supply", "Fitness", "Kettlebells cast in Ludhiana", "D2C · ships nationwide", "Free pair of grips", "🏋️", 2020, "online"],
  ["Neel Hair", "Beauty & Wellness", "Colour without the ammonia", "D2C · ships nationwide", "A free kit", "💇", 1920, "online"],
  ["Dukaan Local", "Shopping", "Your neighbourhood shops, online", "Marketplace · 30 cities", "Free delivery for a month", "🏬", 1820, "online"],
  ["Ticket Adda", "Entertainment", "Films and gigs, no booking fee", "Marketplace · pan-India", "Two tickets free", "🎫", 1730, "online"],
  ["Achaar Club", "Food & Beverage", "Pickles from surplus fruit", "D2C · ships nationwide", "A free jar trio", "🍯", 1640, "online"],
  ["Jhola Goods", "Shopping", "Everyday carry, built to last", "D2C · ships nationwide", "20% off anything", "🎒", 1560, "online"],
  ["Sleeper Class", "Travel", "Train journeys, planned for you", "Marketplace · pan-India", "A free itinerary", "🚂", 1480, "online"],
  ["Ubtan Lab", "Beauty & Wellness", "Dermatologist-written, not influencer-led", "D2C · ships nationwide", "Free full-size cleanser", "🔬", 1400, "online"],
  ["Bajra Bakes", "Food & Beverage", "Millet snacks, no palm oil", "D2C · ships nationwide", "A free sampler box", "🥖", 1330, "online"],
  ["Kirayewala", "Shopping", "Rent the things you'd use twice", "Marketplace · 18 cities", "First rental free", "🔁", 1260, "online"],
  ["Surya Mats", "Fitness", "Mats that don't slip at minute forty", "D2C · ships nationwide", "20% off any mat", "🪷", 1190, "online"],
  ["Kolhapuri Made", "Shopping", "Chappals, resoleable forever", "D2C · 20 stores", "Free resoling", "👞", 1120, "counter"],
  ["Sukoon Spa", "Beauty & Wellness", "Phones stay in the locker", "18 cities", "₹1000 off a massage", "🤫", 1050, "counter"],
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

/**
 * The showcase bid ladder.
 *
 * #1 anchors at ₹70,000 and the tail lands just above the ₹500 floor,
 * decaying geometrically the way a contested auction board actually does —
 * a steep, expensive top and a long cheap tail — rather than in even steps,
 * which reads as a price list someone typed out.
 *
 * The point of the spread is what it tells a brand reading the board: entry
 * is cheap, but the top is worth many times the floor. The per-row number in
 * BRANDS is only the intended *order*; the amount shown comes from here, so
 * re-pricing the board is one constant rather than fifty edits.
 *
 * Rounded to the ₹100 step so every figure is one a brand could really bid.
 */
const TOP_RUPEES = 70_000;
const TAIL_RUPEES = 900;
const ladderRupees = (i, n) =>
  Math.round((TOP_RUPEES * (TAIL_RUPEES / TOP_RUPEES) ** (i / (n - 1))) / 100) * 100;

let added = 0;
for (const [i, [name, category, tagline, area, reward, icon, , redemption]] of BRANDS.entries()) {
  const rupees = ladderRupees(i, BRANDS.length);
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

/**
 * Re-price an already-seeded board.
 *
 * The loop above skips brands that exist, so editing the ladder would
 * otherwise only ever show up on a fresh database — and the live showcase
 * would quietly keep last month's prices. The seeded payment rows are moved
 * with it so the ledger doesn't contradict the board.
 */
let repriced = 0;
for (const [i, [name]] of BRANDS.entries()) {
  const paise = ladderRupees(i, BRANDS.length) * 100;
  const { rowCount } = await client.query(
    `update brands set bid_paise = $2 where is_demo = true and name = $1 and bid_paise <> $2`,
    [name, paise]
  );
  if (!rowCount) continue;
  await client.query(
    `update bids set amount_paise = $2
      from brands b where bids.brand_id = b.id and b.is_demo = true and b.name = $1`,
    [name, paise]
  );
  repriced += rowCount;
}
if (repriced) {
  console.log(`re-priced ${repriced} showcase bids — #1 ₹${TOP_RUPEES.toLocaleString("en-IN")}, #${BRANDS.length} ₹${TAIL_RUPEES}`);
}

/**
 * Two brands that have given everything away today.
 *
 * A showcase board where every single tile is live never shows the state a
 * real board is in by the afternoon, so the genie's skip and the greyed tile
 * go undemonstrated — to both customers and the brands deciding whether to
 * bid. One of each redemption type, because they run out differently: a
 * counter reward runs its stock down, an online one runs its code batch dry.
 *
 * Idempotent, so it survives a re-seed that skips existing brands.
 */
const CLAIMED_OUT = ["Kaapi Kettle", "Sur Stream"];
for (const name of CLAIMED_OUT) {
  const { rows } = await client.query(
    `update rewards set remaining = 0
       from brands
      where rewards.brand_id = brands.id and brands.is_demo = true and brands.name = $1
      returning rewards.id`,
    [name]
  );
  if (!rows.length) continue;
  // For an online reward the batch *is* the stock, so leaving unassigned
  // codes behind would contradict the zero.
  await client.query(
    `update coupon_codes set assigned_at = coalesce(assigned_at, now()) where reward_id = $1`,
    [rows[0].id]
  );
  console.log(`marked "${name}" all-claimed`);
}

/**
 * A few wishes so the wish page has something to show between windows.
 *
 * These are pitched at the scale the board is: the brands on it deliver,
 * stream and ship nationwide, so the wishes have to be things a brand in
 * any city could grant. A wish for a particular neighbourhood café is a
 * wish nobody on this board can act on, and it quietly tells a visiting
 * brand that this is a local listings site.
 */
const WISHES = [
  ["Free delivery on my grocery orders for a month", "Shopping"],
  ["₹100 off food delivery on the nights I can't cook", "Food & Beverage"],
  ["A streaming subscription without the ad breaks", "Entertainment"],
  ["Cab fares that don't double on the airport run", "Travel"],
  ["My monthly medicines delivered instead of queued for", "Beauty & Wellness"],
  ["A protein tub that isn't priced like a luxury", "Fitness"],
];

const { rows: wishUser } = await client.query(
  `insert into users (email) values ('demo+wisher@brandgenie.test')
   on conflict (email) do update set email = excluded.email returning id`
);
// Replaced rather than left alone on a re-seed, so editing the list above
// actually changes what the page shows. Scoped to the demo wisher's own
// rows — a real person's wish is never touched.
await client.query(`delete from wishes where user_id = $1`, [wishUser[0].id]);
for (const [text, category] of WISHES) {
  await client.query(
    `insert into wishes (user_id, text, category, day_key) values ($1,$2,$3,$4)`,
    [wishUser[0].id, text, category, new Date().toISOString().slice(0, 10)]
  );
}
console.log(`seeded ${WISHES.length} wishes`);

console.log(`seeded ${added} showcase brands (is_demo, /try boards only)`);
await client.end();
