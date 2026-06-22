require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { setupTelegramBot } = require("./telegram");
const { ALL_TYPES: TICKET_TYPE_VALUES, DEPARTMENTS: TICKET_DEPARTMENTS } = require("./ticket-types");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
// Send the session cookie with the Secure flag only when explicitly enabled
// (i.e. when the app is served over HTTPS). Defaults off so local HTTP works.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");
const TICKET_ATTACHMENTS_DIR = path.join(UPLOADS_DIR, "tickets");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const HISTORY_FILE = path.join(DATA_DIR, "chatHistory.json");
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
const MAX_HISTORY_PER_ROOM = 100;
const BCRYPT_ROUNDS = 10;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });
fs.mkdirSync(TICKET_ATTACHMENTS_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR));

/* =========================
   JSON PERSISTENCE HELPERS
========================= */

function loadJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Failed to load ${file}, using fallback:`, err.message);
    return fallback;
  }
}

function saveJsonSafe(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to save ${file}:`, err.message);
  }
}

/* =========================
   USERS (loaded from disk, not require() —
   so password/avatar updates persist and are visible
   without restarting the server)
========================= */

let users = loadJsonSafe(USERS_FILE, {});

function persistUsers() {
  saveJsonSafe(USERS_FILE, users);
}

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

/* =========================
   PERSISTENT SESSIONS
   sessions[sessionId] = { username, createdAt }
========================= */

let sessions = loadJsonSafe(SESSIONS_FILE, {});
let chatHistory = loadJsonSafe(HISTORY_FILE, { GLOBAL: [] });
let tickets = loadJsonSafe(TICKETS_FILE, []);

function persistSessions() {
  saveJsonSafe(SESSIONS_FILE, sessions);
}

function persistHistory() {
  saveJsonSafe(HISTORY_FILE, chatHistory);
}

function persistTickets() {
  saveJsonSafe(TICKETS_FILE, tickets);
}

/* =========================
   TELEGRAM BOT
   Notifies the admin on new tickets and lets them change ticket status
   directly from Telegram. Status changes made via Telegram are recorded
   as performed by TELEGRAM_ACTING_USERNAME (defaults to "safari").
========================= */

const TELEGRAM_ACTING_USERNAME = process.env.TELEGRAM_ACTING_USERNAME || "safari";

const telegramBot = setupTelegramBot({
  tickets,
  persistTickets,
  users,
  actingUsername: TELEGRAM_ACTING_USERNAME
});

