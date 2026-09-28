/**
 * Move existing rows onto the current category list.
 *
 * `brands.category` and `wishes.category` hold plain strings, and both the
 * brand console and the wish form reject anything not in
 * `lib/rules.ts:CATEGORIES`. So changing that list strands every row on an
 * old value: a brand can still be *shown* on the board, but the moment they
 * open their listing and press save, their own category fails validation and
 * they can't edit anything. This closes that gap.
 *
 * Safe to run more than once — rows already on a current value are skipped.
 *
 *   node --env-file=.env.local scripts/recategorise.mjs           # report
 *   node --env-file=.env.local scripts/recategorise.mjs --apply   # write
 */
import { Client } from "pg";
import { CATEGORIES } from "../lib/rules.ts";

/**
 * Where each retired category goes.
 *
 * Food & Beverage and Fitness have no successor — the new list has no food
 * shelf at all — so they land where their brands are least wrong rather than
 * where they belong: a tiffin service under Lifestyle is a compromise, and
 * worth knowing about rather than silently absorbing.
 */
const MOVES = {
  "Food & Beverage": "Lifestyle",
  "Beauty & Wellness": "D2C · Wellness & Skincare",
  Fitness: "Experiences",
  Shopping: "E-Commerce",
  Entertainment: "Entertainment",
  Travel: "Travel",
};

const apply = process.argv.includes("--apply");
const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

const host = url.replace(/\/\/[^@]*@/, "//***@").split("/")[2];
console.log(`\n${apply ? "APPLYING to" : "Reporting on"} ${host}\n`);

for (const table of ["brands", "wishes"]) {
  const { rows } = await client.query(
    `select category, count(*)::int as n from ${table} group by category order by n desc`
  );
  for (const { category, n } of rows) {
    if (CATEGORIES.includes(category)) {
      console.log(`  ${table}: ${n} × "${category}" — already current`);
      continue;
    }
    const to = MOVES[category];
    if (!to) {
      console.log(`  ${table}: ${n} × "${category}" — NO MAPPING, left alone`);
      continue;
    }
    console.log(`  ${table}: ${n} × "${category}" -> "${to}"${apply ? "" : "  (dry run)"}`);
    if (apply) {
      await client.query(`update ${table} set category = $2 where category = $1`, [category, to]);
    }
  }
}

// Nothing should be left off the list once this has run.
for (const table of ["brands", "wishes"]) {
  const { rows } = await client.query(
    `select count(*)::int as n from ${table} where category <> all($1::text[])`,
    [CATEGORIES]
  );
  const n = rows[0].n;
  console.log(`\n  ${table}: ${n} row(s) still off the category list${n ? "  <-- look at these" : ""}`);
}

if (!apply) console.log("\nNothing written. Re-run with --apply.\n");
await client.end();
