/* =========================
   TELEGRAM BOT INTEGRATION
   ---------------------------------------------------------
   Sends a notification whenever a new ticket is created, with inline
   buttons to change its status directly from Telegram (Open / In
   progress / Resolved / Closed).

   Pressing a button calls back into server.js's ticket-status logic
   (the same function used by PATCH /api/tickets/:id/status), so the
   change is fully reflected everywhere in the web app too.

   ROUTING: tickets are routed to a Telegram chat based on their type, via
   the department taxonomy in ticket-types.js (TYPE_TO_ROLE). IT problems
   -> the Head IT (admin) chat, Telephony problems -> the telephony chat(s),
   CRM problems -> the CRM chat. A role's chat id config can be a single id or a comma-separated list
   (TELEGRAM_CHAT_ID_TELEPHONY=id1,id2) — every chat in the list gets its
   own copy of the notification, all of them can change the ticket's
   status, and all of them stay in sync with each other. If a role-specific
   chat id isn't configured, tickets that would go there fall back to the
   admin chat instead of getting lost.

   /tickets in any configured chat shows only the ticket types routed
   to that chat (the admin's chat shows everything).

   Config comes from environment variables (see .env.example):
     TELEGRAM_BOT_TOKEN          - token from @BotFather
     TELEGRAM_CHAT_ID            - admin chat id (default recipient, sees everything)
     TELEGRAM_CHAT_ID_CRM        - CRM manager's chat id (optional, for now)
     TELEGRAM_CHAT_ID_TELEPHONY  - telephony operator's chat id (optional, for now)
     TELEGRAM_IT_AGENTS          - optional, "chatId:Name,chatId:Name,..." list of
                                    IT agents the admin (Head IT) can delegate to.
                                    Falls back to a built-in default list if unset.

   IT DELEGATION ("Head IT" forwarding):
   The admin chat is the "Head IT" — every IT-department ticket (anything
   under the "IT" group in ticket-types.js, e.g. RDP Logout / RDP Lagging)
   lands there with an extra "↗️ Переадресовать" button.
   Tapping it shows a menu of IT agents (TELEGRAM_IT_AGENTS); picking one
   forwards a fresh status-card to that agent's own chat. Forwarding never
   removes the ticket from Head IT's view — /tickets still shows every IT
   ticket regardless of whether it's been forwarded — and a status change
   made anywhere (Head IT's card, the agent's card, or the ticket list)
   updates every place that ticket is currently displayed. CRM/Telephony
   tickets are untouched by any of this: they still go straight to their
   own chat with no forward option.
========================= */

const TelegramBot = require("node-telegram-bot-api");
const { TYPE_TO_ROLE } = require("./ticket-types");

const ROLE_LABELS = {
  admin: "Админ",
  crm: "CRM-менеджер",
  telephony: "Телефонист"
};

// IT agents Head IT can delegate (forward) tickets to. Format in env:
// "chatId:Name,chatId:Name,...". Falls back to a built-in default list
// (the three agents originally given) if the env var isn't set.
function parseItAgents(envVal) {
  const fallback = [
    { chatId: "8744525004", name: "Максим" },
    { chatId: "8278155866", name: "Валера" },
    { chatId: "7634651623", name: "Саша" }
  ];
  if (!envVal) return fallback;
  const parsed = envVal
    .split(",")
    .map((pair) => {
      const [chatId, ...nameParts] = pair.split(":");
      const id = (chatId || "").trim();
      const name = nameParts.join(":").trim();
      return id ? { chatId: id, name: name || id } : null;
    })
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}

const IT_AGENTS = parseItAgents(process.env.TELEGRAM_IT_AGENTS);

const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
const PAGE_SIZE = 5;

const STATUS_LABELS = {
  open: "🆕 Open",
  in_progress: "🔧 In progress",
  resolved: "✅ Resolved",
  closed: "🔒 Closed"
};

const STATUS_BUTTON_LABELS = {
  open: "🆕 Open",
  in_progress: "🔧 В работе",
  resolved: "✅ Решён",
  closed: "🔒 Закрыт"
};

