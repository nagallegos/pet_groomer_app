# QA Requirements Log Template

Turn every issue found during QA into a requirement. Do not log issues as vague bugs only.

## Requirement Format

### Title

Short name describing the problem and target behavior.

### Context

- Role:
- Device:
- Page or modal:
- Current behavior:
- Why it is a problem:

### Requirement

State the desired behavior clearly.

Example:

`The mobile request notification dropdown must open the selected request directly in its view modal so the user does not have to locate it manually in the request list.`

### Acceptance Criteria

1. Given ...
2. When ...
3. Then ...

### Design Notes

- readability concerns
- spacing or visual hierarchy concerns
- naming or wording concerns
- permission or security concerns

### Priority

- Critical
- High
- Medium
- Low

## Example Entry

### Title

Client request type badge needs stronger contrast in dark mode

### Context

- Role: Groomer
- Device: Mobile
- Page or modal: Requests page
- Current behavior: The profile update badge blends into the card background in dark mode.
- Why it is a problem: Request type is not easy to identify at a glance.

### Requirement

The Requests page must use request type badges with sufficient contrast in both light and dark mode so staff can quickly distinguish request categories.

### Acceptance Criteria

1. Given the Requests page in light mode, when request cards are shown, then each request type badge is readable at normal viewing distance.
2. Given the Requests page in dark mode, when request cards are shown, then each request type badge keeps at least the same readability and does not blend into the card.
3. Given mixed request types in a list, when staff scans the page, then request types can be distinguished without opening the request.
