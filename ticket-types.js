/* =========================
   TICKET TYPE TAXONOMY
   ---------------------------------------------------------
   Single source of truth for "what kind of problem is this" — grouped by
   department (IT / Telephony / CRM). Both the web app (ticket creation
   form + filters, via GET /api/tickets/types) and the Telegram bot
   (routing a ticket to the right chat) read from this file, so adding,
   renaming, or re-grouping a problem type only has to happen here.

   Each department always ends with an "Другое" (Other) entry — if the
   exact problem isn't listed, the person can pick that and describe the
   specifics in the ticket's description instead of being blocked.

   `role` is the Telegram routing role from telegram.js: "admin" (Head IT),
   "telephony", or "crm".
========================= */

const DEPARTMENTS = [
  {
    key: "it",
    label: "IT",
    role: "admin",
    types: [
      "RDP Logout",
      "RDP Lagging",
      "ПК не включается",
      "Нет интернета",
      "Принтер не работает",
      "Не подходит пароль / нет доступа",
      "Программа зависает / вылетает",
      "Нужна установка или обновление ПО",
      "Почта не работает",
      "VPN не подключается",
      "Другое (IT)"
    ]
  },
  {
    key: "telephony",
    label: "Телефония",
    role: "telephony",
    types: [
      "Звонилка не работает",
      "Не слышно собеседника",
      "Звонок обрывается",
      "Исходящий звонок не проходит",
      "Гарнитура не работает",
      "Запись звонка не сохраняется",
      "Другое (Телефония)"
    ]
  },
  {
    key: "crm",
    label: "CRM",
    role: "crm",
    types: [
      "CRM Logout",
      "CRM зависает / медленно работает",
      "Не отображаются лиды / клиенты",
      "Ошибка при сохранении данных",
      "Нет доступа к CRM",
      "Неправильные права доступа",
      "Другое (CRM)"
    ]
  }
];

// Flat list of every valid type string, for server-side validation.
const ALL_TYPES = DEPARTMENTS.flatMap((d) => d.types);

// type -> routing role (used by telegram.js instead of a hand-maintained map).
const TYPE_TO_ROLE = {};
for (const dept of DEPARTMENTS) {
  for (const type of dept.types) {
    TYPE_TO_ROLE[type] = dept.role;
  }
}

module.exports = { DEPARTMENTS, ALL_TYPES, TYPE_TO_ROLE };
