import { useState } from "react";
import { Button, ListGroup, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { archiveOwner, deleteOwner } from "../../lib/crmApi";
import { useAppToast } from "../common/AppToastProvider";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import type { Appointment, Owner, Pet } from "../../types/models";

interface ClientQuickViewModalProps {
  show: boolean;
  owner: Owner | null;
  pets: Pet[];
  appointments: Appointment[];
  onHide: () => void;
  onOwnerArchived?: (ownerId: string) => void;
  onOwnerDeleted?: (ownerId: string) => void;
}

export default function ClientQuickViewModal({
  show,
  owner,
  pets,
  appointments,
  onHide,
  onOwnerArchived,
  onOwnerDeleted,
}: ClientQuickViewModalProps) {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  if (!owner) return null;

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Modal.Header closeButton>
        <Modal.Title>
          {owner.firstName} {owner.lastName}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="mb-4">
          <h6>Client Information</h6>
          <p className="mb-1">
            <strong>Phone:</strong> {owner.phone}
          </p>
          <p className="mb-1">
            <strong>Email:</strong> {owner.email}
          </p>
          <p className="mb-1">
            <strong>Preferred Contact:</strong> {owner.preferredContactMethod}
          </p>
        </div>

        <div className="mb-4">
          <h6>Notes</h6>
          {owner.notes.length === 0 ? (
            <p className="text-muted mb-0">No client notes.</p>
          ) : (
            <ListGroup>
              {owner.notes.map((note) => (
                <ListGroup.Item key={note.id}>{note.text}</ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>

        <div className="mb-4">
          <h6>Pets</h6>
          {pets.length === 0 ? (
            <p className="text-muted mb-0">No pets on file.</p>
          ) : (
            <ListGroup>
              {pets.map((pet) => (
                <ListGroup.Item key={pet.id}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{pet.name}</strong> — {pet.species}, {pet.breed}
                    </div>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => {
                        onHide();
                        navigate(`/pets/${pet.id}`);
                      }}
                    >
                      Open Pet
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>

        <div>
          <h6>Appointment History</h6>
          {appointments.length === 0 ? (
            <p className="text-muted mb-0">No appointments yet.</p>
          ) : (
            <ListGroup>
              {appointments.map((appt) => (
                <ListGroup.Item key={appt.id}>
                  {new Date(appt.start).toLocaleString()} — {appt.status}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="outline-primary"
          onClick={() => {
            onHide();
            navigate("/schedule");
          }}
        >
          Schedule Appointment
        </Button>
        <Button
          variant="outline-secondary"
          onClick={() => {
            onHide();
            navigate(`/clients/${owner.id}`);
          }}
        >
          Edit Client
        </Button>
        <Button
          variant="warning"
          className="action-button-wide"
          onClick={() => setShowArchiveModal(true)}
        >
          Archive Client
        </Button>
        <Button
          variant="outline-danger"
          className="icon-action-button"
          onClick={() => setShowDeleteModal(true)}
          aria-label="Delete client"
          title="Delete client"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
            <path d="M6.5 1h3l.5 1H13a.5.5 0 0 1 0 1h-.6l-.7 9.1A2 2 0 0 1 9.7 14H6.3a2 2 0 0 1-2-1.9L3.6 3H3a.5.5 0 0 1 0-1h3zm-1.2 2 .7 9.1a1 1 0 0 0 1 .9h3.4a1 1 0 0 0 1-.9L10.7 3zM6 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 5m4.5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0M8 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 5" />
          </svg>
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onHide();
            navigate(`/clients/${owner.id}`);
          }}
        >
          Full Client Page
        </Button>
      </Modal.Footer>

      <ConfirmDeleteModal
        show={showArchiveModal}
        title="Archive Client"
        body="Archiving removes this client from the visible client lists and related active views."
        note="Archived client records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchiveModal(false)}
        onConfirm={async () => {
          const result = await archiveOwner(owner);
          showToast({
            title: "Client Archived",
            body:
              result.mode === "api"
                ? "Client archived in backend."
                : "Client archived in mock mode.",
            variant: "warning",
          });
          onOwnerArchived?.(owner.id);
          setShowArchiveModal(false);
          onHide();
        }}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete Client"
        body="Deleting permanently removes this client from the system."
        note="If you only want to hide this client from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const result = await deleteOwner(owner);
          showToast({
            title: "Client Deleted",
            body:
              result.mode === "api"
                ? "Client deleted from backend."
                : "Client deleted in mock mode.",
            variant: "warning",
          });
          onOwnerDeleted?.(owner.id);
          setShowDeleteModal(false);
          onHide();
        }}
      />
    </Modal>
  );
}
