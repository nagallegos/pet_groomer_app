import { Button, Modal } from "react-bootstrap";
import type { AppRelease } from "../../lib/releaseNotes";
import ReleaseNotesContent from "./ReleaseNotesContent";

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
        <Modal.Title>Release Notes</Modal.Title>
      </Modal.Header>
      <Modal.Body className="release-notes-body">
        <ReleaseNotesContent release={release} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          Continue
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
