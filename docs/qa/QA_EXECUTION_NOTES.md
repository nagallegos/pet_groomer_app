# QA Execution Notes

## Recommended Order

1. Seed or create the test users in [TEST_USERS.md](./TEST_USERS.md).
2. Log in as admin and verify user management.
3. Verify groomer desktop flows.
4. Verify groomer mobile flows.
5. Verify client desktop flows.
6. Verify client mobile flows.
7. Run cross-role propagation checks.
8. Log every issue as a requirement using [REQUIREMENTS_LOG_TEMPLATE.md](./REQUIREMENTS_LOG_TEMPLATE.md).

## Important Test Data Setup

- Make sure each client user is linked to an owner record.
- Give each client at least one pet before testing appointment and pet flows.
- Create at least one future appointment and one past appointment.
- Create at least 4 notes on one client, one pet, and one appointment to test the 3-note preview and `View All Notes`.
- Create at least one request of every type.

## Recommended Visual Review Topics

Check these while testing every role/device pair:

- text contrast in dark mode
- spacing around icons and pill indicators
- modal stacking and scroll containment
- button wording consistency
- safe-area behavior on mobile
- whether primary actions are obvious
- whether destructive actions are clearly separated

## Email Testing Guidance

- Fake emails are fine for permission and UI testing.
- Use a real inbox only when you want to verify actual delivery and link behavior.
- Keep real email testing isolated to one QA user so the rest of the matrix stays disposable.
