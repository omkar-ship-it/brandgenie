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
 * So these are invented — but they populate the eight shelves in
 * `lib/rules.ts:CATEGORIES`, roughly six or seven a shelf, so a brand
 * arriving from any of them finds company rather than an empty column. The
 * spread is deliberate: lifestyle and D2C wellness at the volume end,
 * aspirational at the top, with experiences and electronics between.
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
  // ---------------------------------------------- Aspirational Brands (6)
  ["Maison Ardour", "Aspirational Brands", "Swiss movements, assembled in Bengaluru", "Watchmaker · 9 boutiques", "₹8,000 off your first watch", "⌚", "counter"],
  ["Vaultgrain", "Aspirational Brands", "Full-grain leather, stitched to order", "Atelier · 6 cities", "A monogrammed card holder, free", "👜", "counter"],
  ["Noir & Neela", "Aspirational Brands", "Fine jewellery, traceable stones", "Jeweller · 11 boutiques", "₹10,000 off above ₹75,000", "💍", "counter"],
  ["Cortez Sound", "Aspirational Brands", "Turntables and valve amps", "Hi-fi · 5 listening rooms", "A free cartridge upgrade", "🔊", "counter"],
  ["Silk Route Cellars", "Aspirational Brands", "Small-batch single malts", "Distillery · 14 cities", "A private tasting for two", "🥃", "counter"],
  ["Baithak Retreats", "Aspirational Brands", "Twelve rooms, one valley", "Boutique hotel · 3 properties", "A suite upgrade on any stay", "🏔️", "counter"],

  // ---------------------------------------------------------- Lifestyle (7)
  ["Charpai Co", "Lifestyle", "Furniture that ships flat, lasts long", "D2C · ships nationwide", "₹3,000 off any piece", "🪑", "online"],
  ["Nidra Bedding", "Lifestyle", "Bedding that survives a decade", "D2C · ships nationwide", "₹1,000 off a set", "🛏️", "online"],
  ["Angan Living", "Lifestyle", "Plants, pots and the stand to match", "D2C · 16 cities", "A free starter planter", "🪴", "online"],
  ["Loom & Ledger", "Lifestyle", "Handwoven throws, named weavers", "D2C · ships nationwide", "20% off your first order", "🧶", "online"],
  ["Kolhapuri Made", "Lifestyle", "Chappals, resoleable forever", "D2C · 20 stores", "Free resoling, for life", "👞", "counter"],
  ["Dhoop Studio", "Lifestyle", "Candles and incense, no synthetics", "D2C · ships nationwide", "A free travel tin", "🕯️", "online"],
  ["Safar Luggage", "Lifestyle", "Cabin bags with lifetime wheels", "D2C · ships nationwide", "₹2,000 off a cabin bag", "🧳", "online"],

  // --------------------------------- D2C · Wellness & Skincare (7)
  ["Haldi House", "D2C · Wellness & Skincare", "Daily skincare, honestly labelled", "D2C · ships nationwide", "Free 3-step starter set", "✨", "online"],
  ["Ubtan Lab", "D2C · Wellness & Skincare", "Dermatologist-written, not influencer-led", "D2C · ships nationwide", "A free full-size cleanser", "🧴", "online"],
  ["Neel Hair", "D2C · Wellness & Skincare", "Colour without the ammonia", "D2C · ships nationwide", "A free kit", "💇", "online"],
  ["Saboon Co", "D2C · Wellness & Skincare", "Soap and shampoo, refillable", "D2C · ships nationwide", "A free refill pouch", "🧼", "online"],
  ["Manjan Co", "D2C · Wellness & Skincare", "Toothpaste without the plastic tube", "D2C · ships nationwide", "A free three-month pack", "🪥", "online"],
  ["Sehat Store", "D2C · Wellness & Skincare", "Lab tests booked at home", "Healthtech · 30 cities", "A free full-body test", "🩺", "online"],
  ["Pehelwan Protein", "D2C · Wellness & Skincare", "Whey, tested batch by batch", "D2C · ships nationwide", "A free 1kg tub", "💪", "online"],

  // ------------------------------------------------------- Electronics (6)
  ["Taar Audio", "Electronics", "Earphones built to be repaired", "D2C · ships nationwide", "Flat ₹1,500 off", "🎧", "online"],
  ["Charger Club", "Electronics", "Cables that outlive the phone", "D2C · ships nationwide", "A free fast charger", "🔌", "online"],
  ["Dobara Devices", "Electronics", "Refurbished phones, 12-month warranty", "Marketplace · pan-India", "₹2,500 off any handset", "📱", "online"],
  ["Roshni Displays", "Electronics", "Monitors calibrated before they ship", "D2C · ships nationwide", "₹4,000 off a 27-inch", "🖥️", "online"],
  ["Chaabi Smart", "Electronics", "Door locks that work without wifi", "D2C · 24 cities", "Free installation", "🔐", "counter"],
  ["Vayu Appliances", "Electronics", "Purifiers with filters you can buy in 2035", "D2C · ships nationwide", "A free spare filter set", "🌬️", "online"],

  // -------------------------------------------------------- E-Commerce (6)
  ["Bazaar Box", "E-Commerce", "Everything, next-day", "Marketplace · pan-India", "₹400 off anything", "📦", "online"],
  ["Pehnava", "E-Commerce", "Fashion from 3,000 labels", "Marketplace · pan-India", "₹500 off your first order", "👗", "online"],
  ["Kapda Circle", "E-Commerce", "Pre-loved fashion, steamed and sorted", "Marketplace · pan-India", "₹400 off your first buy", "♻️", "online"],
  ["Purana Bazaar", "E-Commerce", "Resale, authenticated before it ships", "Marketplace · pan-India", "₹500 off anything", "🔍", "online"],
  ["Jhola Goods", "E-Commerce", "Everyday carry, built to last", "D2C · ships nationwide", "20% off anything", "🎒", "online"],
  ["Kirayewala", "E-Commerce", "Rent the things you'd use twice", "Marketplace · 18 cities", "First rental free", "🔁", "online"],

  // ----------------------------------------------------- Entertainment (6)
  ["Sur Stream", "Entertainment", "Music without the ad breaks", "Streaming · pan-India", "Three months free", "🎵", "online"],
  ["Manoranjan+", "Entertainment", "Films and series, one subscription", "Streaming · pan-India", "Two months on us", "📺", "online"],
  ["Khel Arcade", "Entertainment", "Games, no in-app purchases", "Subscription · pan-India", "Three months free", "🎮", "online"],
  ["Filmi Archive", "Entertainment", "Restored classics, streamed", "Streaming · pan-India", "Three months on us", "🎞️", "online"],
  ["Kitaab Club", "Entertainment", "Audiobooks read by the author", "Subscription · pan-India", "A free two-month pass", "🎧", "online"],
  ["Ticket Adda", "Entertainment", "Films and gigs, no booking fee", "Ticketing · 40 cities", "Two tickets free", "🎫", "online"],

  // ------------------------------------------------------- Experiences (6)
  ["Akhara Strength", "Experiences", "Coached strength classes, any level", "Studios · 22 cities", "A free two-week pass", "🥊", "counter"],
  ["Subah Run Club", "Experiences", "Coached 5am runs, any pace", "Clubs · pan-India", "A month free", "🌅", "counter"],
  ["Sukoon Spa", "Experiences", "Phones stay in the locker", "Spas · 18 cities", "₹1,000 off a massage", "🤫", "counter"],
  ["Chaupal Sessions", "Experiences", "Live sets in courtyards, 80 seats", "Venues · 12 cities", "A guest ticket, free", "🪕", "counter"],
  ["Chaak Studio", "Experiences", "Wheel-throwing, two-hour classes", "Studios · 9 cities", "A free taster class", "🏺", "counter"],
  ["Rasoi School", "Experiences", "Regional cooking, small kitchens", "Studios · 14 cities", "A free knife-skills class", "🔪", "counter"],

  // ------------------------------------------------------------ Travel (6)
  ["Sawari", "Travel", "Autos and cabs, fixed fares", "Ride-hailing · 28 cities", "₹100 off five rides", "🛺", "online"],
  ["Rozana Transit", "Travel", "Daily commute, monthly pass", "Mobility · 18 cities", "A free week of rides", "🚌", "online"],
  ["Gaadi Rentals", "Travel", "Self-drive, hourly, no deposit", "Rentals · 26 cities", "Four hours free", "🚗", "online"],
  ["Sleeper Class", "Travel", "Train journeys, planned for you", "Travel desk · pan-India", "A free itinerary", "🚆", "online"],
  ["Pahaadi Stays", "Travel", "Homestays above 6,000 feet", "Marketplace · 90 properties", "A free night on three", "🏕️", "online"],
  ["Samudra Charters", "Travel", "Day sails off five coastlines", "Charters · 5 ports", "₹3,000 off a charter", "⛵", "counter"],
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

