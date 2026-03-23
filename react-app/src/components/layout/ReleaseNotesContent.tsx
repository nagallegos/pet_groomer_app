import type { AppRelease } from "../../lib/releaseNotes";

interface ReleaseNotesContentProps {
  release: AppRelease;
}

export default function ReleaseNotesContent({ release }: ReleaseNotesContentProps) {
  return (
    <>
      <div className="release-notes-header">
        <span className="release-notes-kicker">Version Update</span>
        <div className="h4 mb-0">What&apos;s New in v{release.version}</div>
        <div className="text-muted small">
          {release.releasedOn} | {release.headline}
        </div>
      </div>
      <div className="release-notes-list">
        {release.notes.map((note) => (
          <div key={note.title} className="release-note-card">
            <div className="release-note-title">{note.title}</div>
            <div className="release-note-detail">{note.details}</div>
          </div>
        ))}
      </div>
    </>
  );
}