function createSession(username) {
  const sessionId = `${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
  sessions[sessionId] = { username, createdAt: Date.now() };
  persistSessions();
  return sessionId;
}

function destroySession(sessionId) {
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    persistSessions();
  }
}

function getSessionUser(req) {
  const sessionId = req.cookies.sessionId;
  if (!sessionId) return null;
  const session = sessions[sessionId];
  if (!session) return null;
  return session.username;
}

/* =========================
   LOGIN RATE LIMITING (basic, in-memory)
   Protects the weak/legacy passwords during migration.
========================= */

const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map(); // key: ip+username -> { count, windowStart }

function isRateLimited(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginAttempt(key) {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearLoginAttempts(key) {
  loginAttempts.delete(key);
}

/* =========================
   AUTH MIDDLEWARE
========================= */

function authMiddleware(req, res, next) {
  const username = getSessionUser(req);

  if (!username || !users[username]) {
    // Only redirect for actual page navigations (not fetch/XHR/API calls)
    const isPageNav = req.headers["sec-fetch-mode"] === "navigate" && req.headers["sec-fetch-dest"] === "document";
    if (isPageNav) {
      return res.redirect("/login.html");
    }
    return res.status(401).json({ error: "Not logged in" });
  }

  req.username = username;
  req.user = users[username];
  next();
}

/* =========================
   ROUTES - PAGES
========================= */

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.get("/dashboard", authMiddleware, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

app.get("/crm", authMiddleware, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "crm.html"));
});

// per-user page, rendered from the user.html template.
// Any logged-in user can view any colleague's profile (e.g. from the CRM
// org chart) — only the owner gets edit controls, handled client-side.
app.get("/u/:username", (req, res) => {
  const { username } = req.params;
  const sessionUser = getSessionUser(req);

  if (!sessionUser || !users[sessionUser]) {
    return res.redirect("/login.html");
  }

  if (!users[username]) {
    return res.redirect("/dashboard.html");
  }

  const user = users[username];

  fs.readFile(path.join(PUBLIC_DIR, "user.html"), "utf8", (err, template) => {
    if (err) {
      console.error("Failed to read user.html template:", err.message);
      return res.status(500).send("Template error");
    }

    const html = template
      .replaceAll("{{username}}", username)
      .replaceAll("{{name}}", escapeHtml(user.name || username))
      .replaceAll("{{team}}", escapeHtml(user.team || "No team"))
      .replaceAll("{{role}}", escapeHtml(user.role || "agent"))
      .replace('"__AVATAR_JSON__"', JSON.stringify(user.avatar || null));

    res.send(html);
  });
});

// Lightweight JSON profile card data, used by the "quick view" modal that
// pops up over the dashboard (e.g. clicking a person in the CRM org chart)
// instead of doing a full page navigation to /u/:username.
app.get("/api/users/:username/profile-card", authMiddleware, (req, res) => {
  const { username } = req.params;
  const user = users[username];
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    username,
    name: user.name || username,
    team: user.team || null,
    role: user.role || "agent",
    department: user.department || null,
    manager: user.manager || null,
    avatar: user.avatar || null
  });
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   ROLE HELPERS
========================= */

function isAdmin(user) {
  return user && user.role === "admin";
}

// HOS (Head of Sales) sits above the whole org chart and can see/manage everything.
function isHos(user) {
  return user && user.role === "hos";
}

function isTlSales(user) {
  return user && user.role === "tl_sales";
}

function isTlRetention(user) {
  return user && user.role === "tl_retention";
}

// Any team-leader role (sales or retention).
function isTeamLeader(user) {
  return isTlSales(user) || isTlRetention(user);
}

function isSalesAgent(user) {
  return user && user.role === "sales";
}

function isRetentionAgent(user) {
  return user && user.role === "retention";
}

// Kept for backward compatibility with any legacy "manager" role records.
function isManager(user) {
  return user && (user.role === "manager" || isTeamLeader(user) || isHos(user));
}

function sameTeam(userA, userB) {
  if (!userA || !userB) return false;
  if (!userA.team || !userB.team) return false;
  return userA.team === userB.team;
}

// True if `manager` is the direct TL of `agent` (matched by name, per the
// CRM org chart, since agents store their manager's display name).
function isDirectManagerOf(managerUser, agentUser) {
  if (!managerUser || !agentUser) return false;
  return Boolean(agentUser.manager) && agentUser.manager === managerUser.name;
}

// Resolves the live user record (with username) for a given display name.
function findUserByName(name) {
  if (!name) return null;
  for (const [username, u] of Object.entries(users)) {
    if (u.name === name) return { username, ...u };
  }
  return null;
}

/* =========================
   ROUTES - AUTH API
========================= */

app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(401).json({ error: "Wrong credentials" });
  }

  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const limitKey = `${ip}:${username}`;

  if (isRateLimited(limitKey)) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }

  const user = users[username];

  if (!user) {
    recordLoginAttempt(limitKey);
    return res.status(401).json({ error: "Wrong credentials" });
  }

  let valid = false;

  if (isBcryptHash(user.password)) {
    valid = await bcrypt.compare(password, user.password);
  } else {
    // Legacy plaintext password (pre-migration). Verify, then upgrade to a hash.
    valid = user.password === password;
    if (valid) {
      user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
      persistUsers();
    }
  }

  if (!valid) {
    recordLoginAttempt(limitKey);
    return res.status(401).json({ error: "Wrong credentials" });
  }

  clearLoginAttempts(limitKey);

  const sessionId = createSession(username);

  const cookieOpts = { httpOnly: true, sameSite: "lax", secure: COOKIE_SECURE };
  if (req.body.remember) cookieOpts.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  res.cookie("sessionId", sessionId, cookieOpts);

  res.json({
    ok: true,
    user: { ...user, password: undefined, agentData: undefined },
    redirect: "/dashboard.html"
  });
});

app.get("/logout", (req, res) => {
  destroySession(req.cookies.sessionId);
  res.clearCookie("sessionId", { httpOnly: true, sameSite: "lax", secure: COOKIE_SECURE });
  res.json({ ok: true });
});

app.get("/me", authMiddleware, (req, res) => {
  res.json({ username: req.username, ...req.user, password: undefined, agentData: undefined });
});

/* =========================
   AGENT DATA (Gmail / Zoho credentials)
   Visible to: the profile owner + admins.
   Editable by: admins only.
   Stored under users[username].agentData = {
     gmailAddress: string,
     zoho: {
       soltren:    { mail: string, password: string },
       isp:        { mail: string, password: string }
     }
   }
========================= */

const ZOHO_BRANDS = ["soltren", "isp"];

function emptyAgentData() {
  return {
    gmailAddress: "",
    zoho: {
      soltren: { mail: "", password: "" },
      isp: { mail: "", password: "" }
    }
  };
}

// Normalizes whatever is stored on disk (which may predate this feature,
// or be partially filled in) into the full shape the client expects.
function getAgentData(user) {
  const base = emptyAgentData();
  const stored = (user && user.agentData) || {};

  base.gmailAddress = stored.gmailAddress || "";
  for (const brand of ZOHO_BRANDS) {
    const storedBrand = (stored.zoho && stored.zoho[brand]) || {};
    base.zoho[brand].mail = storedBrand.mail || "";
    base.zoho[brand].password = storedBrand.password || "";
  }
  return base;
}

function canViewAgentData(viewerUsername, targetUsername, viewerUser) {
  return viewerUsername === targetUsername || isAdmin(viewerUser);
}

// GET is available to the profile owner and to admins.
app.get("/api/users/:username/agent-data", authMiddleware, (req, res) => {
  const { username } = req.params;
  const target = users[username];
  if (!target) return res.status(404).json({ error: "User not found" });

  if (!canViewAgentData(req.username, username, req.user)) {
    return res.status(403).json({ error: "Not allowed to view this data" });
  }

  res.json({
    data: getAgentData(target),
    canEdit: isAdmin(req.user)
  });
});

// PATCH is admin-only, regardless of whose profile it is.
app.patch("/api/users/:username/agent-data", authMiddleware, (req, res) => {
  const { username } = req.params;
  const target = users[username];
  if (!target) return res.status(404).json({ error: "User not found" });

  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: "Only admins can edit this data" });
  }

  const body = req.body || {};
  const current = getAgentData(target);

  const next = {
    gmailAddress: typeof body.gmailAddress === "string" ? body.gmailAddress.trim() : current.gmailAddress,
    zoho: {
      soltren: { ...current.zoho.soltren },
      isp: { ...current.zoho.isp }
    }
  };

  const incomingZoho = body.zoho || {};
  for (const brand of ZOHO_BRANDS) {
    const incomingBrand = incomingZoho[brand];
    if (incomingBrand && typeof incomingBrand === "object") {
      if (typeof incomingBrand.mail === "string") {
        next.zoho[brand].mail = incomingBrand.mail.trim();
      }
      if (typeof incomingBrand.password === "string") {
        next.zoho[brand].password = incomingBrand.password;
      }
    }
  }

  target.agentData = next;
  persistUsers();

  res.json({ ok: true, data: next });
});

/* =========================
   DIRECT MESSAGES (1-on-1 chats)
   Room id is deterministic: "dm:<userA>:<userB>" with usernames sorted,
   so both participants always compute the same room name.
========================= */

const DM_ROOM_PREFIX = "dm:";

function dmRoomId(usernameA, usernameB) {
  const [a, b] = [usernameA, usernameB].sort();
  return `${DM_ROOM_PREFIX}${a}:${b}`;
}

// Returns the other participant's username if `room` is a DM room that
// includes `username`, otherwise null. Used to authorize socket access.
function dmOtherParticipant(room, username) {
  if (!room || !room.startsWith(DM_ROOM_PREFIX)) return null;
  const [a, b] = room.slice(DM_ROOM_PREFIX.length).split(":");
  if (a === username) return b;
  if (b === username) return a;
  return null;
}

// List of people the user has an existing DM thread with, most recent first,
// each with a preview of the last message.
app.get("/api/dm/conversations", authMiddleware, (req, res) => {
  const me = req.username;
  const threads = [];

  for (const room of Object.keys(chatHistory)) {
    const other = dmOtherParticipant(room, me);
    if (!other || !users[other]) continue;

    const history = chatHistory[room] || [];
    const last = history[history.length - 1] || null;

    threads.push({
      username: other,
      name: users[other].name || other,
      avatar: users[other].avatar || null,
      lastMessage: last
        ? { text: last.text || "", attachment: !!last.attachment, timestamp: last.timestamp }
        : null
    });
  }

  threads.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
  res.json(threads);
});

// Full directory for "start a new chat" pickers (everyone except yourself).
app.get("/api/dm/directory", authMiddleware, (req, res) => {
  const me = req.user;
  const canSeeAll = isAdmin(me) || isHos(me) || me.role === "hor";

  const list = Object.entries(users)
    .filter(([username, u]) => {
      if (username === req.username) return false;
      if (canSeeAll) return true;
      // HOS and HOR are visible to everyone (like Eline for sales)
      if (u.role === "hos" || u.role === "hor") return true;
      // Everyone else only sees people on their own team
      return u.team && u.team === me.team;
    })
    .map(([username, u]) => ({
      username,
      name: u.name || username,
      team: u.team || null,
      role: u.role || "agent",
      avatar: u.avatar || null
    }));
  res.json(list);
});

// Resolves (and implicitly "creates") the DM room id for chatting with
// :username. No record is written until the first message is sent.
app.get("/api/dm/room/:username", authMiddleware, (req, res) => {
  const target = req.params.username;
  if (target === req.username) {
    return res.status(400).json({ error: "Cannot start a chat with yourself" });
  }
  if (!users[target]) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    room: dmRoomId(req.username, target),
    user: { username: target, name: users[target].name || target, avatar: users[target].avatar || null }
  });
});

/* =========================
   ROUTES - CRM
========================= */

app.get("/api/crm/users", authMiddleware, (req, res) => {
  const me = req.user;
  const canSeeAll = isAdmin(me) || isHos(me) || me.role === "hor";

  const list = Object.entries(users)
    .filter(([, u]) => {
      if (canSeeAll) return true;
      if (u.role === "hos" || u.role === "hor") return true;
      return u.team && u.team === me.team;
    })
    .map(([username, u]) => ({
      username,
      name: u.name,
      team: u.team,
      department: u.department || null,
      role: u.role,
      manager: u.manager || null,
      avatar: u.avatar || null
    }));
  res.json(list);
});

// Builds the full HOS -> TL -> Agents org chart for the CRM view.
// Agents are grouped under their direct TL (matched by `manager` name);
// TLs are grouped under department + team; the HOS sits at the top.
app.get("/api/crm/structure", authMiddleware, (req, res) => {
  const entries = Object.entries(users).map(([username, u]) => ({
    username,
    name: u.name || username,
    role: u.role || "agent",
    department: u.department || null,
    team: u.team || null,
    manager: u.manager || null,
    avatar: u.avatar || null
  }));

  const hos = entries.find((u) => u.role === "hos") || null;
  const horList = entries.filter((u) => u.role === "hor");
  let teamLeaders = entries.filter((u) => u.role === "tl_sales" || u.role === "tl_retention");
  let agents = entries.filter((u) => u.role === "sales" || u.role === "retention");

  // Visibility: HOS/admin see the whole org chart. Everyone else (TL or
  // agent) only sees their own team — i.e. the TLs and agents that share
  // their `team` code — plus the HOS card, which is always shown on top.
  const canSeeEverything = isAdmin(req.user) || isHos(req.user) || req.user.role === "hor";
  if (!canSeeEverything) {
    const myTeam = req.user.team || null;
    teamLeaders = teamLeaders.filter((u) => u.team === myTeam);
    agents = agents.filter((u) => u.team === myTeam);
  }

  // teamKey -> { department, team, kind: "sales"|"retention", leads: [], members: [] }
  const teamMap = new Map();

  function teamKey(department, team) {
    return `${department || "UNASSIGNED"}::${team || "UNASSIGNED"}`;
  }

  for (const tl of teamLeaders) {
    const key = teamKey(tl.department, tl.team);
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        department: tl.department,
        team: tl.team,
        kind: tl.role === "tl_sales" ? "sales" : "retention",
        leads: [],
        members: []
      });
    }
    teamMap.get(key).leads.push({
      username: tl.username,
      name: tl.name,
      role: tl.role,
      manager: tl.manager,
      avatar: tl.avatar
    });
  }

  for (const agent of agents) {
    const key = teamKey(agent.department, agent.team);
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        department: agent.department,
        team: agent.team,
        kind: agent.role === "sales" ? "sales" : "retention",
        leads: [],
        members: []
      });
    }
    teamMap.get(key).members.push({
      username: agent.username,
      name: agent.name,
      role: agent.role,
      manager: agent.manager,
      avatar: agent.avatar
    });
  }

  // Group teams by department for a friendlier tree shape.
  const departmentsMap = new Map();
  for (const entry of teamMap.values()) {
    const dept = entry.department || "UNASSIGNED";
    if (!departmentsMap.has(dept)) departmentsMap.set(dept, []);
    departmentsMap.get(dept).push(entry);
  }

  const departments = Array.from(departmentsMap.entries()).map(([department, teams]) => ({
    department,
    teams
  }));

  res.json({
    hos: hos
      ? { username: hos.username, name: hos.name, role: hos.role, avatar: hos.avatar }
      : null,
    hor: horList.map((u) => ({ username: u.username, name: u.name, role: u.role, avatar: u.avatar })),
    departments
  });
});

/* =========================
   ROUTES - TICKETS
========================= */

const TICKET_TYPES = TICKET_TYPE_VALUES;
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const TICKET_DESC_MIN = 10;
const TICKET_DESC_MAX = 5000;
const TICKET_ATTACHMENT_EXT = /\.(jpe?g|png|webp|pdf|docx?)$/i;
const MAX_TICKET_ATTACHMENTS = 5;

// Returns the department -> problem-type taxonomy, so the ticket form and
// filter dropdown can group options without hardcoding them in the HTML.
app.get("/api/tickets/types", authMiddleware, (req, res) => {
  res.json(TICKET_DEPARTMENTS.map((d) => ({ key: d.key, label: d.label, types: d.types })));
});

const ticketAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TICKET_ATTACHMENTS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const uploadTicketAttachments = multer({
  storage: ticketAttachmentStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: MAX_TICKET_ATTACHMENTS }, // 20MB per file
  fileFilter: (req, file, cb) => {
    cb(null, TICKET_ATTACHMENT_EXT.test(file.originalname));
  }
});

// Mirrors the eligibility rules used by /api/tickets/assignable-users.
function isAssignmentAllowed(actor, actorUsername, assigneeUsername) {
  if (isAdmin(actor) || isHos(actor)) return true;

  const assignee = users[assigneeUsername];
  if (!assignee) return false;

  if (isTeamLeader(actor)) {
    if (assignee.manager === actor.name) return true; // direct agent
    if (assignee.role === "hos") return true; // escalate to HOS
    return false;
  }

  // Sales / retention agent: can only route to their own direct TL.
  return assignee.name === actor.manager;
}

function nextTicketId() {
  const maxId = tickets.reduce((max, t) => {
    const n = parseInt(String(t.id).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `TCK-${String(maxId + 1).padStart(4, "0")}`;
}

// A ticket is visible to:
//  - its creator or its assignee
//  - the HOS (sees everything)
//  - the TL who is the direct manager of the ticket's creator
//  - an admin (legacy role, sees everything)
function canViewTicket(ticket, viewerUsername, viewer) {
  if (isAdmin(viewer)) return true;
  if (isHos(viewer)) return true;
  if (ticket.created_by === viewerUsername) return true;
  if (ticket.assigned_to === viewerUsername) return true;

  if (isTeamLeader(viewer)) {
    const creator = users[ticket.created_by];
    if (creator && isDirectManagerOf(viewer, creator)) return true;
  }

  return false;
}

// Only the assignee, the HOS, the ticket creator's direct TL, or an admin
// may change a ticket's status.
function canChangeStatus(ticket, actorUsername, actor) {
  if (isAdmin(actor)) return true;
  if (isHos(actor)) return true;
  if (ticket.assigned_to === actorUsername) return true;

  if (isTeamLeader(actor)) {
    const creator = users[ticket.created_by];
    if (creator && isDirectManagerOf(actor, creator)) return true;
  }

  return false;
}

app.get("/api/tickets", authMiddleware, (req, res) => {
  const visible = tickets.filter((t) => canViewTicket(t, req.username, req.user));
  // Most recent first.
  const sorted = [...visible].sort((a, b) => b.created_at - a.created_at);
  res.json(sorted);
});

// Users assignable to a ticket by the current user:
//  - HOS: anyone in the company
//  - TL: their direct agents, plus the HOS
//  - Agent: their own direct TL
// Registered before the "/api/tickets/:id" route below so it isn't swallowed by it.
app.get("/api/tickets/assignable-users", authMiddleware, (req, res) => {
  const me = req.user;
  let list = [];

  if (isAdmin(me) || isHos(me)) {
    list = Object.entries(users)
      .filter(([username]) => username !== req.username)
      .map(([username, u]) => ({ username, name: u.name || username, avatar: u.avatar || null }));
  } else if (isTeamLeader(me)) {
    const directAgents = Object.entries(users).filter(
      ([username, u]) => username !== req.username && u.manager === me.name
    );
    const hosEntry = Object.entries(users).find(([, u]) => u.role === "hos");
    list = [...directAgents, ...(hosEntry ? [hosEntry] : [])].map(([username, u]) => ({
      username,
      name: u.name || username,
      avatar: u.avatar || null
    }));
  } else {
    // Sales / retention agent: can only route to their own TL.
    const tlEntry = Object.entries(users).find(([, u]) => u.name === me.manager);
    list = tlEntry
      ? [{ username: tlEntry[0], name: tlEntry[1].name || tlEntry[0], avatar: tlEntry[1].avatar || null }]
      : [];
  }

  res.json(list);
});

app.get("/api/tickets/:id", authMiddleware, (req, res) => {
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (!canViewTicket(ticket, req.username, req.user)) {
    return res.status(403).json({ error: "Not allowed to view this ticket" });
  }
  res.json(ticket);
});

app.post("/api/tickets", authMiddleware, (req, res) => {
  uploadTicketAttachments.array("attachments", MAX_TICKET_ATTACHMENTS)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }

    const { type, description, assigned_to } = req.body || {};

    if (!TICKET_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid ticket type" });
    }

    const desc = String(description || "").trim();
    if (desc.length < TICKET_DESC_MIN) {
      return res.status(400).json({ error: `Description must be at least ${TICKET_DESC_MIN} characters` });
    }
    if (desc.length > TICKET_DESC_MAX) {
      return res.status(400).json({ error: `Description must be under ${TICKET_DESC_MAX} characters` });
    }

    if (!assigned_to || !users[assigned_to]) {
      return res.status(400).json({ error: "Assignee not found" });
    }

    // Can only assign to someone returned by /api/tickets/assignable-users
    // for this user's role (HOS: anyone; TL: their direct agents + HOS;
    // agent: their own direct TL).
    if (!isAssignmentAllowed(req.user, req.username, assigned_to)) {
      return res.status(403).json({ error: "Not allowed to assign a ticket to this person" });
    }

    const attachments = (req.files || []).map((f) => ({
      url: `/uploads/tickets/${f.filename}`,
      name: f.originalname,
      mime: f.mimetype,
      size: f.size
    }));

    const ticket = {
      id: nextTicketId(),
      created_by: req.username,
      assigned_to,
      team: req.user.team,
      type,
      description: desc,
      attachments,
      status: "open",
      created_at: Date.now(),
      updated_at: Date.now(),
      history: [
        { action: "created", by: req.username, at: Date.now() }
      ]
    };

    tickets.push(ticket);
    persistTickets();

    telegramBot.notifyNewTicket(ticket);

    res.json({ ok: true, ticket });
  });
});

app.patch("/api/tickets/:id/status", authMiddleware, (req, res) => {
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  if (!canChangeStatus(ticket, req.username, req.user)) {
    return res.status(403).json({ error: "Not allowed to change this ticket's status" });
  }

  const { status } = req.body || {};
  if (!TICKET_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  ticket.status = status;
  ticket.updated_at = Date.now();
  ticket.history.push({ action: "status_changed", to: status, by: req.username, at: Date.now() });

  persistTickets();
  res.json({ ok: true, ticket });
});

/* =========================
   FILE / PHOTO UPLOADS (chat attachments)
========================= */

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|txt|zip|csv|webm|ogg|mp4|m4a|wav)$/i;

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_EXT.test(file.originalname));
  }
});

app.post("/api/upload", authMiddleware, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "File type not allowed" });
    }

    res.json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size
    });
  });
});

/* =========================
   AVATAR UPLOADS (profile photo)
========================= */

const ALLOWED_AVATAR_EXT = /\.(jpe?g|png|gif|webp)$/i;

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    // Filename is tied to the logged-in user, so re-uploading overwrites the old one.
    const username = req.username || "unknown";
    const unique = `${username}-${Date.now()}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_AVATAR_EXT.test(file.originalname));
  }
});

