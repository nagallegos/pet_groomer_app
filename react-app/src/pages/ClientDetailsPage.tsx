import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, ListGroup, Row } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppointmentFormModal from "../components/appointments/AppointmentFormModal";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import ClientFormModal from "../components/clients/ClientFormModal";
import { useAppToast } from "../components/common/AppToastProvider";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import PetFormModal from "../components/pets/PetFormModal";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import useInitialLoading from "../hooks/useInitialLoading";
import { archiveOwner, archivePet, deleteOwner, deletePet } from "../lib/crmApi";
import type { Appointment, Owner, Pet } from "../types/models";

export default function ClientDetailsPage() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const { clientId } = useParams();

  const initialOwner = useMemo(
    () => mockOwners.find((item) => item.id === clientId) ?? null,
    [clientId],
  );

  const initialPets = useMemo(
    () => mockPets.filter((pet) => pet.ownerId === clientId),
    [clientId],
  );

  const appointments = useMemo(
    () => mockAppointments.filter((appt) => appt.ownerId === clientId),
    [clientId],
  );

  const [owner, setOwner] = useState<Owner | null>(initialOwner);
  const [pets, setPets] = useState<Pet[]>(initialPets);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showEditPetModal, setShowEditPetModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [showArchiveClientModal, setShowArchiveClientModal] = useState(false);
  const [showDeletePetModal, setShowDeletePetModal] = useState(false);
  const [showArchivePetModal, setShowArchivePetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [clientAppointments, setClientAppointments] =
    useState<Appointment[]>(appointments);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] =
    useState(false);

  useEffect(() => {
    setOwner(initialOwner);
  }, [initialOwner]);

  useEffect(() => {
    setPets(initialPets);
  }, [initialPets]);

  useEffect(() => {
    setClientAppointments(appointments);
  }, [appointments]);

  if (isLoading) {
    return <PageLoader label="Loading client profile..." />;
  }

  if (!owner) {
    return <div>Client not found.</div>;
  }

  return (
    <div>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Client Profile</p>
          <h2 className="mb-1">
            {owner.firstName} {owner.lastName}
          </h2>
          <p className="text-muted mb-0">Client record and pet history</p>
        </div>

        <div className="page-actions d-flex gap-2 flex-wrap">
          <Button
            variant="outline-secondary"
            onClick={() => setShowEditClientModal(true)}
          >
            Edit Client
          </Button>
          <Button
            variant="warning"
            className="action-button-wide"
            onClick={() => setShowArchiveClientModal(true)}
          >
            Archive Client
          </Button>
          <Button
            variant="outline-danger"
            className="icon-action-button"
            onClick={() => setShowDeleteClientModal(true)}
            aria-label="Delete client"
            title="Delete client"
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

      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Owner Information</Card.Title>
              <p className="mb-1">
                <strong>Phone:</strong> {owner.phone}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {owner.email}
              </p>
              <p className="mb-1">
                <strong>Address:</strong> {owner.address ?? "—"}
              </p>
              <p className="mb-3">
                <strong>Preferred Contact:</strong> {owner.preferredContactMethod}
              </p>

              <h6>Notes</h6>
              {owner.notes.length === 0 ? (
                <p className="text-muted mb-0">No notes.</p>
              ) : (
                <ListGroup>
                  {owner.notes.map((note) => (
                    <ListGroup.Item key={note.id}>{note.text}</ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title className="mb-0">Pets</Card.Title>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSelectedPet(null);
                    setShowEditPetModal(true);
                  }}
                >
                  Add Pet
                </Button>
              </div>

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
                        <div className="d-flex gap-2">
                          <Link to={`/pets/${pet.id}`}>
                            <Button size="sm" variant="outline-primary">
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => {
                              setSelectedPet(pet);
                              setShowEditPetModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="warning"
                            className="action-button-wide"
                            onClick={() => {
                              setSelectedPet(pet);
                              setShowArchivePetModal(true);
                            }}
                          >
                            Archive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            className="icon-action-button"
                            onClick={() => {
                              setSelectedPet(pet);
                              setShowDeletePetModal(true);
                            }}
                            aria-label={`Delete ${pet.name}`}
                            title={`Delete ${pet.name}`}
                          >
                            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                              <path d="M6.5 1h3l.5 1H13a.5.5 0 0 1 0 1h-.6l-.7 9.1A2 2 0 0 1 9.7 14H6.3a2 2 0 0 1-2-1.9L3.6 3H3a.5.5 0 0 1 0-1h3zm-1.2 2 .7 9.1a1 1 0 0 0 1 .9h3.4a1 1 0 0 0 1-.9L10.7 3zM6 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 5m4.5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0M8 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 5" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Appointment History</Card.Title>

              {clientAppointments.length === 0 ? (
                <p className="text-muted mb-0">No appointment history.</p>
              ) : (
                <ListGroup>
                  {clientAppointments.map((appt) => {
                    const pet = mockPets.find((p) => p.id === appt.petId);

                    return (
                      <ListGroup.Item
                        key={appt.id}
                        action
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setShowAppointmentDetailsModal(true);
                        }}
                      >
                        <strong>{pet?.name ?? "Unknown Pet"}</strong> —{" "}
                        {new Date(appt.start).toLocaleString()} — {appt.status}
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ClientFormModal
        show={showEditClientModal}
        onHide={() => setShowEditClientModal(false)}
        initialOwner={owner}
        onSaved={(updatedOwner) => {
          setOwner(updatedOwner);
          showToast({
            title: "Client Updated",
            body: "Client changes saved and ready for backend persistence.",
            variant: "success",
          });
          setShowEditClientModal(false);
        }}
      />

      <PetFormModal
        show={showEditPetModal}
        onHide={() => setShowEditPetModal(false)}
        owners={mockOwners}
        initialPet={selectedPet}
        onSaved={(updatedPet) => {
          setPets((currentPets) => {
            const existingPetIndex = currentPets.findIndex(
              (pet) => pet.id === updatedPet.id,
            );

            if (existingPetIndex === -1) {
              return [...currentPets, updatedPet];
            }

            return currentPets.map((pet) =>
              pet.id === updatedPet.id ? updatedPet : pet,
            );
          });
          showToast({
            title: selectedPet ? "Pet Updated" : "Pet Added",
            body: selectedPet
              ? "Pet changes saved and ready for backend persistence."
              : "Pet created and ready for backend persistence.",
            variant: "success",
          });
          setShowEditPetModal(false);
          setSelectedPet(null);
        }}
      />

      <AppointmentFormModal
        show={showScheduleModal}
        onHide={() => setShowScheduleModal(false)}
        owners={mockOwners}
        pets={pets}
        initialOwnerId={owner.id}
        onSaved={() => {
          showToast({
            title: "Appointment Scheduled",
            body: "The appointment was created and is ready for backend persistence.",
            variant: "success",
          });
        }}
      />

      <AppointmentDetailsModal
        show={showAppointmentDetailsModal}
        onHide={() => {
          setShowAppointmentDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        owners={mockOwners}
        pets={mockPets}
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setClientAppointments((currentAppointments) =>
              currentAppointments.filter(
                (appointment) => appointment.id !== updatedAppointment.id,
              ),
            );
            setSelectedAppointment(null);
            setShowAppointmentDetailsModal(false);
            return;
          }

          setClientAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === updatedAppointment.id
                ? updatedAppointment
                : appointment,
            ),
          );
          setSelectedAppointment(updatedAppointment);
        }}
        onDeleted={(appointmentId) => {
          setClientAppointments((currentAppointments) =>
            currentAppointments.filter(
              (appointment) => appointment.id !== appointmentId,
            ),
          );
          setSelectedAppointment(null);
          setShowAppointmentDetailsModal(false);
        }}
      />

      <ConfirmDeleteModal
        show={showArchiveClientModal}
        title="Archive Client"
        body="Archiving removes this client from the visible client lists and related active views."
        note="Archived client records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchiveClientModal(false)}
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
          setShowArchiveClientModal(false);
          navigate("/contacts");
        }}
      />

      <ConfirmDeleteModal
        show={showDeleteClientModal}
        title="Delete Client"
        body="Deleting permanently removes this client from the system."
        note="If you only want to hide this client from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeleteClientModal(false)}
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
          setShowDeleteClientModal(false);
          navigate("/contacts");
        }}
      />

      <ConfirmDeleteModal
        show={showArchivePetModal}
        title="Archive Pet"
        body="Archiving removes this pet from the visible pet lists and active client views."
        note="Archived pet records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => {
          setShowArchivePetModal(false);
          setSelectedPet(null);
        }}
        onConfirm={async () => {
          if (!selectedPet) return;
          const result = await archivePet(selectedPet);
          setPets((currentPets) =>
            currentPets.filter((pet) => pet.id !== result.data.id),
          );
          showToast({
            title: "Pet Archived",
            body:
              result.mode === "api"
                ? "Pet archived in backend."
                : "Pet archived in mock mode.",
            variant: "warning",
          });
          setShowArchivePetModal(false);
          setSelectedPet(null);
        }}
      />

      <ConfirmDeleteModal
        show={showDeletePetModal}
        title="Delete Pet"
        body="Deleting permanently removes this pet from the system."
        note="If you only want to hide this pet from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => {
          setShowDeletePetModal(false);
          setSelectedPet(null);
        }}
        onConfirm={async () => {
          if (!selectedPet) return;
          const result = await deletePet(selectedPet);
          setPets((currentPets) =>
            currentPets.filter((pet) => pet.id !== result.data.id),
          );
          showToast({
            title: "Pet Deleted",
            body:
              result.mode === "api"
                ? "Pet deleted from backend."
                : "Pet deleted in mock mode.",
            variant: "warning",
          });
          setShowDeletePetModal(false);
          setSelectedPet(null);
        }}
      />
    </div>
  );
}
