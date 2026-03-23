export interface ReleaseNoteItem {
  title: string;
  details: string;
}

export interface AppRelease {
  version: string;
  releasedOn: string;
  headline: string;
  notes: ReleaseNoteItem[];
}

// Semantic versioning: MAJOR.MINOR.PATCH
// Bump this entry and update the notes below whenever you want a new first-open release popup.
export const RELEASE_HISTORY: AppRelease[] = [
  {
    version: "1.3.2",
    releasedOn: "2026-03-23",
    headline: "App issue workflow and dark mode polish updates",
    notes: [
      {
        title: "App issues can be logged without selecting a client",
        details:
          "Staff can now submit app issues without tying them to a client, while regular client-related requests still keep their normal client requirement.",
      },
      {
        title: "App issue routing is now admin-focused",
        details:
          "App issue notifications now go to admins, and groomers no longer see the admin/dev app issue queue.",
      },
      {
        title: "Request cards now have a cleaner read-only view",
        details:
          "Opening an existing request no longer feels like editing by default, and request details now show in a true view mode until edit is chosen.",
      },
      {
        title: "Dark mode got another polish pass",
        details:
          "Theme cards, request indicators, notifications, client portal panels, pets accordion headers, and appointment history contact surfaces were adjusted to match the selected theme more cleanly.",
      },
      {
        title: "Mobile modal behavior is more comfortable",
        details:
          "Small-screen modals now have better safe-area spacing, an easier-to-hit close button, and improved scroll containment behind the modal.",
      },
    ],
  },
];

export const CURRENT_RELEASE = RELEASE_HISTORY[0];

export function getReleaseNotesSeenKey(userId: string, version: string) {
  return `bb-love-release-notes:${userId}:${version}`;
}