app.post("/api/avatar", authMiddleware, (req, res) => {
  uploadAvatar.single("avatar")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Image type not allowed" });
    }

    const oldAvatar = users[req.username].avatar;
    const newAvatarUrl = `/uploads/avatars/${req.file.filename}`;

    users[req.username].avatar = newAvatarUrl;
    persistUsers();

    // Best-effort cleanup of the previous avatar file.
    if (oldAvatar && oldAvatar.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(PUBLIC_DIR, oldAvatar);
      fs.unlink(oldPath, () => {});
    }

    res.json({ ok: true, avatar: newAvatarUrl });
  });
});

/* =========================
   PRESENCE / ONLINE STATUS
   presenceMap[username] = {
     status: 'online'|'offline'|'lunch'|'break',
     since: timestamp,
     breakLog: [{ type, start, end|null, extraMinutes }]
     -- extraMinutes = added time granted by "add more" button
   }
========================= */

const VALID_AGENT_STATUSES = ['online', 'offline', 'lunch', 'break'];
const presenceMap = {}; // in-memory, resets on server restart

// Returns public-safe presence snapshot for a user
function getPresence(username) {
  const p = presenceMap[username];
  if (!p) return { status: 'offline', since: null, breakLog: [] };
  return p;
}

// Called when a socket connects/heartbeats to mark user online
function markOnline(username) {
  const current = presenceMap[username];
  if (!current || current.status === 'offline') {
    // Preserve breakLog so daily limits survive reconnects/page refreshes
    presenceMap[username] = { status: 'online', since: Date.now(), breakLog: (current && current.breakLog) || [] };
    broadcastPresence(username);
  }
}