/**
 * Deal the shelves out round-robin instead of in blocks.
 *
 * The list above is grouped by category because that's the only way to edit
 * it sanely — but seeding it in that order puts all six aspirational brands
 * at #1-6 and all seven lifestyle ones at #7-13, so the board looks sorted
 * by category when the whole premise is that it's sorted by bid. Dealing one
 * from each shelf in turn mixes the ladder the way real bidding would, and
 * it's deterministic, so positions don't move on a re-seed.
 */
function interleave(rows) {
  const shelves = new Map();
  for (const row of rows) {
    if (!shelves.has(row[1])) shelves.set(row[1], []);
    shelves.get(row[1]).push(row);
  }
  const piles = [...shelves.values()];
  const out = [];
  for (let i = 0; out.length < rows.length; i++) {
    for (const pile of piles) if (pile[i]) out.push(pile[i]);
  }
  return out;
}

let added = 0;
const ORDERED = interleave(BRANDS);
for (const [i, [name, category, tagline, area, reward, icon, redemption]] of ORDERED.entries()) {
  const rupees = ladderRupees(i, ORDERED.length);
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
  const bidAt = new Date(Date.now() - (ORDERED.length - i) * 60_000);
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
for (const [i, [name]] of ORDERED.entries()) {
  const paise = ladderRupees(i, ORDERED.length) * 100;
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
  console.log(`re-priced ${repriced} showcase bids — #1 ₹${TOP_RUPEES.toLocaleString("en-IN")}, #${ORDERED.length} ₹${TAIL_RUPEES}`);
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
const CLAIMED_OUT = ["Sukoon Spa", "Sur Stream"];
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
  ["A watch I'd actually hand down", "Aspirational Brands"],
  ["Skincare that doesn't need a ten-step routine", "D2C · Wellness & Skincare"],
  ["A streaming subscription without the ad breaks", "Entertainment"],
  ["Headphones I can get repaired, not replaced", "Electronics"],
  ["A pottery class that doesn't need a six-week commitment", "Experiences"],
  ["Two quiet nights somewhere above the tree line", "Travel"],
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
