# Context Handoff

## Project
- Pet groomer CRM app
- Repo root: `c:\Users\Nick's Desktop\OneDrive\Documents\pet_groomer_app\pet_groomer_app`
- Frontend workspace: `react-app`
- Current working environment: Windows / PowerShell

## Canonical Session Rule
- Use this file as the compressed project summary for new chats.
- When the user says `Update Context`, update this file instead of only replying in chat.

## Local Commands
- `npm run dev`
  - runs `npx netlify dev --port 8888`
- `npm run dev:web`
- `npm run dev:web:lan`
- `npm run build`
- `npm run lint`
- `npm run seed:test-data`

## Windows Shell Note
- In PowerShell, `npm.ps1` may be blocked by execution policy.
- If that happens, use `npm.cmd run <script>` instead.
- Use `npm run dev`, not `npx run dev`.

## Current Verified Status
- Verified on March 17, 2026:
  - `npm.cmd run lint` passes
  - `npm.cmd run build` passes
- Root scripts currently include:
  - `dev` for Netlify local dev on port `8888`
  - `seed:test-data` for database QA seeding

## Recent Product / UI Context
- Route lazy-loading is in place in `react-app/src/App.tsx`.
- Vendor chunk splitting is in place in `react-app/vite.config.ts`.
  - `vendor-calendar`
  - `vendor-date`
  - `vendor-ui`
- Shared theme work has been pushed through cards, modals, dropdowns, archive UI, notifications, and scheduled appointment styling.
- `ThemeProvider.tsx` syncs browser `theme-color`.
- Latest dark-theme cleanup replaces hard-coded plum/lavender surfaces with theme tokens in shared cards, modals, settings cards, and dropdown states.

## Latest Functional Change
- Note views now show who posted the note when author data is available.
- New owner, pet, and appointment notes store:
  - `created_by_user_id`
  - `created_by_name`
- Existing note displays were updated across:
  - client details
  - pet details
  - appointment details
  - client-facing pet and appointment note views
  - client and pet quick view modals
- Older notes without stored author metadata continue to render normally without a poster label.
- The earlier client no-pet empty state remains in place:
  - `No Pets Found`
  - `Request New Pet Profile`
  - CTA navigates to `/requests?type=new_pet`

## QA / Seed Context
- QA execution notes live in `docs/qa/QA_EXECUTION_NOTES.md`.
- Recommended QA order:
  - admin user management
  - groomer desktop/mobile
  - client desktop/mobile
  - cross-role propagation
- Important QA setup:
  - each client user should be linked to an owner
  - each client should have at least one pet for appointment/pet flow testing
  - include future and past appointments
  - include notes to test preview and `View All Notes`
  - create at least one request of every type
- `scripts/seed-test-data.mjs` seeds:
  - 30 owners
  - pets
  - future and historical appointments
  - owner/pet/appointment notes
  - 6 client users
  - requests across all request types, including `new_pet`
  - notifications
- Seed script requires `NETLIFY_DATABASE_URL` or `DATABASE_URL`.

## Important Existing Behavior
- Client users do not see archive links in navigation.
- Request workflow includes client-view restrictions and status timeline updates.
- Archive/unarchive flows exist for clients, pets, appointments, and notes.
- Archiving clients/pets cascades to related records in active views.
- In-app password reset/change flow exists.
- Notification system supports unread/read state and history.

## Current Working Tree
- Uncommitted changes are currently present in:
  - `.gitignore`
  - `package.json`
  - `react-app/src/App.css`
  - `CONTEXT_HANDOFF.md`
- `.gitignore` now ignores `CONTEXT_HANDOFF.md`.
- Latest committed note-author change was pushed to `origin/master`.

## Fresh Chat Opener
- `Use CONTEXT_HANDOFF.md in the repo root as the current project summary.`