// Called when socket disconnects
function markOffline(username) {
  const current = presenceMap[username];
  if (current && current.status !== 'offline') {
    // Preserve breakLog so daily limits survive disconnects
    presenceMap[username] = { status: 'offline', since: Date.now(), breakLog: current.breakLog || [] };
    broadcastPresence(username);
  }
}

function broadcastPresence(username) {
  io.emit('presenceUpdate', {
    username,
    ...getPresence(username)
  });
}

// Daily break/lunch limits per agent
const DAILY_BREAK_LIMIT = 3;   // max 3 breaks per day
const DAILY_LUNCH_LIMIT = 1;   // max 1 lunch per day
const LUNCH_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown after 2+ breaks

// Returns stats for today's entries + any active cooldown info
function getDailyBreakStats(breakLog) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();
  const now = Date.now();

  let breakCount = 0;
  let lunchCount = 0;
  let lastBreakEndTs = null; // when did the most recent break end (or start if still active)

  for (const entry of (breakLog || [])) {
    if (entry.start < todayTs) continue;
    if (entry.type === 'break') {
      breakCount++;
      const endTs = entry.end || entry.start; // if active, use start as conservative anchor
      if (lastBreakEndTs === null || endTs > lastBreakEndTs) lastBreakEndTs = endTs;
    } else if (entry.type === 'lunch') {
      lunchCount++;
    }
  }

  // Lunch cooldown: if agent has taken 2+ breaks, lunch blocked for 30 min after last break
  let lunchCooldownUntil = null;
  if (breakCount >= 2 && lunchCount === 0 && lastBreakEndTs !== null) {
    const cooldownEnd = lastBreakEndTs + LUNCH_COOLDOWN_MS;
    if (cooldownEnd > now) lunchCooldownUntil = cooldownEnd;
  }

  // If lunch taken, only 1 break allowed total
  const breakLimit = lunchCount > 0 ? 1 : DAILY_BREAK_LIMIT;

  return { breakCount, lunchCount, lunchCooldownUntil, breakLimit };
}

