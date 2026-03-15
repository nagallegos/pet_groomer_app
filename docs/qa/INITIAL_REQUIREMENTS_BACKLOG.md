# Initial Requirements Backlog

This backlog is the first pass of issues and improvements identified from a code and UX review. Each entry is written as an implementation-ready requirement.

## R-001 Client home page must only show the signed-in client's requests

### Context

- Role: Client
- Device: Desktop and mobile
- Page or modal: Client home page
- Current behavior: The open request count and request log are derived from the full `requests` collection rather than filtering to the signed-in client's owner record.
- Why it is a problem: This can expose other clients' request data and gives incorrect counts.

### Requirement

The client home page must scope request counts and request-log content to the signed-in client's linked owner record only.

### Acceptance Criteria

1. Given a client user with a linked owner record, when the home page loads, then the open request count reflects only that owner's requests.
2. Given multiple clients in the system, when one client views the request log, then requests belonging to other owners are not shown.
3. Given no linked owner record, when the home page loads, then no client request data is shown.

### Priority

Critical

## R-002 UI text and icon glyphs must render without encoding artifacts

### Context

- Role: All
- Device: Desktop and mobile
- Page or modal: Requests page, users page, client home page, and any shared UI using special separators/icons
- Current behavior: Several strings render as mojibake such as `â€¢`, `âŒ•`, and `âŒ„`.
- Why it is a problem: The UI looks broken and less production-ready, and it reduces clarity.

### Requirement

The app must render separators, icons, and symbols without encoding artifacts across all pages and modes.

### Acceptance Criteria

1. Given any page using separator bullets or symbolic controls, when it renders, then no mojibake characters are visible.
2. Given the search action and filter toggle controls, when they render, then they use either valid icons or plain text labels.
3. Given desktop and mobile views, when the UI is reviewed visually, then no replacement or garbled characters appear.

### Priority

High

## R-003 Request type indicators must be visually stronger and faster to scan

### Context

- Role: Groomer and admin
- Device: Desktop and mobile
- Page or modal: Requests page and request notifications
- Current behavior: Request types exist as labels, but there is not yet a clearly differentiated visual system for fast scanning.
- Why it is a problem: Staff need to understand request type immediately, especially when handling many requests.

### Requirement

The Requests experience must use a consistent request-type indicator system with distinct labels, colors, and iconography for appointment, new pet, profile update, and general requests.

### Acceptance Criteria

1. Given a mixed request list, when staff scans the page, then each request type can be distinguished without opening the request.
2. Given light and dark mode, when request type indicators render, then contrast remains readable.
3. Given a request notification in the bell dropdown, when it appears, then the request type is identifiable from the notification presentation.

### Priority

High

## R-004 Notification bell must support clearer freshness and triage behavior

### Context

- Role: Groomer, admin, and client
- Device: Desktop and mobile
- Page or modal: Topbar notification bell
- Current behavior: Notifications poll every 30 seconds and can be opened one by one, but there is no explicit empty/loading/freshness state beyond the basic dropdown contents.
- Why it is a problem: Users cannot easily tell whether they are looking at fresh notifications or whether everything has been handled.

### Requirement

The notification bell must provide a clearer notification triage experience with visible unread emphasis, a last-updated or refresh affordance, and bulk dismissal or mark-read behavior.

### Acceptance Criteria

1. Given unread notifications, when the dropdown opens, then unread items are visually distinct from read items.
2. Given the dropdown is open, when the user wants fresh data, then there is a visible way to refresh or an explicit freshness indicator.
3. Given multiple notifications, when the user has reviewed them, then they can mark all as read without opening each item individually.

### Priority

Medium

## R-005 Client home page must include client-facing appointment notes where relevant

### Context

- Role: Client
- Device: Desktop and mobile
- Page or modal: Client home page
- Current behavior: The home page surfaces client-facing pet notes, but not client-facing appointment notes.
- Why it is a problem: Clients may miss important appointment-specific instructions that the groomer intended them to see.

### Requirement

The client home page must surface a concise combined feed of client-facing notes that includes both pet notes and appointment notes.

### Acceptance Criteria

1. Given a client has client-facing pet notes and appointment notes, when the home page loads, then both note types can appear in the summary feed.
2. Given a note belongs to a future appointment, when it is shown, then the feed identifies the related pet or appointment context.
3. Given internal-only notes exist, when the client home page loads, then those notes are never shown.

