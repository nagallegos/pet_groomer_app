import { useEffect, useMemo, useState } from "react";
import { Button, Card, ListGroup } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppointmentFormModal from "../components/appointments/AppointmentFormModal";
import { useAppToast } from "../components/common/AppToastProvider";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PetFormModal from "../components/pets/PetFormModal";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import { archivePet, deletePet } from "../lib/crmApi";
import type { Pet } from "../types/models";

export default function PetDetailsPage() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const { petId } = useParams();

  const initialPet = useMemo(
    () => mockPets.find((item) => item.id === petId) ?? null,
    [petId],
  );

  const [pet, setPet] = useState<Pet | null>(initialPet);
  const [showEditPetModal, setShowEditPetModal] = useState(false);
  const [showDeletePetModal, setShowDeletePetModal] = useState(false);
  const [showArchivePetModal, setShowArchivePetModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    setPet(initialPet);
  }, [initialPet]);

  const owner = useMemo(
    () => mockOwners.find((item) => item.id === pet?.ownerId) ?? null,
    [pet],
  );

  const appointments = useMemo(
    () => mockAppointments.filter((appt) => appt.petId === petId),
    [petId],
  );

  if (!pet || !owner) {
    return <div>Pet not found.</div>;
  }

  return (
    <div>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Pet Profile</p>
          <h2 className="mb-1">{pet.name}</h2>
          <p className="text-muted mb-0">
            Owner:{" "}
            <Link to={`/clients/${owner.id}`}>
              {owner.firstName} {owner.lastName}
            </Link>
          </p>
        </div>

        <div className="page-actions d-flex gap-2 flex-wrap">
          <Button
            variant="outline-secondary"
            onClick={() => setShowEditPetModal(true)}
          >
            Edit Pet
          </Button>
          <Button
            variant="warning"
            className="action-button-wide"
            onClick={() => setShowArchivePetModal(true)}
          >
            Archive Pet
          </Button>
          <Button
            variant="outline-danger"
            className="icon-action-button"
            onClick={() => setShowDeletePetModal(true)}
            aria-label="Delete pet"
            title="Delete pet"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
              <path d="M6.5 1h3l.5 1H13a.5.5 0 0 1 0 1h-.6l-.7 9.1A2 2 0 0 1 9.7 14H6.3a2 2 0 0 1-2-1.9L3.6 3H3a.5.5 0 0 1 0-1h3zm-1.2 2 .7 9.1a1 1 0 0 0 1 .9h3.4a1 1 0 0 0 1-.9L10.7 3zM6 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 5m4.5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0M8 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 5" />
            </svg>
          </Button>
          <Button variant="primary" onClick={() => setShowScheduleModal(true)}>
            Schedule Appointment
          </Button>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Pet Information</Card.Title>
          <p className="mb-1">
            <strong>Species:</strong> {pet.species}
          </p>
          <p className="mb-1">
            <strong>Breed:</strong> {pet.breed}
          </p>
          <p className="mb-1">
            <strong>Weight:</strong> {pet.weightLbs ?? "—"} lbs
          </p>
          <p className="mb-1">
            <strong>Age:</strong> {pet.ageYears ?? "—"} years
          </p>
          <p className="mb-0">
            <strong>Color:</strong> {pet.color ?? "—"}
          </p>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title>Owner Information</Card.Title>
          <p className="mb-1">
            <strong>Name:</strong> {owner.firstName} {owner.lastName}
          </p>
          <p className="mb-1">
            <strong>Phone:</strong> {owner.phone}
          </p>
          <p className="mb-1">
            <strong>Email:</strong> {owner.email}
          </p>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Pet Appointment History</Card.Title>
          {appointments.length === 0 ? (
            <p className="text-muted mb-0">No appointment history.</p>
          ) : (
            <ListGroup>
              {appointments.map((appt) => (
                <ListGroup.Item key={appt.id}>
                  {new Date(appt.start).toLocaleString()} — {appt.status}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      <PetFormModal
        show={showEditPetModal}
        onHide={() => setShowEditPetModal(false)}
        owners={mockOwners}
        initialPet={pet}
        onSaved={(updatedPet) => {
          setPet(updatedPet);
          showToast({
            title: "Pet Updated",
            body: "Pet changes saved and ready for backend persistence.",
            variant: "success",
          });
          setShowEditPetModal(false);
        }}
      />

      <AppointmentFormModal
        show={showScheduleModal}
        onHide={() => setShowScheduleModal(false)}
        owners={mockOwners}
        pets={mockPets}
        initialOwnerId={owner.id}
        initialPetId={pet.id}
        onSaved={() => {
          showToast({
            title: "Appointment Scheduled",
            body: "The appointment was created and is ready for backend persistence.",
            variant: "success",
          });
        }}
      />

      <ConfirmDeleteModal
        show={showArchivePetModal}
        title="Archive Pet"
        body="Archiving removes this pet from the visible pet lists and active client views."
        note="Archived pet records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchivePetModal(false)}
        onConfirm={async () => {
          const result = await archivePet(pet);
          showToast({
            title: "Pet Archived",
            body:
              result.mode === "api"
                ? "Pet archived in backend."
                : "Pet archived in mock mode.",
            variant: "warning",
          });
          setShowArchivePetModal(false);
          navigate("/pets");
        }}
      />

      <ConfirmDeleteModal
        show={showDeletePetModal}
        title="Delete Pet"
        body="Deleting permanently removes this pet from the system."
        note="If you only want to hide this pet from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeletePetModal(false)}
        onConfirm={async () => {
          const result = await deletePet(pet);
          showToast({
            title: "Pet Deleted",
            body:
              result.mode === "api"
                ? "Pet deleted from backend."
                : "Pet deleted in mock mode.",
            variant: "warning",
          });
          setShowDeletePetModal(false);
          navigate("/pets");
        }}
      />
    </div>
  );
}