// Kept for backward compat
function getDailyBreakCounts(breakLog) {
  const s = getDailyBreakStats(breakLog);
  return { breakCount: s.breakCount, lunchCount: s.lunchCount };
}

// REST endpoint to change own status
app.post('/api/presence/status', authMiddleware, (req, res) => {
  const { status, extraMinutes } = req.body || {};
  if (!VALID_AGENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const username = req.username;
  const current = presenceMap[username] || { status: 'offline', since: Date.now(), breakLog: [] };
  const now = Date.now();

  // Enforce daily limits before starting a new break/lunch
  if (status === 'break' || status === 'lunch') {
    const { breakCount, lunchCount, lunchCooldownUntil, breakLimit } = getDailyBreakStats(current.breakLog);

    if (status === 'break' && breakCount >= breakLimit) {
      const reason = lunchCount > 0
        ? 'После ланча доступен только 1 брейк'
        : `Лимит брейков исчерпан — максимум ${DAILY_BREAK_LIMIT} брейка в день`;
      return res.status(400).json({ error: reason, code: 'BREAK_LIMIT_REACHED', used: breakCount, limit: breakLimit });
    }

    if (status === 'lunch') {
      if (lunchCount >= DAILY_LUNCH_LIMIT) {
        return res.status(400).json({
          error: 'Лимит ланча исчерпан — максимум 1 ланч в день',
          code: 'LUNCH_LIMIT_REACHED', used: lunchCount, limit: DAILY_LUNCH_LIMIT
        });
      }
      if (lunchCooldownUntil) {
        const minsLeft = Math.ceil((lunchCooldownUntil - Date.now()) / 60000);
        return res.status(400).json({
          error: `Ланч недоступен — подожди ещё ${minsLeft} мин после 2 брейков`,
          code: 'LUNCH_COOLDOWN', cooldownUntil: lunchCooldownUntil
        });
      }
    }
  }

  // Close previous break/lunch entry if any
  if ((current.status === 'lunch' || current.status === 'break') && current.breakLog) {
    const lastEntry = current.breakLog[current.breakLog.length - 1];
    if (lastEntry && !lastEntry.end) {
      lastEntry.end = now;
    }
  }

  const newPresence = {
    status,
    since: now,
    breakLog: current.breakLog || []
  };

  // Start new break/lunch entry
  if (status === 'lunch' || status === 'break') {
    const defaultMinutes = status === 'lunch' ? 45 : 15;
    newPresence.breakLog.push({
      type: status,
      start: now,
      end: null,
      allocatedMinutes: defaultMinutes + (extraMinutes || 0)
    });
  }

  presenceMap[username] = newPresence;
  broadcastPresence(username);
  res.json({ ok: true, presence: getPresence(username) });
});

// Add extra time to current lunch/break
app.post('/api/presence/extend', authMiddleware, (req, res) => {
  const { minutes } = req.body || {};
  const mins = parseInt(minutes, 10);
  if (!mins || mins < 1 || mins > 120) {
    return res.status(400).json({ error: 'Invalid minutes' });
  }

  const username = req.username;
  const current = presenceMap[username];
  if (!current || (current.status !== 'lunch' && current.status !== 'break')) {
    return res.status(400).json({ error: 'Not currently on lunch or break' });
  }

  const lastEntry = current.breakLog[current.breakLog.length - 1];
  if (lastEntry && !lastEntry.end) {
    lastEntry.allocatedMinutes += mins;
  }

  broadcastPresence(username);
  res.json({ ok: true, presence: getPresence(username) });
});

// Get all presence statuses (for admin/dashboard views)
app.get('/api/presence', authMiddleware, (req, res) => {
  const result = {};
  for (const username of Object.keys(users)) {
    result[username] = getPresence(username);
  }
  res.json(result);
});

// Get remaining break/lunch allowance for current user today
app.get('/api/presence/limits', authMiddleware, (req, res) => {
  const current = presenceMap[req.username];
  const { breakCount, lunchCount, lunchCooldownUntil, breakLimit } = getDailyBreakStats(current?.breakLog);
  res.json({
    break: { used: breakCount, limit: breakLimit, remaining: Math.max(0, breakLimit - breakCount) },
    lunch: {
      used: lunchCount,
      limit: DAILY_LUNCH_LIMIT,
      remaining: Math.max(0, DAILY_LUNCH_LIMIT - lunchCount),
      cooldownUntil: lunchCooldownUntil || null
    }
  });
});


/* =========================
   SOCKET.IO CHAT
========================= */

function pushHistory(room, msg) {
  if (!chatHistory[room]) chatHistory[room] = [];
  chatHistory[room].push(msg);

  if (chatHistory[room].length > MAX_HISTORY_PER_ROOM) {
    chatHistory[room] = chatHistory[room].slice(-MAX_HISTORY_PER_ROOM);
  }

  persistHistory();
}

// Parses the sessionId cookie out of a socket's handshake headers so we know
// which logged-in user owns this connection (needed to authorize DM rooms).
function getSocketUsername(socket) {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)sessionId=([^;]+)/);
  if (!match) return null;
  const sessionId = decodeURIComponent(match[1]);
  const session = sessions[sessionId];
  if (!session || !users[session.username]) return null;
  return session.username;
}

