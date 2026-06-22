# Safari Work OS

Internal team dashboard for a sales/retention organisation. A single Node.js
(Express + Socket.IO) server backs a static front-end and provides:

- **Auth & sessions** — cookie-based login with bcrypt password hashing and
  basic in-memory rate limiting. Legacy plaintext passwords are upgraded to a
  bcrypt hash automatically on the next successful login.
- **Real-time chat** — global room and private 1-on-1 DMs over Socket.IO, with
  file/image attachments and message deletion.
- **CRM org chart** — HOS → Team Lead → Agent hierarchy, with per-role
  visibility rules.
- **Ticketing** — department-based ticket types (IT / Telephony / CRM),
  attachments, status workflow and role-scoped assignment.
- **Telegram integration** — new tickets are pushed to role-specific Telegram
  chats with inline buttons to change status or forward to an IT agent
  (optional; disabled if no bot token is configured).
- **Presence** — online/lunch/break status with daily break/lunch limits.

## Requirements

- Node.js 18+ (uses `String.prototype.replaceAll`, Express 5)

## Setup

```bash
npm install
cp .env.example .env        # then edit .env as needed
```

### Seed users

User records live in `data/users.json` (git-ignored — it holds password
hashes). To get started, copy the bundled example, which creates one admin:

```bash
cp data/users.example.json data/users.json
```

Default example credentials: **`admin` / `admin123#`** (change immediately).

To build the full HOS → TL → Agent org chart instead, run the one-off
migration (it expects an existing `data/users.json` to match against by name):

```bash
node migrate-crm-structure.js   # rebuild users.json under the CRM model
node migrate-passwords.js       # optional: hash any remaining plaintext passwords
```

## Running

```bash
npm start      # production
npm run dev    # auto-reload via nodemon
```

The server listens on `http://localhost:8080` by default (override with `PORT`).

## Configuration

All configuration is via environment variables — see [`.env.example`](.env.example).

| Variable | Description |
| --- | --- |
| `PORT` / `HOST` | Listen address (defaults `8080` / `0.0.0.0`). |
| `COOKIE_SECURE` | Set `true` when served over HTTPS so the session cookie gets the `Secure` flag. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Enable the Telegram bot. Leave empty to disable. |
| `TELEGRAM_CHAT_ID_CRM` / `TELEGRAM_CHAT_ID_TELEPHONY` | Optional role-specific chats (comma-separated lists allowed). |
| `TELEGRAM_IT_AGENTS` | Optional `chatId:Name,...` list of IT agents tickets can be forwarded to. |
| `TELEGRAM_ACTING_USERNAME` | User recorded as the actor for status changes made from Telegram. |

## Project layout

```
server.js              # Express app, REST API, Socket.IO, uploads
telegram.js            # Telegram bot: notifications, ticket list, forwarding
ticket-types.js        # Department → problem-type taxonomy (single source of truth)
migrate-*.js           # One-off data migrations
public/                # Static front-end (login, dashboard, CRM, profile)
data/                  # Runtime JSON store (git-ignored)
```
