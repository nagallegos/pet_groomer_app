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
    version: "1.3.0",
    releasedOn: "2026-03-22",
    headline: "Client contact updates and notification controls",
    notes: [
      {
        title: "Client contacts can be added without email or phone",
        details:
          "Owner records now save even when contact details are incomplete, which fits Facebook Messenger and partial intake workflows better.",
      },
      {
        title: "Messenger is now a preferred contact method",
        details:
          "New and existing client contacts can be marked with Messenger as the preferred way to reach them.",
      },
      {
        title: "User email notifications respect account preferences",
        details:
          "Staff and client users can keep their account active while turning notification emails on or off from their settings.",
      },
    ],
  },
];

export const CURRENT_RELEASE = RELEASE_HISTORY[0];

export function getReleaseNotesSeenKey(userId: string, version: string) {
  return `bb-love-release-notes:${userId}:${version}`;
}
