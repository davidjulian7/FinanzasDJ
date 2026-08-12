import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const db = new Database(path.join(process.cwd(), "data", "finanzas.db"));
const sql = fs.readFileSync(path.join(process.cwd(), "drizzle", "0005_budget_redesign.sql"), "utf-8");
const hash = crypto.createHash("sha256").update(sql).digest("hex");
console.log("Hash:", hash);

db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(hash, Date.now());
console.log("Migration record added");