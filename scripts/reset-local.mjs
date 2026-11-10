import fs from "node:fs/promises";
import path from "node:path";

const target = path.join(process.cwd(), ".data", "pglite");

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to delete the local database in a production environment.");
  process.exit(1);
}

await fs.rm(target, { recursive: true, force: true });
console.log(`Removed ${target}. The local database will be recreated on the next request.`);
