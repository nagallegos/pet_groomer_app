import { Button, Modal } from "react-bootstrap";

interface ConfirmDeleteModalProps {
  show: boolean;
  title: string;
  body: string;
  note?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmVariant?: string;
}

export default function ConfirmDeleteModal({
  show,
  title,
  body,
  note,
  onCancel,
  onConfirm,
  confirmLabel = "Delete",
  confirmVariant = "danger",
}: ConfirmDeleteModalProps) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="fw-semibold mb-2">Are you sure you would like to continue?</p>
        <p className="mb-0">{body}</p>
        {note && <p className="text-muted small mt-3 mb-0">{note}</p>}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Keep It
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
