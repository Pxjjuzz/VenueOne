import "server-only";

import path from "node:path";
import fs from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

export type SqlParam = string | number | boolean | Date | null;
export type SqlRow = Record<string, unknown>;

export type Sql = <T = SqlRow>(text: string, params?: readonly SqlParam[]) => Promise<T[]>;

export type Database = {
  sql: Sql;
  transaction: <T>(fn: (sql: Sql) => Promise<T>) => Promise<T>;
  driver: "supabase-postgres" | "pglite";
};

function isLocalDatabase(): boolean {
  return !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";
}

async function runLocalBootstrap(db: PGlite) {
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);
}

async function runLocalMigrations(db: PGlite) {
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  await db.query(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedResult = await db.query<{ version: string }>(
    "select version from schema_migrations",
  );
  const applied = new Set(appliedResult.rows.map((row) => row.version));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await db.exec(sql);
    await db.query("insert into schema_migrations (version) values ($1)", [file]);
  }
}

async function createLocalDatabase(): Promise<Database> {
  const dataDir = process.env.LOCAL_DB_DIR
    ? path.resolve(process.env.LOCAL_DB_DIR)
    : path.join(process.cwd(), ".data", "pglite");

  await fs.mkdir(dataDir, { recursive: true });

  const { PGlite } = await import("@electric-sql/pglite");
  const pg = await PGlite.create(dataDir);

  await runLocalBootstrap(pg);
  await runLocalMigrations(pg);

  const sql: Sql = async <T = SqlRow>(text: string, params: readonly SqlParam[] = []) => {
    const result = await pg.query<T>(text, params as unknown[]);
    return result.rows;
  };

  return {
    sql,
    driver: "pglite",
    transaction: async <T>(fn: (txSql: Sql) => Promise<T>) =>
      pg.transaction(async (tx) => {
        const txSql: Sql = async <R = SqlRow>(
          text: string,
          params: readonly SqlParam[] = [],
        ) => {
          const result = await tx.query<R>(text, params as unknown[]);
          return result.rows;
        };
        return fn(txSql);
      }),
  };
}

function createRemoteDatabase(url: string): Database {
  const isLocalHost = /(^|@)(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  const client = postgres(url, {
    ssl: isLocalHost ? false : "require",
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    fetch_types: false,
  });

  const sql: Sql = async <T = SqlRow>(text: string, params: readonly SqlParam[] = []) => {
    const result = await client.unsafe(text, params as postgres.ParameterOrJSON<never>[]);
    return result as unknown as T[];
  };

  return {
    sql,
    driver: "supabase-postgres",
    transaction: async <T>(fn: (txSql: Sql) => Promise<T>) =>
      client.begin(async (tx) => {
        const txSql: Sql = async <R = SqlRow>(
          text: string,
          params: readonly SqlParam[] = [],
        ) => {
          const result = await tx.unsafe(
            text,
            params as postgres.ParameterOrJSON<never>[],
          );
          return result as unknown as R[];
        };
        return fn(txSql);
      }),
  };
}

const globalForDb = globalThis as unknown as {
  __commonGroundDb?: Promise<Database>;
};

export function getDb(): Promise<Database> {
  if (!globalForDb.__commonGroundDb) {
    globalForDb.__commonGroundDb = (async () => {
      if (process.env.DATABASE_URL) {
        return createRemoteDatabase(process.env.DATABASE_URL);
      }
      if (isLocalDatabase()) {
        return createLocalDatabase();
      }
      throw new Error(
        "DATABASE_URL is not configured. Set the Supabase Postgres connection string in production, or run the development server locally to use the PGlite database.",
      );
    })();
  }
  return globalForDb.__commonGroundDb;
}

export async function dbQuery<T = SqlRow>(
  text: string,
  params: readonly SqlParam[] = [],
): Promise<T[]> {
  const db = await getDb();
  return db.sql<T>(text, params);
}

export async function withTransaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(fn);
}

export function databaseErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: string; constraint_name?: string; message?: string };
    if (candidate.code === "23505") return "That record already exists.";
    if (candidate.code === "23503") return "A related record is missing or in use.";
    if (candidate.code === "23514") return "The submitted values are not valid.";
  }
  return "The database operation could not be completed.";
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}
