import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Optional.
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Point it at the Supabase Postgres connection string before running migrations.",
  );
  process.exit(1);
}

const isLocalHost = /(^|@)(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const sql = postgres(url, {
  ssl: isLocalHost ? false : "require",
  max: 1,
  prepare: false,
});

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const files = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

try {
  await sql.unsafe(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedRows = await sql.unsafe("select version from schema_migrations");
  const applied = new Set(appliedRows.map((row) => row.version));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file}`);
      continue;
    }
    const content = await fs.readFile(path.join(migrationsDir, file), "utf8");
    console.log(`apply ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx.unsafe("insert into schema_migrations (version) values ($1)", [file]);
    });
  }

  console.log("Migrations complete.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
