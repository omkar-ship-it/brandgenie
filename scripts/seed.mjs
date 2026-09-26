/**
 * Fills the board with demo brands so the walk has somewhere to go.
 *
 * The names are invented and the links point at the reserved `.example` TLD
 * on purpose — a real shop's name and Instagram on a live board would imply
 * they'd signed up when they haven't.
 *
 *   npm run db:seed          # add missing brands
 *   npm run db:seed -- wipe  # clear demo brands first
 */
import { Client } from "pg";

const BRANDS = [
  ["Kettle & Kin", "Food & Beverage", "Slow-roasted beans, poured to order", "Indiranagar", "Free cappuccino", "☕", 4200],
  ["Sunday Dough", "Food & Beverage", "Sourdough out of the oven at 7am", "Koramangala", "A loaf on us", "🍞", 3800],
  ["Curl & Comb", "Beauty & Wellness", "Cuts that grow out well", "Jayanagar", "₹500 off any cut", "💇", 3500],
  ["Iron Yard", "Fitness", "Barbells, chalk, no mirrors", "HSR Layout", "One week free", "🏋️", 3100],
  ["Loom Street", "Shopping", "Handwoven cotton, six weavers", "Malleshwaram", "20% off one piece", "🧵", 2900],
  ["The Reel Room", "Entertainment", "Two screens, one projectionist", "Frazer Town", "Two tickets free", "🎬", 2600],
  ["Saltwater Trails", "Travel", "Weekend treks with actual guides", "Bengaluru", "₹1000 off a trek", "🥾", 2400],
  ["Pao Bhaji Co", "Food & Beverage", "Butter is not optional", "BTM Layout", "Free plate of pao bhaji", "🍛", 2200],
  ["Glow Lab", "Beauty & Wellness", "Facials, no upselling", "Whitefield", "Free clean-up", "✨", 2000],
  ["Cadence Cycles", "Fitness", "Service while you wait", "Ulsoor", "Free bike service", "🚲", 1800],
  ["Paper & Pine", "Shopping", "Notebooks that lie flat", "Basavanagudi", "Free pocket notebook", "📓", 1600],
  ["Second Spin", "Entertainment", "Vinyl, mostly Indian jazz", "Shivajinagar", "₹300 off any record", "🎵", 1400],
  ["Hill & Halt", "Travel", "Homestays, four rooms each", "Coorg", "₹1500 off a night", "🏡", 1200],
  ["Tiffin Tales", "Food & Beverage", "Lunch dabbas, no plastic", "Rajajinagar", "A week of lunch free", "🍱", 1000],
  ["Stretch Studio", "Fitness", "Mat work for desk-bound backs", "Domlur", "Three classes free", "🧘", 1100],
  ["Bloom Cart", "Shopping", "Flowers from the Hosur road farms", "Sadashivanagar", "A free bunch", "💐", 1000],
  ["The Chai Bench", "Food & Beverage", "One bench, endless cutting chai", "Majestic", "Chai for two, free", "🫖", 900],
  ["Clay & Kiln", "Entertainment", "Pottery for people with no talent", "Hebbal", "A free wheel session", "🏺", 800],
  ["Sole Mender", "Shopping", "Your shoes, resurrected", "Chickpet", "Free resoling", "👞", 700],
  ["Quiet Hours Spa", "Beauty & Wellness", "Phones stay in the locker", "Richmond Town", "₹800 off a massage", "💆", 600],
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
  ["A filter coffee that doesn't cost ₹300", "Food & Beverage"],
  ["Someone to fix my bike chain without a lecture", "Fitness"],
  ["A haircut where they actually listen", "Beauty & Wellness"],
  ["One good pair of monsoon shoes", "Shopping"],
  ["A Sunday matinee with nobody on their phone", "Entertainment"],
  ["A quiet place in Coorg for two nights", "Travel"],
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