// Track how many open sockets each user has (for multi-tab support)
const socketUserMap = new Map(); // socketId -> username
const userSocketCount = new Map(); // username -> count

io.on("connection", (socket) => {
  const socketUsername = getSocketUsername(socket);

  // Mark user online when socket connects
  if (socketUsername) {
    socketUserMap.set(socket.id, socketUsername);
    userSocketCount.set(socketUsername, (userSocketCount.get(socketUsername) || 0) + 1);
    markOnline(socketUsername);
  }

  // Heartbeat — client pings every 30s to stay "online"
  socket.on("heartbeat", () => {
    if (socketUsername) {
      const p = presenceMap[socketUsername];
      // Only refresh if currently online (not lunch/break)
      if (!p || p.status === 'offline') {
        markOnline(socketUsername);
      }
    }
  });

  socket.on("disconnect", () => {
    if (socketUsername) {
      const count = (userSocketCount.get(socketUsername) || 1) - 1;
      if (count <= 0) {
        userSocketCount.delete(socketUsername);
        socketUserMap.delete(socket.id);
        markOffline(socketUsername);
      } else {
        userSocketCount.set(socketUsername, count);
        socketUserMap.delete(socket.id);
      }
    }
  });

  socket.on("join", (room) => {
    if (!room) return;
    // DM rooms are private: only the two participants may join.
    if (room.startsWith(DM_ROOM_PREFIX)) {
      const other = dmOtherParticipant(room, socketUsername);
      if (!other) return; // not logged in, or not a participant of this DM
    }
    socket.join(room);
  });

  socket.on("getHistory", (room) => {
    if (room && room.startsWith(DM_ROOM_PREFIX) && !dmOtherParticipant(room, socketUsername)) {
      return; // not authorized for this DM thread
    }
    socket.emit("history", chatHistory[room] || []);
  });

  socket.on("msg", (data) => {
    if (!data || !data.room || !data.user) return;
    if (!data.text && !data.attachment) return;

    if (data.room.startsWith(DM_ROOM_PREFIX) && !dmOtherParticipant(data.room, socketUsername)) {
      return; // not authorized to post into this DM thread
    }

    // Look up the sender's current avatar by matching display name.
    // (Sockets aren't tied to an authenticated session in this app, so this
    // is best-effort and mirrors how the rest of the app already trusts
    // the client-supplied display name.)
    const matchedUser = Object.values(users).find((u) => u.name === data.user);

    const msg = {
      id: makeId(),
      user: data.user,
      userAvatar: matchedUser ? matchedUser.avatar || null : null,
      text: data.text ? String(data.text).slice(0, 2000) : "",
      attachment: data.attachment && data.attachment.url
        ? {
            url: String(data.attachment.url),
            name: String(data.attachment.name || "file"),
            mime: String(data.attachment.mime || "")
          }
        : null,
      replyTo: sanitizeReplyTo(data.replyTo),
      forwardedFrom: data.forwardedFrom ? String(data.forwardedFrom).slice(0, 120) : null,
      timestamp: Date.now()
    };

    pushHistory(data.room, msg);
    // Include `room` so clients can gate live rendering to the open thread.
    io.to(data.room).emit("msg", { ...msg, room: data.room });
  });
});