// Short codes used inside callback_data to keep it under Telegram's 64-byte limit.
const STATUS_FILTER_CODES = { all: "a", open: "o", in_progress: "p", resolved: "r", closed: "c" };
const CODE_TO_STATUS_FILTER = Object.fromEntries(
  Object.entries(STATUS_FILTER_CODES).map(([k, v]) => [v, k])
);

const FILTER_LABELS = {
  all: "Все",
  open: "🆕 Open",
  in_progress: "🔧 В работе",
  resolved: "✅ Решён",
  closed: "🔒 Закрыт"
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildStatusKeyboardRows(ticketId, currentStatus) {
  // One button per status; the current status is marked, the rest are
  // clickable actions ("callback_data" encodes ticket id + target status).
  const row = TICKET_STATUSES.map((status) => {
    const label = status === currentStatus
      ? `• ${STATUS_BUTTON_LABELS[status]} •`
      : STATUS_BUTTON_LABELS[status];
    return { text: label, callback_data: `ticket:${ticketId}:${status}` };
  });

  // Telegram inline keyboards look better split across two rows of two.
  return [
    [row[0], row[1]],
    [row[2], row[3]]
  ];
}

function buildKeyboard(ticketId, currentStatus, { forwardable = false } = {}) {
  const rows = buildStatusKeyboardRows(ticketId, currentStatus);
  if (forwardable) {
    rows.push([{ text: "↗️ Переадресовать", callback_data: `fwdmenu:${ticketId}` }]);
  }
  return { inline_keyboard: rows };
}

// Keyboard for a ticket card opened from the list: status buttons + a way back.
function buildTicketCardKeyboard(ticketId, currentStatus, filter, page, { forwardable = false } = {}) {
  const rows = buildStatusKeyboardRows(ticketId, currentStatus);
  if (forwardable) {
    rows.push([{ text: "↗️ Переадресовать", callback_data: `fwdmenu:${ticketId}` }]);
  }
  rows.push([{ text: "← Назад к списку", callback_data: `lst:${STATUS_FILTER_CODES[filter]}:${page}` }]);
  return { inline_keyboard: rows };
}

// Shown when Head IT taps "Переадресовать": one button per configured IT
// agent, plus a way to back out without forwarding anything.
function buildForwardMenuKeyboard(ticketId) {
  const rows = IT_AGENTS.map((agent, idx) => [
    { text: agent.name, callback_data: `fwd:${ticketId}:${idx}` }
  ]);
  rows.push([{ text: "← Отмена", callback_data: `fwdcancel:${ticketId}` }]);
  return { inline_keyboard: rows };
}

function buildMessageText(ticket, userDisplayName, forwardedAgentName) {
  const lines = [
    `🎫 <b>Новый тикет ${escapeHtml(ticket.id)}</b>`,
    `Статус: <b>${STATUS_LABELS[ticket.status] || ticket.status}</b>`,
    `Тип: ${escapeHtml(ticket.type)}`,
    `От: ${escapeHtml(userDisplayName || ticket.created_by)}`
  ];
  if (ticket.team) lines.push(`Команда: ${escapeHtml(ticket.team)}`);
  if (forwardedAgentName) lines.push(`↗️ Переадресован: ${escapeHtml(forwardedAgentName)}`);
  lines.push("", escapeHtml(ticket.description));
  return lines.join("\n");
}

// Full ticket card text, used both for new-ticket notifications and when
// opening a ticket from the list. Includes assignee + last update, which
// the original "new ticket" message didn't need.
function buildTicketCardText(ticket, users, forwardedAgentName) {
  const creator = users[ticket.created_by];
  const assignee = users[ticket.assigned_to];

  const lines = [
    `🎫 <b>Тикет ${escapeHtml(ticket.id)}</b>`,
    `Статус: <b>${STATUS_LABELS[ticket.status] || ticket.status}</b>`,
    `Тип: ${escapeHtml(ticket.type)}`,
    `От: ${escapeHtml(creator ? creator.name : ticket.created_by)}`,
    `Кому: ${escapeHtml(assignee ? assignee.name : ticket.assigned_to)}`
  ];
  if (ticket.team) lines.push(`Команда: ${escapeHtml(ticket.team)}`);
  if (forwardedAgentName) lines.push(`↗️ Переадресован: ${escapeHtml(forwardedAgentName)}`);
  lines.push(`Создан: ${formatDate(ticket.created_at)}`);
  if (ticket.updated_at && ticket.updated_at !== ticket.created_at) {
    lines.push(`Обновлён: ${formatDate(ticket.updated_at)}`);
  }
  lines.push("", escapeHtml(ticket.description));
  if (ticket.attachments && ticket.attachments.length) {
    lines.push("", `📎 Вложений: ${ticket.attachments.length}`);
  }
  return lines.join("\n");
}

// Card sent to an IT agent's own chat after Head IT forwards a ticket to
// them. Same info as the full card, with a header noting it was forwarded.
function buildAgentCardText(ticket, users) {
  return `↗️ <b>Тикет переадресован вам Head IT</b>\n\n${buildTicketCardText(ticket, users)}`;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function statusEmoji(status) {
  return (STATUS_LABELS[status] || status).split(" ")[0];
}

function truncate(str, max) {
  const s = String(str || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* =========================
   TICKET LIST (filter + pagination)
========================= */

function filterTickets(tickets, filter) {
  const sorted = [...tickets].sort((a, b) => b.created_at - a.created_at);
  if (filter === "all") return sorted;
  return sorted.filter((t) => t.status === filter);
}

function buildListText(filter, page, totalPages, totalCount) {
  const lines = [
    `📋 <b>Тикеты</b> — фильтр: ${FILTER_LABELS[filter]}`,
    `Всего: ${totalCount}${totalPages > 1 ? ` · стр. ${page + 1}/${totalPages}` : ""}`
  ];
  return lines.join("\n");
}

function buildListKeyboard(tickets, filter, page) {
  const filtered = filterTickets(tickets, filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(0, page), totalPages - 1);
  const pageItems = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const rows = [];

  // Filter row: tap to switch filter, always resets to page 0.
  rows.push(
    Object.keys(FILTER_LABELS).map((f) => ({
      text: f === filter ? `• ${FILTER_LABELS[f]} •` : FILTER_LABELS[f],
      callback_data: `lst:${STATUS_FILTER_CODES[f]}:0`
    }))
  );

  // One row per ticket.
  for (const t of pageItems) {
    const label = `${statusEmoji(t.status)} ${t.id} — ${truncate(t.description, 30)}`;
    rows.push([{ text: label, callback_data: `view:${t.id}:${STATUS_FILTER_CODES[filter]}:${clampedPage}` }]);
  }

  if (pageItems.length === 0) {
    rows.push([{ text: "Тикетов нет", callback_data: "noop" }]);
  }

  // Pagination row (only if more than one page).
  if (totalPages > 1) {
    const navRow = [];
    if (clampedPage > 0) {
      navRow.push({ text: "◀ Назад", callback_data: `lst:${STATUS_FILTER_CODES[filter]}:${clampedPage - 1}` });
    }
    navRow.push({ text: `${clampedPage + 1}/${totalPages}`, callback_data: "noop" });
    if (clampedPage < totalPages - 1) {
      navRow.push({ text: "Вперёд ▶", callback_data: `lst:${STATUS_FILTER_CODES[filter]}:${clampedPage + 1}` });
    }
    rows.push(navRow);
  }

  return { inline_keyboard: rows, _clampedPage: clampedPage, _totalPages: totalPages, _totalCount: filtered.length };
}

/**
 * Sets up the bot and wires it to the ticket store.
 *
 * @param {object} opts
 * @param {object} opts.tickets - the in-memory tickets array (same reference server.js uses)
 * @param {function} opts.persistTickets - call after mutating a ticket, to save to disk
 * @param {object} opts.users - in-memory users map, used to resolve display names
 * @param {string} opts.actingUsername - username recorded as the actor for status changes made via Telegram
 * @returns {{ notifyNewTicket: function }}
 */
function setupTelegramBot({ tickets, persistTickets, users, actingUsername }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !adminChatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — Telegram notifications are disabled."
    );
    return { notifyNewTicket: () => {} };
  }

  // Splits "id1,id2,id3" into a clean array of chat id strings.
  function parseChatIdList(envVal) {
    if (!envVal) return [];
    return envVal.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // role -> [chatIds]. A role can broadcast to multiple chats at once (e.g.
  // two telephonists both get every Telephony ticket, both can change its
  // status, both cards stay in sync). Roles with no configured chat id fall
  // back to admin.
  const roleChatIds = {
    admin: [adminChatId],
    crm: parseChatIdList(process.env.TELEGRAM_CHAT_ID_CRM),
    telephony: parseChatIdList(process.env.TELEGRAM_CHAT_ID_TELEPHONY)
  };

  for (const [role, ids] of Object.entries(roleChatIds)) {
    if (role !== "admin" && ids.length === 0) {
      console.warn(`[telegram] TELEGRAM_CHAT_ID_${role.toUpperCase()} not set — tickets for ${ROLE_LABELS[role]} will go to the admin chat instead.`);
    }
  }

  // chatId -> roles visible in that chat's /tickets list.
  // The admin chat always sees every role (it's the catch-all overseer).
  // Any other configured chat sees only its own role's tickets.
  // A role with no chat id configured yet effectively belongs to the admin
  // chat too (since that's where its tickets are actually routed).
  function rolesForChatId(chatId) {
    if (chatId === adminChatId) return Object.keys(roleChatIds);
    return Object.entries(roleChatIds)
      .filter(([, ids]) => ids.includes(chatId))
      .map(([role]) => role);
  }

  function roleForTicket(ticket) {
    return TYPE_TO_ROLE[ticket.type] || "admin";
  }

  // The chat(s) a given ticket should be sent to, with fallback to admin
  // if the role-specific chat id(s) aren't configured.
  function chatIdsForTicket(ticket) {
    const role = roleForTicket(ticket);
    const ids = roleChatIds[role];
    return ids && ids.length ? ids : roleChatIds.admin;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.on("polling_error", (err) => {
    console.error("[telegram] polling error:", err.message);
  });

  // ticketId -> Array<{ chatId, messageId, view }>, every place this ticket
  // is currently displayed as a card/notification, so a status change (or
  // a forward) can update all of them at once. view is one of:
  //   { kind: "notify" }              - the original "new ticket" message (Head IT / role chat)
  //   { kind: "card", filter, page }  - opened from the list, keep the "back" button
  //   { kind: "agent" }               - the card forwarded to an IT agent's own chat
  const messageByTicketId = new Map();

  // Adds or replaces the entry for a given (ticketId, chatId, messageId) —
  // used when we know exactly what we're (re)rendering there.
  function upsertEntry(ticketId, entry) {
    const entries = messageByTicketId.get(ticketId) || [];
    const idx = entries.findIndex((e) => e.chatId === entry.chatId && e.messageId === entry.messageId);
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
    messageByTicketId.set(ticketId, entries);
  }

  // Makes sure a message is tracked at all, without clobbering its view
  // kind if it's already known (e.g. don't downgrade a "card" to "notify").
  // Used as a safety net for buttons pressed on messages sent before a
  // process restart, when the in-memory map was lost.
  function ensureEntryTracked(ticketId, chatId, messageId, defaultView) {
    const entries = messageByTicketId.get(ticketId) || [];
    const exists = entries.some((e) => e.chatId === chatId && e.messageId === messageId);
    if (!exists) {
      entries.push({ chatId, messageId, view: defaultView });
      messageByTicketId.set(ticketId, entries);
    }
  }

  function findTicket(ticketId) {
    return tickets.find((t) => t.id === ticketId);
  }

  async function notifyNewTicket(ticket) {
    const targetChatIds = chatIdsForTicket(ticket);
    const creator = users[ticket.created_by];
    const forwardable = roleForTicket(ticket) === "admin";
    const text = buildMessageText(ticket, creator ? creator.name : null, ticket.forwardedToName);

    for (const targetChatId of targetChatIds) {
      try {
        const sent = await bot.sendMessage(targetChatId, text, {
          parse_mode: "HTML",
          reply_markup: buildKeyboard(ticket.id, ticket.status, { forwardable })
        });
        upsertEntry(ticket.id, { chatId: targetChatId, messageId: sent.message_id, view: { kind: "notify" } });
      } catch (err) {
        console.error(`[telegram] failed to send new-ticket notification to ${targetChatId}:`, err.message);
      }
    }
  }

  // Redraws every message currently showing this ticket (notification,
  // list-opened card, or forwarded agent card), using each one's remembered
  // view context.
  async function refreshTicketMessage(ticket) {
    const entries = messageByTicketId.get(ticket.id) || [];
    if (entries.length === 0) return; // not shown in this process run (e.g. server restarted, or never opened)

    const forwardable = roleForTicket(ticket) === "admin";

    for (const entry of entries) {
      let text;
      let keyboard;

      if (entry.view.kind === "card") {
        text = buildTicketCardText(ticket, users, ticket.forwardedToName);
        keyboard = buildTicketCardKeyboard(ticket.id, ticket.status, entry.view.filter, entry.view.page, { forwardable });
      } else if (entry.view.kind === "agent") {
        text = buildAgentCardText(ticket, users);
        keyboard = buildKeyboard(ticket.id, ticket.status); // agents don't get a forward button
      } else {
        const creator = users[ticket.created_by];
        text = buildMessageText(ticket, creator ? creator.name : null, ticket.forwardedToName);
        keyboard = buildKeyboard(ticket.id, ticket.status, { forwardable });
      }

      try {
        await bot.editMessageText(text, {
          chat_id: entry.chatId,
          message_id: entry.messageId,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
      } catch (err) {
        // Telegram throws if the content is identical to the current message;
        // that's harmless and can be ignored.
        if (!/message is not modified/i.test(err.message)) {
          console.error("[telegram] failed to edit message:", err.message);
        }
      }
    }
  }

  // Renders the ticket list (filter + page) into an existing message (button
  // press) or sends it as a new message (command). `visibleRoles` restricts
  // which ticket types this particular chat is allowed to see.
  async function renderList(chatId, visibleRoles, filter, page, { messageId } = {}) {
    const scoped = tickets.filter((t) => visibleRoles.includes(roleForTicket(t)));
    const keyboard = buildListKeyboard(scoped, filter, page);
    const text = buildListText(filter, keyboard._clampedPage, keyboard._totalPages, keyboard._totalCount);
    const payload = { parse_mode: "HTML", reply_markup: keyboard };

    if (messageId) {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...payload });
    } else {
      await bot.sendMessage(chatId, text, payload);
    }
  }

  // Renders a single ticket's card into an existing message (button press)
  // or sends it as a new message. Remembers the view context so future
  // status changes (e.g. from the new-ticket buttons) keep this card in sync.
  async function renderTicketCard(chatId, ticket, filter, page, { messageId } = {}) {
    const forwardable = roleForTicket(ticket) === "admin";
    const text = buildTicketCardText(ticket, users, ticket.forwardedToName);
    const keyboard = buildTicketCardKeyboard(ticket.id, ticket.status, filter, page, { forwardable });
    const payload = { parse_mode: "HTML", reply_markup: keyboard };

    let resultMessageId = messageId;
    if (messageId) {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...payload });
    } else {
      const sent = await bot.sendMessage(chatId, text, payload);
      resultMessageId = sent.message_id;
    }

    upsertEntry(ticket.id, { chatId, messageId: resultMessageId, view: { kind: "card", filter, page } });
  }

  bot.onText(/^\/tickets\b/, async (msg) => {
    const chatId = String(msg.chat.id);
    const roles = rolesForChatId(chatId);
    if (roles.length === 0) return; // unknown chat, not one of our configured recipients

    try {
      await renderList(chatId, roles, "all", 0);
    } catch (err) {
      console.error("[telegram] failed to render ticket list:", err.message);
    }
  });

  bot.onText(/^\/start\b/, async (msg) => {
    const chatId = String(msg.chat.id);
    const roles = rolesForChatId(chatId);
    if (roles.length === 0) return;

    const roleNames = roles.map((r) => ROLE_LABELS[r]).join(", ");
    try {
      await bot.sendMessage(
        chatId,
        `👋 Бот тикет-системы запущен.\nЭтот чат получает тикеты: <b>${roleNames}</b>.\n\nНовые тикеты приходят сюда автоматически.\nКоманда /tickets — список тикетов с фильтрами.`,
        { parse_mode: "HTML" }
      );
    } catch (err) {
      console.error("[telegram] failed to respond to /start:", err.message);
    }
  });

  bot.on("callback_query", async (query) => {
    const data = query.data || "";
    const chatId = String(query.message.chat.id);
    const roles = rolesForChatId(chatId);
    // Agent chats aren't a configured role (they only ever see tickets that
    // were explicitly forwarded to them), so they need a separate check.
    const isItAgentChat = IT_AGENTS.some((a) => a.chatId === chatId);

    try {
      if (roles.length === 0 && !isItAgentChat) {
        // Button pressed in a chat we don't recognize — ignore safely.
        return bot.answerCallbackQuery(query.id).catch(() => {});
      }

      if (data === "noop") {
        return bot.answerCallbackQuery(query.id).catch(() => {});
      }

      // lst:<filterCode>:<page> — render (or re-render) the ticket list
      const lstMatch = data.match(/^lst:([aoprc]):(\d+)$/);
      if (lstMatch) {
        const filter = CODE_TO_STATUS_FILTER[lstMatch[1]] || "all";
        const page = parseInt(lstMatch[2], 10) || 0;
        await renderList(chatId, roles, filter, page, { messageId: query.message.message_id });
        return bot.answerCallbackQuery(query.id).catch(() => {});
      }

      // view:<ticketId>:<filterCode>:<page> — open a ticket's card from the list
      const viewMatch = data.match(/^view:(.+):([aoprc]):(\d+)$/);
      if (viewMatch) {
        const [, ticketId, filterCode, pageStr] = viewMatch;
        const filter = CODE_TO_STATUS_FILTER[filterCode] || "all";
        const page = parseInt(pageStr, 10) || 0;
        const ticket = findTicket(ticketId);

        if (!ticket || !roles.includes(roleForTicket(ticket))) {
          return bot.answerCallbackQuery(query.id, { text: "Тикет не найден", show_alert: true }).catch(() => {});
        }

        await renderTicketCard(chatId, ticket, filter, page, { messageId: query.message.message_id });
        return bot.answerCallbackQuery(query.id).catch(() => {});
      }

      // fwdmenu:<ticketId> — Head IT tapped "Переадресовать": swap the
      // keyboard (text stays put) for a list of IT agents to pick from.
      const fwdMenuMatch = data.match(/^fwdmenu:(.+)$/);
      if (fwdMenuMatch) {
        const ticketId = fwdMenuMatch[1];
        const ticket = findTicket(ticketId);

        if (!ticket || roleForTicket(ticket) !== "admin" || !roles.includes("admin")) {
          return bot.answerCallbackQuery(query.id, { text: "Недоступно", show_alert: true }).catch(() => {});
        }

        try {
          await bot.editMessageReplyMarkup(buildForwardMenuKeyboard(ticketId), {
            chat_id: chatId,
            message_id: query.message.message_id
          });
        } catch (err) {
          if (!/message is not modified/i.test(err.message)) {
            console.error("[telegram] failed to open forward menu:", err.message);
          }
        }
        return bot.answerCallbackQuery(query.id).catch(() => {});
      }

      // fwdcancel:<ticketId> — back out of the forward menu without picking
      // anyone; just redraw this ticket's normal keyboard everywhere.
      const fwdCancelMatch = data.match(/^fwdcancel:(.+)$/);
      if (fwdCancelMatch) {
        const ticket = findTicket(fwdCancelMatch[1]);
        if (ticket) await refreshTicketMessage(ticket);
        return bot.answerCallbackQuery(query.id).catch(() => {});
      }

      // fwd:<ticketId>:<agentIndex> — forward the ticket to the chosen IT
      // agent: send them a fresh card and note the delegation everywhere
      // this ticket is already shown. The ticket stays fully visible to
      // Head IT (still appears in /tickets, status keeps syncing both ways).
      const fwdMatch = data.match(/^fwd:(.+):(\d+)$/);
      if (fwdMatch) {
        const [, ticketId, idxStr] = fwdMatch;
        const ticket = findTicket(ticketId);
        const agent = IT_AGENTS[parseInt(idxStr, 10)];

        if (!ticket || !agent || roleForTicket(ticket) !== "admin" || !roles.includes("admin")) {
          return bot.answerCallbackQuery(query.id, { text: "Недоступно", show_alert: true }).catch(() => {});
        }

        ticket.forwardedTo = agent.chatId;
        ticket.forwardedToName = agent.name;
        ticket.history.push({
          action: "forwarded",
          to: agent.chatId,
          toName: agent.name,
          by: actingUsername,
          via: "telegram",
          at: Date.now()
        });
        persistTickets();

        try {
          const sent = await bot.sendMessage(agent.chatId, buildAgentCardText(ticket, users), {
            parse_mode: "HTML",
            reply_markup: buildKeyboard(ticket.id, ticket.status)
          });
          upsertEntry(ticket.id, { chatId: agent.chatId, messageId: sent.message_id, view: { kind: "agent" } });
        } catch (err) {
          console.error("[telegram] failed to forward ticket to agent:", err.message);
        }

        // Updates Head IT's card (now shows "Переадресован: ..." and the
        // restored normal keyboard) plus any other already-shown copies.
        await refreshTicketMessage(ticket);

        return bot
          .answerCallbackQuery(query.id, { text: `Переадресовано: ${agent.name}` })
          .catch(() => {});
      }

      // ticket:<ticketId>:<newStatus> — change status (from a notification or a card)
      const statusMatch = data.match(/^ticket:(.+):(open|in_progress|resolved|closed)$/);
      if (statusMatch) {
        const [, ticketId, newStatus] = statusMatch;
        const ticket = findTicket(ticketId);
        const authorized = ticket && (
          roles.includes(roleForTicket(ticket)) ||
          (isItAgentChat && ticket.forwardedTo === chatId)
        );

        if (!authorized) {
          return bot.answerCallbackQuery(query.id, { text: "Тикет не найден", show_alert: true }).catch(() => {});
        }

        ticket.status = newStatus;
        ticket.updated_at = Date.now();
        ticket.history.push({
          action: "status_changed",
          to: newStatus,
          by: actingUsername,
          via: "telegram",
          at: Date.now()
        });

        persistTickets();

        // Make sure this message's context is up to date even if it wasn't
        // tracked yet (e.g. bot/process restarted since it was sent).
        ensureEntryTracked(ticket.id, chatId, query.message.message_id, {
          kind: isItAgentChat ? "agent" : "notify"
        });

        await refreshTicketMessage(ticket);

        return bot
          .answerCallbackQuery(query.id, { text: `Статус: ${STATUS_LABELS[newStatus]}` })
          .catch(() => {});
      }

      return bot.answerCallbackQuery(query.id).catch(() => {});
    } catch (err) {
      console.error("[telegram] callback_query handling failed:", err.message);
      return bot.answerCallbackQuery(query.id, { text: "Ошибка, попробуйте ещё раз", show_alert: true }).catch(() => {});
    }
  });

  console.log("[telegram] bot started, polling for updates.");
  for (const [role, ids] of Object.entries(roleChatIds)) {
    console.log(`[telegram] role "${role}" (${ROLE_LABELS[role]}) -> chat(s) ${ids.join(", ")}`);
  }

  return { notifyNewTicket };
}

module.exports = { setupTelegramBot };
