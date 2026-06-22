// One-off migration: rebuild data/users.json under the new HOS -> TL -> Agent
// CRM model (role, department, team, manager), keeping existing passwords/avatars
// for people who are part of the new org chart. Anyone not in the new chart is dropped.
//
// Usage: node migrate-crm-structure.js
const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "data", "users.json");
const BACKUP_FILE = path.join(__dirname, "data", "users.pre-crm-migration.json");

const oldUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

// Match existing users by name (case/diacritic-insensitive) to preserve
// password hashes and avatars. Falls back to a fresh default password.
function normalizeName(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .trim();
}

const byNormalizedName = new Map();
for (const [username, u] of Object.entries(oldUsers)) {
  if (u.name) byNormalizedName.set(normalizeName(u.name), { username, ...u });
}

function findExisting(name) {
  return byNormalizedName.get(normalizeName(name)) || null;
}

// ---- New org chart (from the provided CRM structure) ----

const HOS = { name: "Eline Hamilton", role: "hos", department: "GLOBAL", team: null };

const HOR = [
  { name: "Alex Dior", department: "GLOBAL", team: null },
  { name: "Vadim Polak", department: "GLOBAL", team: null }
];

const TL_SALES = [
  { name: "Martín Sánchez", department: "ES", team: "ES_SALES" },
  { name: "Antonio Santamaría", department: "ES", team: "ES_SALES" },
  { name: "Victoria Lara", department: "ES", team: "ES_SALES" },
  { name: "Michel Pellier", department: "FR", team: "FR_SALES" },
  { name: "Mark Halep", department: "CA", team: "CA_SALES" }
];

// Retention TLs report to one of the two HOR (Head of Retention), split
// round-robin since the org chart doesn't single out who manages whom.
const TL_RETENTION = [
  { name: "Alex Contreras", department: "ES", team: "ES_RETENTION", hor: "Alex Dior" },
  { name: "Carolina Ramos", department: "ES", team: "ES_RETENTION", hor: "Vadim Polak" },
  { name: "Jason Oliver", department: "FR", team: "FR_RETENTION", hor: "Alex Dior" },
  { name: "Austin Hunt", department: "CA", team: "CA_RETENTION", hor: "Vadim Polak" },
  { name: "David Vella", department: "CA", team: "CA_RETENTION", hor: "Alex Dior" }
];

// Each TL's direct agents, exactly as grouped in the org-chart image
// (NOT round-robin — some TLs have more reports than others).
const SALES_TL_AGENTS = {
  "Martín Sánchez": [
    "Antony Bustamante", "Francisco Lopez", "María Isabell Castillo", "Adriana Jiménez",
    "Ainhoa Barajas", "Santiago Ramírez"
  ],
  "Antonio Santamaría": [
    "Katalina Herrera", "Cesar Gonzales", "Sebastian Rossi", "Tatiana Saveedra",
    "Alejandro Torres", "Diego Martinez", "Nicole Ramírez", "Samanta Duarte"
  ],
  "Victoria Lara": ["Christopher Jiménez", "Sofia Gutierrez"],
  "Michel Pellier": ["Franck de-Paul"],
  "Mark Halep": ["Gabriel Adam", "Mary Bram", "Sean Berry", "Frank Micheals", "Lucas Evans"]
};

const RETENTION_TL_AGENTS = {
  "Alex Contreras": ["Ian David Evans", "Derek Salvatore", "Daniel Prado", "Sebastian Rivera"],
  "Carolina Ramos": ["Mathews Fernandez", "David Blanco"],
  "Jason Oliver": ["Robert Dickson", "Jonathan Thabaut"],
  "Austin Hunt": ["Den Nash", "Martin Meyer", "Jade Rowan", "David Marshall", "Alice White", "Mark Raskin"],
  "David Vella": ["Paul Patrick", "David Harold Marcell", "Niko Koren"]
};

