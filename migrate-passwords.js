/**
 * One-off migration: hash any plaintext passwords in data/users.json with bcrypt.
 *
 * The server already upgrades a user's password to a bcrypt hash automatically
 * the next time they log in successfully — this script is only needed if you
 * want every password hashed immediately, without waiting for each person to
 * log in first.
 *
 * Usage:
 *   node migrate-passwords.js
 *
 * Safe to run multiple times — already-hashed passwords are left untouched.
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_FILE = path.join(__dirname, "data", "users.json");
const BCRYPT_ROUNDS = 10;

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function main() {
  const raw = fs.readFileSync(USERS_FILE, "utf8");
  const users = JSON.parse(raw);

  let migrated = 0;
  let skipped = 0;

  for (const [username, user] of Object.entries(users)) {
    if (!user.password) {
      console.warn(`Skipping ${username}: no password field`);
      continue;
    }
    if (isBcryptHash(user.password)) {
      skipped++;
      continue;
    }
    user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    migrated++;
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  console.log(`Done. Hashed ${migrated} password(s), ${skipped} already hashed.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
