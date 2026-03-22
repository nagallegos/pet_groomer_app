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
    version: "1.3.1",
    releasedOn: "2026-03-22",
    headline: "Release notes popup and quick-open version dock",
    notes: [
      {
        title: "Version notes now appear on new releases",
        details:
          "The app now shows a first-open release note popup when a new version is detected for a signed-in user.",
      },
      {
        title: "Version badge added to the bottom-right corner",
        details:
          "You can open the current release notes anytime from the floating version button in the app shell.",
      },
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
