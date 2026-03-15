## QA Test Users

Use these identities for end-to-end testing. They avoid real phone numbers and real personal email addresses.

### Staff

| Persona | Role | Device focus | First name | Last name | Email | Phone |
|---|---|---|---|---|---|---|
| Groomer Desktop | groomer | Desktop | Taylor | Brooks | qa.groomer.desktop@example.com | 555-010-1001 |
| Groomer Mobile | groomer | Mobile | Jordan | Ellis | qa.groomer.mobile@example.com | 555-010-1002 |

### Clients

| Persona | Role | Device focus | First name | Last name | Email | Phone |
|---|---|---|---|---|---|---|
| Client Desktop | client | Desktop | Avery | Lane | qa.client.desktop@example.com | 555-010-2001 |
| Client Mobile | client | Mobile | Riley | Morgan | qa.client.mobile@example.com | 555-010-2002 |

### Suggested Linked Client Records

Create two owner/client records first so the client app users can be linked on the Users page.

| Owner record | Email | Phone | Preferred contact |
|---|---|---|---|
| Avery Lane | qa.client.desktop@example.com | 555-010-2001 | email |
| Riley Morgan | qa.client.mobile@example.com | 555-010-2002 | email |

### Suggested Pets

| Owner | Pet name | Species | Breed | Weight | DOB |
|---|---|---|---|---|---|
| Avery Lane | Maple | Dog | Goldendoodle | 42 lb | 2021-04-15 |
| Avery Lane | Pepper | Cat | Domestic Shorthair | 11 lb | 2019-09-03 |
| Riley Morgan | Juniper | Dog | Australian Shepherd | 37 lb | 2022-01-28 |

### Creation Notes

1. Sign in as the admin account.
2. Create the owner/client records on the Clients page.
3. Create the related pets.
4. Open the Users page.
5. Create the two groomer users.
6. Create the two client users and link each one to the matching owner record.

### Optional Real Email Verification

If you want to verify actual outbound email for one path, temporarily use `gallegos.nick99@outlook.com` for a single QA user and switch the linked client record to that same email address. Keep the rest of the users on fake addresses.
