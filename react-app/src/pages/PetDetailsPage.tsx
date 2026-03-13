import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Dropdown, Form, ListGroup, Row, Spinner } from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppointmentFormModal from "../components/appointments/AppointmentFormModal";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import { useAppData } from "../components/common/AppDataProvider";
import { useAppToast } from "../components/common/AppToastProvider";
import ClientContactActions from "../components/common/ClientContactActions";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import useInitialLoading from "../hooks/useInitialLoading";
import {
  archivePet,
  deletePet,
  isBackendConfigured,
  savePet,
  type PetUpsertInput,
} from "../lib/crmApi";
import type { Appointment, Pet, Species } from "../types/models";

export default function PetDetailsPage() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const {
    owners,
    pets,
    appointments: allAppointments,
    setPets,
    setAppointments,
  } = useAppData();
  const { petId } = useParams();

  const initialPet = useMemo(
    () => pets.find((item) => item.id === petId) ?? null,
    [petId, pets],
  );

  const [pet, setPet] = useState<Pet | null>(initialPet);
  const [showDeletePetModal, setShowDeletePetModal] = useState(false);
  const [showArchivePetModal, setShowArchivePetModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [petAppointments, setPetAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] =
    useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const originalNotes = pet?.notes.map((note) => note.text).join("\n") ?? "";

  useEffect(() => {
    setPet(initialPet);
  }, [initialPet]);

  const owner = useMemo(
    () => owners.find((item) => item.id === pet?.ownerId) ?? null,
    [owners, pet],
  );

  const appointments = useMemo(
    () => allAppointments.filter((appt) => appt.petId === petId && !appt.isArchived),
    [allAppointments, petId],
  );

  useEffect(() => {
    setPetAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    if (!pet) {
      return;
    }

    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed);
    setWeightLbs(pet.weightLbs?.toString() ?? "");
    setAgeYears(pet.ageYears?.toString() ?? "");
    setColor(pet.color ?? "");
    setNotes(pet.notes.map((note) => note.text).join("\n"));
    setSaveError(null);
  }, [pet]);

  if (isLoading) {
    return <PageLoader label="Loading pet profile..." />;
  }

  if (!pet || !owner) {
    return <div>Pet not found.</div>;
  }

  const handleSavePet = async () => {
    setIsSavingPet(true);
    setSaveError(null);

    const payload: PetUpsertInput = {
      ownerId: pet.ownerId,
      name,
      species,
      breed,
      weightLbs: weightLbs ? Number(weightLbs) : undefined,
      ageYears: ageYears ? Number(ageYears) : undefined,
      color,
    };

    if (notes !== originalNotes) {
      payload.notes = notes;
    }

    try {
      const result = await savePet(payload, pet);
      setPet(result.data);
      setPets((currentPets) =>
        currentPets.map((currentPet) =>
          currentPet.id === result.data.id ? result.data : currentPet,
        ),
      );
      showToast({
        title: "Pet Updated",
        body:
          result.mode === "api"
            ? "Pet updated in backend."
            : "Pet changes saved in mock mode.",
        variant: "success",
      });
      setIsEditMode(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save pet changes.",
      );
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleCancelEdit = () => {
    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed);
    setWeightLbs(pet.weightLbs?.toString() ?? "");
    setAgeYears(pet.ageYears?.toString() ?? "");
    setColor(pet.color ?? "");
    setNotes(pet.notes.map((note) => note.text).join("\n"));
    setSaveError(null);
    setIsEditMode(false);
  };

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

        <div className="page-actions d-flex gap-2 flex-wrap align-items-center">
          <span className={`mode-indicator${isEditMode ? " mode-indicator-edit" : ""}`}>
            {isEditMode ? "Edit Mode" : "View Mode"}
          </span>

          {isEditMode ? (
            <>
              <Button
                variant="outline-secondary"
                onClick={handleCancelEdit}
                disabled={isSavingPet}
              >
                Cancel Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSavePet()}
                disabled={isSavingPet}
              >
                {isSavingPet && (
                  <Spinner animation="border" size="sm" className="me-2" />
                )}
                Save Pet
              </Button>
            </>
          ) : (
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-secondary">
                Actions
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setIsEditMode(true)}>
                  Edit Pet
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowScheduleModal(true)}>
                  Schedule Appointment
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => setShowArchivePetModal(true)}>
                  Archive Pet
                </Dropdown.Item>
                <Dropdown.Item
                  className="text-danger"
                  onClick={() => setShowDeletePetModal(true)}
                >
                  Delete Pet
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>

      <Row className="g-4">
        <div className="col-lg-5">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Pet Information</Card.Title>

              {isEditMode ? (
                <>
                  {!isBackendConfigured() && (
                    <Alert variant="info" className="mb-3">
                      Backend not configured yet. Saves are currently local UI previews only.
                    </Alert>
                  )}

                  {saveError && (
                    <Alert variant="danger" className="mb-3">
                      {saveError}
                    </Alert>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>Pet Name</Form.Label>
                    <Form.Control
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Species</Form.Label>
                    <Form.Select
                      value={species}
                      onChange={(event) => setSpecies(event.target.value as Species)}
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Breed</Form.Label>
                    <Form.Control
                      value={breed}
                      onChange={(event) => setBreed(event.target.value)}
                    />
                  </Form.Group>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <Form.Group>
                        <Form.Label>Weight (lbs)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.1"
                          value={weightLbs}
                          onChange={(event) => setWeightLbs(event.target.value)}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-sm-6">
                      <Form.Group>
                        <Form.Label>Age (years)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="1"
                          value={ageYears}
                          onChange={(event) => setAgeYears(event.target.value)}
                        />
                      </Form.Group>
                    </div>
                  </div>

                  <Form.Group className="mt-3 mb-3">
                    <Form.Label>Color</Form.Label>
                    <Form.Control
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label>Pet Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </Form.Group>
                </>
              ) : (
                <>
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
                  <p className="mb-3">
                    <strong>Color:</strong> {pet.color ?? "—"}
                  </p>

                  <h6>Notes</h6>
                  {pet.notes.length === 0 ? (
                    <p className="text-muted mb-0">No pet notes.</p>
                  ) : (
                    <ListGroup>
                      {pet.notes.map((note) => (
                        <ListGroup.Item key={note.id}>{note.text}</ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-lg-7">
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Owner Information</Card.Title>
              <p className="mb-1">
                <strong>Name:</strong> {owner.firstName} {owner.lastName}
              </p>
              <p className="mb-1">
                <strong>Contact:</strong>
              </p>
              <ClientContactActions phone={owner.phone} email={owner.email} stacked />
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Pet Appointment History</Card.Title>
              {petAppointments.length === 0 ? (
                <p className="text-muted mb-0">No appointment history.</p>
              ) : (
                <ListGroup>
                  {petAppointments.map((appt) => (
                    <ListGroup.Item
                      key={appt.id}
                      action
                      onClick={() => {
                        setSelectedAppointment(appt);
                        setShowAppointmentDetailsModal(true);
                      }}
                    >
                      {new Date(appt.start).toLocaleString()} — {appt.status}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>
      </Row>

      <AppointmentFormModal
        show={showScheduleModal}
        onHide={() => setShowScheduleModal(false)}
        owners={owners}
        pets={pets}
        initialOwnerId={owner.id}
        initialPetId={pet.id}
        onSaved={(appointment) => {
          setAppointments((currentAppointments) => [
            ...currentAppointments,
            appointment,
          ]);
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
        owners={owners}
        pets={pets}
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setAppointments((currentAppointments) =>
              currentAppointments.map((appointment) =>
                appointment.id === updatedAppointment.id
                  ? updatedAppointment
                  : appointment,
              ),
            );
            setPetAppointments((currentAppointments) =>
              currentAppointments.filter(
                (appointment) => appointment.id !== updatedAppointment.id,
              ),
            );
            setSelectedAppointment(null);
            setShowAppointmentDetailsModal(false);
            return;
          }

          setAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === updatedAppointment.id
                ? updatedAppointment
                : appointment,
            ),
          );
          setPetAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === updatedAppointment.id
                ? updatedAppointment
                : appointment,
            ),
          );
          setSelectedAppointment(updatedAppointment);
        }}
        onDeleted={(appointmentId) => {
          setAppointments((currentAppointments) =>
            currentAppointments.filter(
              (appointment) => appointment.id !== appointmentId,
            ),
          );
          setPetAppointments((currentAppointments) =>
            currentAppointments.filter(
              (appointment) => appointment.id !== appointmentId,
            ),
          );
          setSelectedAppointment(null);
          setShowAppointmentDetailsModal(false);
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
          setPets((currentPets) =>
            currentPets.map((currentPet) =>
              currentPet.id === result.data.id ? result.data : currentPet,
            ),
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
          setPets((currentPets) =>
            currentPets.filter((currentPet) => currentPet.id !== result.data.id),
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
          navigate("/pets");
        }}
      />
    </div>
  );
}
