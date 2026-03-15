# Netlify DB Setup

This project now includes a Netlify Functions API backed by Postgres for:

- owners
- pets
- appointments
- owner, pet, and appointment notes
- app users and sessions for authentication

The API lives at `/api/*` and is implemented in [netlify/functions/api.mjs](./netlify/functions/api.mjs).

## What this phase does

- Persists create, update, archive, unarchive, and delete actions to Postgres
- Creates the core schema automatically on first API request
- Keeps the current frontend mock-read flow intact so the app still runs locally without a database

## Current app state

The app now hydrates from the backend bootstrap endpoint first and falls back to mock data only when the API is unavailable. Normal authenticated usage should be database-backed.

## Official references

As of March 13, 2026, Netlify documents Netlify DB as a beta Postgres integration powered by Neon, and recommends installing `@netlify/neon` so the database can be provisioned automatically during `netlify dev`, `netlify build`, or a normal Netlify build/deploy.

- https://docs.netlify.com/build/data-and-storage/netlify-db/
- https://www.netlify.com/blog/netlify-db-database-for-AI-native-development/

## Local setup

1. Use Node `20.19+`.

This repo includes [.node-version](./.node-version) with the current expected version. If you are using WSL, install dependencies and run the dev servers from WSL consistently.

2. Install root dependencies:

```powershell
npm install
```

3. Initialize Netlify DB locally if needed:

```powershell
npx netlify db init
```

4. Run through Netlify so functions and env vars are available:

```powershell
npx netlify dev --port 8888
```

5. Run the frontend in a separate terminal:

```powershell
# terminal 1, repo root
npm run dev:api

# terminal 2, repo root
npm run dev:web:lan
```

Then open the Vite URL for the frontend. The frontend proxies API calls to `http://127.0.0.1:8888` by default.

If your backend is running on another port, set:

```text
VITE_API_PROXY_TARGET=http://localhost:YOUR_PORT
```

## Deploy setup

1. Deploy this repo to Netlify.
2. Install or provision Netlify DB / Neon for the site.
3. Deploy normally. The API will create missing tables and indexes on first request.
4. If you want persistence beyond the initial temporary database period Netlify documents, claim the database in the Netlify/Neon UI.

## Authentication setup

The app now requires login. The backend seeds up to two users from environment variables on first API request:

```text
APP_ADMIN_EMAIL=you@example.com
APP_ADMIN_PASSWORD=choose-a-strong-password
APP_ADMIN_FIRST_NAME=Your
APP_ADMIN_LAST_NAME=Name
APP_ADMIN_PHONE=555-555-5555
APP_GROOMER_EMAIL=groomer@example.com
APP_GROOMER_PASSWORD=choose-a-strong-password
APP_GROOMER_FIRST_NAME=Pet
APP_GROOMER_LAST_NAME=Groomer
APP_GROOMER_PHONE=555-555-5555
```

For backward compatibility, the API still accepts `APP_ADMIN_NAME` and `APP_GROOMER_NAME`, but the separate first/last name variables are now the preferred setup. The phone env vars are optional and are only used to pre-seed the initial user profiles.

The supported roles are:

- `admin`
- `groomer`
- `client`

If those env vars are missing, no users are created and login will fail until you add them.

## Frontend API base URL

The frontend now defaults to `/.netlify/functions/api`. For local Vite development, use:

```text
VITE_API_BASE_URL=/.netlify/functions/api
VITE_API_PROXY_TARGET=http://localhost:8888
```

Put that in `react-app/.env.local` if you want the frontend to call the local API through the Vite proxy.

## Connection string usage

For this project:

- use the pooled connection string as `NETLIFY_DATABASE_URL` for the running Netlify function
- keep the unpooled connection string for manual SQL, migration tools, or direct admin access later if you need it

The function in [netlify/functions/api.mjs](./netlify/functions/api.mjs) now supports:

- `NETLIFY_DATABASE_URL`
- `DATABASE_URL` as a fallback

## Notification setup

The appointment notification flow supports:

- initial appointment notifications when an appointment is scheduled
- 24-hour reminders for scheduled or confirmed appointments
- cancellation notices
- client confirmation / cancellation / reschedule requests through signed response links
- optional inbound SMS response handling

### Real email delivery with Resend

As of March 13, 2026, Resend's official send-email API accepts a bearer token and fields including `from`, `to`, `subject`, `html`, and `text`. Official docs:

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/domains/introduction

To make email delivery work for real right now, set:

```text
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=onboarding@resend.dev
EMAIL_FROM_NAME=Barks Bubbles & Love
EMAIL_REPLY_TO=groomer@example.com
```

Notes:

- `EMAIL_FROM_ADDRESS` should eventually be a verified sender/domain you control.
- For early testing, Resend documents `onboarding@resend.dev` as a testing sender.
- The function now sends directly through Resend when `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are present.
- If those are missing, it falls back to `EMAIL_NOTIFICATION_WEBHOOK_URL`, and if that is also missing it simulates delivery in logs.

Optional environment variables:

```text
PUBLIC_APP_URL=https://your-site.netlify.app
NOTIFICATION_CRON_SECRET=choose-a-random-secret
EMAIL_NOTIFICATION_WEBHOOK_URL=https://your-email-automation-endpoint
SMS_NOTIFICATION_WEBHOOK_URL=https://your-sms-automation-endpoint
SMS_WEBHOOK_SECRET=choose-another-random-secret
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=onboarding@resend.dev
EMAIL_FROM_NAME=Barks Bubbles & Love
EMAIL_REPLY_TO=groomer@example.com
```

Notes:

- `EMAIL_NOTIFICATION_WEBHOOK_URL` receives JSON payloads for outbound emails.
- `SMS_NOTIFICATION_WEBHOOK_URL` receives JSON payloads for outbound texts.
- `SMS_WEBHOOK_SECRET` protects the inbound `POST /api/webhooks/sms` route for text replies if you wire an automation/provider to it.
- If the outbound webhook URLs are missing, the app simulates delivery in the function logs so you can test the workflow without a provider.
- A scheduled Netlify function in [netlify/functions/appointment-reminders.mjs](./netlify/functions/appointment-reminders.mjs) calls the reminder processor hourly.

## Available endpoints

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/auth/profile`
- `GET /api/public/appointment-response/:token`
- `POST /api/public/appointment-response/:token`
- `POST /api/webhooks/sms`
- `POST /api/notifications/process-reminders`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/bootstrap`
- `GET /api/owners`
- `POST /api/owners`
- `GET /api/owners/:id`
- `PUT /api/owners/:id`
- `DELETE /api/owners/:id`
- `POST /api/owners/:id/archive`
- `POST /api/owners/:id/unarchive`
- `POST /api/owners/:id/notes`
- `PUT /api/owners/:id/notes/:noteId`
- `DELETE /api/owners/:id/notes/:noteId`
- The same route pattern exists for `/pets`
- The same route pattern exists for `/appointments`

## Schema

The explicit schema reference is in [db/schema.sql](./db/schema.sql).