const TEAM_TO_DEPT = {
  ES_SALES: "ES", FR_SALES: "FR", CA_SALES: "CA",
  ES_RETENTION: "ES", FR_RETENTION: "FR", CA_RETENTION: "CA"
};

// ---- Build new users dict ----

const newUsers = {};
let nextUserNum = 1;
function nextUsername(existingUsername) {
  if (existingUsername) {
    if (newUsers[existingUsername]) {
      throw new Error(`Username collision on reused key: ${existingUsername}`);
    }
    return existingUsername;
  }
  while (newUsers[`user${nextUserNum}`] || oldUsers[`user${nextUserNum}`]) nextUserNum++;
  const username = `user${nextUserNum}`;
  nextUserNum++;
  return username;
}

function basePayload(name, found) {
  if (found) {
    const { username, ...rest } = found;
    const { password, avatar } = rest;
    return { username, password, avatar: avatar || null };
  }
  // No existing account: create a default plaintext password (will be
  // bcrypt-hashed on first login, same as the legacy flow already supports).
  const slug = normalizeName(name).replace(/[^a-z0-9]/g, "");
  return { username: null, password: `${slug}123#`, avatar: null };
}

function addUser(name, role, department, team, manager) {
  const found = findExisting(name);
  const { username, password, avatar } = basePayload(name, found);
  const finalUsername = nextUsername(username);
  newUsers[finalUsername] = {
    password,
    name,
    role,
    department,
    team,
    manager: manager || null,
    avatar: avatar || undefined
  };
  if (newUsers[finalUsername].avatar === undefined) delete newUsers[finalUsername].avatar;
  return finalUsername;
}

// 1. HOS
addUser(HOS.name, "hos", HOS.department, HOS.team, null);

// 2. HOR (Head(s) of Retention) - peers of HOS, sit above the retention TLs.
for (const hor of HOR) {
  addUser(hor.name, "hor", hor.department, hor.team, null);
}

// 3. TL Sales
for (const tl of TL_SALES) {
  addUser(tl.name, "tl_sales", tl.department, tl.team, HOS.name);
}

// 4. TL Retention - distributed round-robin across the HOR(s)
TL_RETENTION.forEach((tl, i) => {
  const manager = HOR[i % HOR.length].name;
  addUser(tl.name, "tl_retention", tl.department, tl.team, manager);
});

// 5. Sales agents - exactly as grouped under each TL in the org chart
for (const tl of TL_SALES) {
  const agentNames = SALES_TL_AGENTS[tl.name] || [];
  for (const agentName of agentNames) {
    addUser(agentName, "sales", tl.department, tl.team, tl.name);
  }
}

// 6. Retention agents - exactly as grouped under each TL in the org chart
for (const tl of TL_RETENTION) {
  const agentNames = RETENTION_TL_AGENTS[tl.name] || [];
  for (const agentName of agentNames) {
    addUser(agentName, "retention", tl.department, tl.team, tl.name);
  }
}

// ---- Write out ----

// Admin accounts (e.g. IT/system logins) live outside the HOS/HOR org chart
// entirely — carry them over untouched so this migration never locks them out.
for (const [username, u] of Object.entries(oldUsers)) {
  if (u.role === "admin" && !newUsers[username]) {
    newUsers[username] = u;
  }
}

fs.copyFileSync(USERS_FILE, BACKUP_FILE);
fs.writeFileSync(USERS_FILE, JSON.stringify(newUsers, null, 2));

console.log(`Migrated ${Object.keys(newUsers).length} users into the new CRM structure.`);
console.log(`Backup of the old users.json saved to ${BACKUP_FILE}`);

// Print a quick org-chart summary for sanity-checking.
const byManager = {};
for (const u of Object.values(newUsers)) {
  const key = u.manager || "(top)";
  byManager[key] = byManager[key] || [];
  byManager[key].push(`${u.name} [${u.role}]`);
}
console.log("\n--- Org chart summary ---");
for (const [manager, reports] of Object.entries(byManager)) {
  console.log(`${manager}:`);
  for (const r of reports) console.log(`  - ${r}`);
}
