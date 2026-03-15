# QA Test Matrix

This matrix is for critical manual QA across two staff users and two client users. The goal is to verify:

- core data flows
- permissions
- notifications
- modal behavior
- mobile vs desktop usability
- wording and visual clarity

## Pass Criteria

- The flow completes without console/server errors.
- Data persists after refresh.
- The UI is readable and visually consistent in light and dark mode.
- Actions are logically placed and named.
- The user can recover from mistakes without confusion.

## Groomer Desktop

### Login and account

1. Sign in with the desktop groomer account.
2. Sign out.
3. Sign back in.
4. Trigger a password reset request.
5. Confirm the reset flow page loads correctly.
6. Attempt 5 failed sign-ins on a throwaway user and confirm lockout behavior.

### Home and daily work

1. Review dashboard cards, upcoming appointments, quick actions, and notifications.
2. Open an upcoming appointment from the home page.
3. Edit and save the appointment.
4. Confirm changes appear on the Appointments page and in the client view.

### Clients and pets

1. Search for a client.
2. Open the quick-view modal.
3. Edit core client info.
4. Add an internal note.
5. Add a client-facing note.
6. Open `View All Notes` if more than 3 notes exist.
7. Open a pet from the client modal in view mode.
8. Quick edit the pet.
9. Navigate to the full pet page from the pet modal.
10. Return to the client flow and confirm state is still coherent.

### Scheduling

1. Schedule an appointment from the Appointments page.
2. Schedule an appointment from a specific client page.
3. Verify client is prefilled and locked in the client-scoped modal.
4. Confirm the appointment appears:
   - on the calendar
   - in the daily appointment list
   - on the home page
5. Change status through valid transitions only.
6. Confirm invalid quick actions are hidden.

### Requests

1. Open the Requests page.
2. Verify request type indicators are easy to distinguish.
3. Open each request type:
   - new pet
   - appointment
   - profile update
   - general
4. Update status and internal notes.
5. Confirm client-facing updates are visible to the client user.

### Admin-only checks

Use the admin account on desktop for these.

1. Open the Users page.
2. Create a client user linked to an owner record.
3. Create a groomer user.
4. Send setup email.
5. Send password reset.
6. Unlock a locked account.
7. Confirm self-role/self-deactivation restrictions.

## Groomer Mobile

### Navigation and layout

1. Sign in on mobile.
2. Open and close the offcanvas menu.
3. Open Settings and confirm visibility in light and dark mode.
4. Verify the user identity block is readable.
5. Verify the notification bell is reachable and legible.

### Appointments

1. Open the mobile Appointments page.
2. Use `View Calendar`.
3. Test day, 3-day, and agenda view.
4. Verify toolbar spacing, scroll behavior, and readable labels.
5. Open an appointment from the list.
6. Edit and save.
7. Confirm the modal does not overflow off-screen.

### Requests and notes

1. Open a request notification from the bell.
2. Confirm it lands on the specific request modal.
3. Open a client modal and create a new note from the `New Note` action.
4. Edit an existing note through the stacked child modal.
5. Confirm cancel returns to the parent modal cleanly.

## Client Desktop

### Login and profile

1. Sign in with a client user.
2. Confirm only client-appropriate navigation is visible.
3. Open settings and update profile details.
4. Change notification preferences.
5. Request password reset from settings.

### Home and pets

1. Review the client home page.
2. Confirm personal information is accurate.
3. Open each pet and verify:
   - age is shown
   - DOB is only shown on detailed pet info
   - client-facing notes appear
   - internal notes do not appear

### Requests

1. Create a new pet request.
2. Create an appointment request for an existing pet.
3. Create an appointment request with `New Pet`.
4. Create a profile update request.
5. Create a general request.
6. Confirm submitted requests appear in the request log.

### Appointments and notifications

1. Open an appointment notification from the bell.
2. Confirm it lands on the specific appointment in view mode.
3. Verify appointment details are readable and consistent with staff-side data.

## Client Mobile

### Mobile readability

1. Sign in on mobile.
2. Verify home page density is readable without crowding.
3. Verify cards, pills, buttons, and note previews are tappable.
4. Open pets and appointments from mobile.

### Request workflow

1. Submit each request type from mobile.
2. Confirm the forms feel linear and uncluttered.
3. Confirm validation messages are readable.
4. Confirm the request log is easy to scan.

### Notifications

1. Open the bell.
2. Open a request update notification.
3. Open an appointment notification.
4. Confirm both land on the intended item without extra navigation.

## Cross-Role Verification

### Request propagation

1. Submit a client request as a client user.
2. Confirm both groomer and admin receive a notification.
3. Open the request from the notification on both roles.
4. Update the request as groomer.
5. Confirm the client receives a notification and sees the update.

### Appointment propagation

1. Create an appointment as groomer.
2. Confirm the client receives an appointment notification.
3. Open the appointment from the client notification.
4. Confirm client view is read-only.

### Security and permissions

1. Confirm clients cannot access admin or groomer pages by URL.
2. Confirm groomers cannot access admin-only user management.
3. Confirm admins can access everything available to groomers plus admin pages.