### Priority

Medium

## R-006 Users page search and filters must match the actual managed-user fields

### Context

- Role: Admin
- Device: Desktop and mobile
- Page or modal: Users page
- Current behavior: The placeholder says users can be searched by phone or role, but usernames are displayed and are not clearly included in search or sorting controls.
- Why it is a problem: Admin user management becomes slower and less predictable as the number of users grows.

### Requirement

The Users page must let admins search and sort by the fields that are actually important for account operations, including username and lock status.

### Acceptance Criteria

1. Given a set of users with usernames, when the admin searches by username, then matching users are shown.
2. Given one or more locked users, when the admin filters or sorts, then locked accounts can be identified quickly.
3. Given the search placeholder and filters, when they are shown, then the copy accurately reflects the supported search fields.

### Priority

Medium

## R-007 Client quick-view and edit flows must make note management fully modal-driven

### Context

- Role: Groomer and admin
- Device: Desktop and mobile
- Page or modal: Client, pet, and appointment quick-view modals
- Current behavior: The product direction is moving toward stacked note modals, but this needs to stay fully consistent across all parent modals and note actions.
- Why it is a problem: Mixed inline and modal note-editing patterns feel inconsistent and make the UI harder to learn.

### Requirement

All quick-view note actions must use the same modal-driven pattern: parent modal shows note previews, `New Note` opens a focused child modal, `Edit` opens a focused child modal, and `View All Notes` opens a dedicated scrollable note list modal.

### Acceptance Criteria

1. Given the client, pet, or appointment quick-view modal, when the user creates a note, then a dedicated child modal opens instead of an inline editor.
2. Given an existing note, when the user edits it, then the edit happens in a child modal layered above the parent.
3. Given more than 3 notes, when the user selects `View All Notes`, then a dedicated all-notes modal opens and the parent remains intact behind it.

### Priority

High

## R-008 Search panels should use a single polished icon system instead of mixed text glyphs

### Context

- Role: Staff and admin
- Device: Desktop and mobile
- Page or modal: Search cards on contacts, pets, archive, appointment history, and users pages
- Current behavior: Search and toggle controls use symbol characters that are brittle and visually inconsistent.
- Why it is a problem: The controls look less polished and can break under encoding or font differences.

### Requirement

All search-panel action buttons must use a shared icon component or inline SVG system rather than plain symbol characters.

### Acceptance Criteria

1. Given the search submit button, when it renders, then it uses the same icon treatment on every page.
2. Given the filter/sort toggle, when it renders, then it uses the same caret or funnel icon system on every page.
3. Given desktop and mobile layouts, when these buttons render, then they remain aligned and visually consistent.

### Priority

Medium

## R-009 Client request flow should present the linked client as read-only identity context on every request type

### Context

- Role: Client
- Device: Desktop and mobile
- Page or modal: Request creation modal/page
- Current behavior: Client-owned requests are automatically scoped, but the visible form hierarchy does not yet guarantee a strong read-only identity summary for every request type.
- Why it is a problem: Clients should always understand which profile they are acting under, especially if future household/account structures expand.

### Requirement

The client request form must show the linked client identity at the top as read-only context for every request type.

### Acceptance Criteria

1. Given a client user opens any request form, when the form appears, then the linked client identity is visible near the top.
2. Given a client user fills out a request, when they review the form before submit, then it is clear the request is being submitted under their own client profile.
3. Given a user is not linked to an owner record, when they open the request flow, then the app blocks submission and explains the missing link.

### Priority

Medium

## R-010 Admin and groomer request handling must support a clearer audit trail

### Context

- Role: Groomer and admin
- Device: Desktop and mobile
- Page or modal: Requests page and request modal
- Current behavior: Requests support status and notes, but the current workflow would benefit from a stronger visible timeline of actions and updates.
- Why it is a problem: As requests become a communication channel, staff need a clear operational history.

### Requirement

The request detail experience must show a chronological update timeline including creation, status changes, staff updates, and client-visible updates.

### Acceptance Criteria

1. Given a newly created request, when staff opens it, then the request creation event is visible in a timeline.
2. Given a status change or internal update, when staff saves the request, then the change is added to the timeline.
3. Given a client-visible update, when the client views the request, then only the appropriate public-facing timeline entries are shown.

### Priority

High
