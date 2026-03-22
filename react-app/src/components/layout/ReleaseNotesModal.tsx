import { Button, Modal } from "react-bootstrap";
import type { AppRelease } from "../../lib/releaseNotes";

interface ReleaseNotesModalProps {
  show: boolean;
  release: AppRelease;
  onClose: () => void;
}

export default function ReleaseNotesModal({
  show,
  release,
  onClose,
}: ReleaseNotesModalProps) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <div className="release-notes-header">
          <span className="release-notes-kicker">Version Update</span>
          <Modal.Title>What&apos;s New in v{release.version}</Modal.Title>
          <div className="text-muted small">
            {release.releasedOn} · {release.headline}
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="release-notes-body">
        <div className="release-notes-list">
          {release.notes.map((note) => (
            <div key={note.title} className="release-note-card">
              <div className="release-note-title">{note.title}</div>
              <div className="release-note-detail">{note.details}</div>
            </div>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