/* =========================
   DELETE CHAT MESSAGE
========================= */

// Each message gets a unique id so it can be targeted for deletion.
// Messages already in history won't have one — we only need ids for new messages.
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Normalises a client-supplied "reply to" reference into a small, safe quote
// preview that travels with the message (id + author + short text snippet).
function sanitizeReplyTo(replyTo) {
  if (!replyTo || typeof replyTo !== 'object' || !replyTo.id) return null;
  return {
    id: String(replyTo.id),
    user: replyTo.user ? String(replyTo.user).slice(0, 120) : '',
    text: replyTo.text ? String(replyTo.text).slice(0, 160) : ''
  };
}

// REST: POST /api/chat/message/edit  { room, msgId, text }
// Telegram-style: only the author can edit their own message text.
app.post('/api/chat/message/edit', authMiddleware, (req, res) => {
  const { room, msgId, text } = req.body || {};
  if (!room || !msgId || typeof text !== 'string') {
    return res.status(400).json({ error: 'room, msgId and text required' });
  }
  const trimmed = text.trim();
  if (!trimmed) return res.status(400).json({ error: 'Текст не может быть пустым' });

  if (room.startsWith(DM_ROOM_PREFIX) && !dmOtherParticipant(room, req.username)) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  const history = chatHistory[room];
  if (!history) return res.status(404).json({ error: 'Room not found' });

  const msg = history.find((m) => m.id === msgId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  const requester = users[req.username];
  if (msg.user !== requester?.name) {
    return res.status(403).json({ error: 'Можно редактировать только свои сообщения' });
  }

  msg.text = trimmed.slice(0, 2000);
  msg.edited = true;
  msg.editedAt = Date.now();
  persistHistory();

  io.to(room).emit('msgEdited', { room, msgId, text: msg.text, edited: true });
  res.json({ ok: true });
});

// REST: DELETE /api/chat/message  { room, msgId }
// Admins/HOS can delete any message; others can only delete their own.
app.delete('/api/chat/message', authMiddleware, (req, res) => {
  const { room, msgId } = req.body || {};
  if (!room || !msgId) return res.status(400).json({ error: 'room and msgId required' });

  const history = chatHistory[room];
  if (!history) return res.status(404).json({ error: 'Room not found' });

  const idx = history.findIndex(m => m.id === msgId);
  if (idx === -1) return res.status(404).json({ error: 'Message not found' });

  const msg = history[idx];
  const requester = users[req.username];
  const isAdmin = requester && (requester.role === 'admin' || requester.role === 'hos');
  const isOwn = msg.user === requester?.name;

  if (!isAdmin && !isOwn) {
    return res.status(403).json({ error: 'Нет прав удалять чужие сообщения' });
  }

  history.splice(idx, 1);
  persistHistory();

  // Broadcast deletion to everyone in the room
  io.to(room).emit('msgDeleted', { room, msgId });

  res.json({ ok: true });
});

/* =========================
   START SERVER
========================= */

server.listen(PORT, HOST, () => {
  console.log(`Safari Office running on http://localhost:${PORT}`);
});
