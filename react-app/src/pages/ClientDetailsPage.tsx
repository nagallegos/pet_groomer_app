import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Collapse, Dropdown, Form, ListGroup, Modal, Row, Spinner } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import AppointmentFormModal from "../components/appointments/AppointmentFormModal";
import { useAppData } from "../components/common/AppDataProvider";
import { useAppToast } from "../components/common/AppToastProvider";
import ClientContactActions from "../components/common/ClientContactActions";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import PetFormModal from "../components/pets/PetFormModal";
import PetQuickViewModal from "../components/pets/PetQuickViewModal";
import useInitialLoading from "../hooks/useInitialLoading";
import {
  addAppointmentNote,
  addOwnerNote,
  addPetNote,
  archiveAppointmentNote,
  archiveOwner,
  archiveOwnerNote,
  archivePet,
  archivePetNote,
  deleteAppointmentNoteItem,
  deleteOwner,
  deleteOwnerNoteItem,
  deletePet,
  deletePetNoteItem,
  isBackendConfigured,
  saveOwner,
  unarchiveAppointmentNote,
  unarchiveOwnerNote,
  unarchivePetNote,
  updateAppointmentNote,
  updateOwnerNote,
  updatePetNote,
  type OwnerUpsertInput,
} from "../lib/crmApi";
import { getNotePostedByLabel } from "../lib/noteUtils";
import { getCompactBreedLabel } from "../lib/petBreeds";
import type { Appointment, ContactMethod, NoteVisibility, Owner, Pet } from "../types/models";

type ClientNoteEntityType = "client" | "pet" | "appointment";

interface ClientTimelineNote {
  id: string;
  entityId: string;
  entityType: ClientNoteEntityType;
  entityLabel: string;
  text: string;
  visibility: NoteVisibility;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export default function ClientDetailsPage() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const {
    owners,
    pets: allPets,
    appointments: allAppointments,
    setOwners,
    setPets: setAllPets,
    setAppointments: setAllAppointments,
  } = useAppData();
  const { clientId } = useParams();

  const initialOwner = useMemo(() => owners.find((item) => item.id === clientId) ?? null, [clientId, owners]);
  const initialPets = useMemo(() => allPets.filter((pet) => pet.ownerId === clientId && !pet.isArchived), [allPets, clientId]);
  const appointments = useMemo(() => allAppointments.filter((appt) => appt.ownerId === clientId && !appt.isArchived), [allAppointments, clientId]);

  const [owner, setOwner] = useState<Owner | null>(initialOwner);
  const [pets, setPets] = useState<Pet[]>(initialPets);
  const [showEditPetModal, setShowEditPetModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [showArchiveClientModal, setShowArchiveClientModal] = useState(false);
  const [showDeletePetModal, setShowDeletePetModal] = useState(false);
  const [showArchivePetModal, setShowArchivePetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [viewingPet, setViewingPet] = useState<Pet | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>(appointments);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<ContactMethod>("text");
  const [address, setAddress] = useState("");
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNoteEntityType, setSelectedNoteEntityType] = useState<ClientNoteEntityType>("client");
  const [selectedNoteEntityId, setSelectedNoteEntityId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>("internal");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [isApplyingNoteAction, setIsApplyingNoteAction] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showQuickEditNoteModal, setShowQuickEditNoteModal] = useState(false);
  const [quickEditNote, setQuickEditNote] = useState<ClientTimelineNote | null>(null);
  const [quickEditText, setQuickEditText] = useState("");
  const [quickEditVisibility, setQuickEditVisibility] = useState<NoteVisibility>("internal");

  useEffect(() => setOwner(initialOwner), [initialOwner]);
  useEffect(() => setPets(initialPets), [initialPets]);
  useEffect(() => setClientAppointments(appointments), [appointments]);

  useEffect(() => {
    if (!owner) return;
    setFirstName(owner.firstName);
    setLastName(owner.lastName);
    setPhone(owner.phone);
    setEmail(owner.email);
    setPreferredContactMethod(owner.preferredContactMethod);
    setAddress(owner.address ?? "");
    setSaveError(null);
    setSelectedNoteEntityId(owner.id);
  }, [owner]);

  const timelineNotes = useMemo<ClientTimelineNote[]>(
    () =>
      owner
        ? [
            ...owner.notes.map((note) => ({
              id: note.id,
              entityId: owner.id,
              entityType: "client" as const,
              entityLabel: `${owner.firstName} ${owner.lastName}`,
              text: note.text,
              visibility: note.visibility,
              createdByUserId: note.createdByUserId,
              createdByName: note.createdByName,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
              isArchived: note.isArchived,
              archivedAt: note.archivedAt,
            })),
            ...pets.flatMap((pet) =>
              pet.notes.map((note) => ({
                id: note.id,
                entityId: pet.id,
                entityType: "pet" as const,
                entityLabel: pet.name,
                text: note.text,
                visibility: note.visibility,
                createdByUserId: note.createdByUserId,
                createdByName: note.createdByName,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                isArchived: note.isArchived,
                archivedAt: note.archivedAt,
              })),
            ),
            ...clientAppointments.flatMap((appointment) => {
              const appointmentPet = pets.find((pet) => pet.id === appointment.petId);
              return appointment.notes.map((note) => ({
                id: note.id,
                entityId: appointment.id,
                entityType: "appointment" as const,
                entityLabel: `${appointmentPet?.name ?? "Pet"} | ${new Date(appointment.start).toLocaleDateString()}`,
                text: note.text,
                visibility: note.visibility,
                createdByUserId: note.createdByUserId,
                createdByName: note.createdByName,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                isArchived: note.isArchived,
                archivedAt: note.archivedAt,
              }));
            }),
          ].sort(
            (left, right) =>
              new Date(right.updatedAt ?? right.createdAt).getTime() -
              new Date(left.updatedAt ?? left.createdAt).getTime(),
          )
        : [],
    [clientAppointments, owner, pets],
  );

  const activeTimelineNotes = useMemo(() => timelineNotes.filter((note) => !note.isArchived), [timelineNotes]);
  const archivedTimelineNotes = useMemo(() => timelineNotes.filter((note) => note.isArchived), [timelineNotes]);
  const activeClientNotes = useMemo(() => owner?.notes.filter((note) => !note.isArchived) ?? [], [owner]);
  const previewClientNotes = useMemo(() => activeClientNotes.slice(0, 3), [activeClientNotes]);
  const viewingPetAppointments = useMemo(
    () => (viewingPet ? clientAppointments.filter((appointment) => appointment.petId === viewingPet.id) : []),
    [clientAppointments, viewingPet],
  );
  const relatedPetSummary = useMemo(() => {
    if (pets.length === 0) {
      return "No pets on file.";
    }
    return pets.map((pet) => pet.name).join(", ");
  }, [pets]);

  if (isLoading) {
    return <PageLoader label="Loading client profile..." />;
  }

  if (!owner) {
    return <div>Client not found.</div>;
  }

  const replaceOwnerInState = (updatedOwner: Owner) => {
    setOwner(updatedOwner);
    setOwners((currentOwners) =>
      currentOwners.map((currentOwner) => (currentOwner.id === updatedOwner.id ? updatedOwner : currentOwner)),
    );
  };

  const replacePetInState = (updatedPet: Pet) => {
    setAllPets((currentPets) => currentPets.map((pet) => (pet.id === updatedPet.id ? updatedPet : pet)));
    setPets((currentPets) => currentPets.map((pet) => (pet.id === updatedPet.id ? updatedPet : pet)));
    setSelectedPet((currentPet) => (currentPet?.id === updatedPet.id ? updatedPet : currentPet));
    setViewingPet((currentPet) => (currentPet?.id === updatedPet.id ? updatedPet : currentPet));
  };

  const replaceAppointmentInState = (updatedAppointment: Appointment) => {
    setAllAppointments((currentAppointments) =>
      currentAppointments.map((appointment) =>
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment,
      ),
    );
    setClientAppointments((currentAppointments) =>
      currentAppointments.map((appointment) =>
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment,
      ),
    );
    setSelectedAppointment((currentAppointment) =>
      currentAppointment?.id === updatedAppointment.id ? updatedAppointment : currentAppointment,
    );
  };

  const handleSaveClient = async () => {
    setIsSavingClient(true);
    setSaveError(null);

    const payload: OwnerUpsertInput = {
      firstName,
      lastName,
      phone,
      email,
      preferredContactMethod,
      address,
    };

    try {
      const result = await saveOwner(payload, owner);
      replaceOwnerInState({ ...result.data, notes: owner.notes });
      showToast({
        title: "Client Updated",
        body: result.mode === "api" ? "Client updated in backend." : "Client changes saved in mock mode.",
        variant: "success",
      });
      setIsEditMode(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save client changes.");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleCancelEdit = () => {
    setFirstName(owner.firstName);
    setLastName(owner.lastName);
    setPhone(owner.phone);
    setEmail(owner.email);
    setPreferredContactMethod(owner.preferredContactMethod);
    setAddress(owner.address ?? "");
    setSaveError(null);
    setIsEditMode(false);
  };

  const resetNotesEditor = () => {
    setSelectedNoteEntityType("client");
    setSelectedNoteEntityId(owner.id);
    setNoteText("");
    setNoteVisibility("internal");
    setNoteSaveError(null);
  };

  const openNewNoteEditor = () => {
    setSelectedNoteEntityType("client");
    setSelectedNoteEntityId(owner.id);
    setNoteText("");
    setNoteSaveError(null);
    setShowAddNoteModal(true);
  };

  const openEditNoteEditor = (note: ClientTimelineNote) => {
    setQuickEditNote(note);
    setQuickEditText(note.text);
    setQuickEditVisibility(note.visibility);
    setNoteSaveError(null);
    setShowQuickEditNoteModal(true);
  };

  const closeQuickEditNoteModal = () => {
    setShowQuickEditNoteModal(false);
    setQuickEditNote(null);
    setQuickEditText("");
    setQuickEditVisibility("internal");
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      return;
    }

    setIsSavingNote(true);
    setNoteSaveError(null);

    try {
      if (selectedNoteEntityType === "client") {
        const result = await addOwnerNote(owner, noteText.trim(), noteVisibility);
        replaceOwnerInState(result.data);
      } else if (selectedNoteEntityType === "pet") {
        const currentPet = pets.find((pet) => pet.id === selectedNoteEntityId);
        if (!currentPet) {
          return;
        }

        const result = await addPetNote(currentPet, noteText.trim(), noteVisibility);
        replacePetInState(result.data);
      } else {
        const currentAppointment = clientAppointments.find((appointment) => appointment.id === selectedNoteEntityId);
        if (!currentAppointment) {
          return;
        }

        const result = await addAppointmentNote(currentAppointment, noteText.trim(), noteVisibility);
        replaceAppointmentInState(result.data);
      }

      resetNotesEditor();
      setShowAddNoteModal(false);
      showToast({
        title: "Note Added",
        body: "The note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteSaveError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveQuickEditNote = async () => {
    if (!quickEditNote || !quickEditText.trim()) {
      return;
    }

    setIsSavingNote(true);
    setNoteSaveError(null);

    try {
      if (quickEditNote.entityType === "client") {
        const result = await updateOwnerNote(owner, quickEditNote.id, quickEditText.trim(), quickEditVisibility);
        replaceOwnerInState(result.data);
      } else if (quickEditNote.entityType === "pet") {
        const currentPet = pets.find((pet) => pet.id === quickEditNote.entityId);
        if (!currentPet) {
          return;
        }

        const result = await updatePetNote(currentPet, quickEditNote.id, quickEditText.trim(), quickEditVisibility);
        replacePetInState(result.data);
      } else {
        const currentAppointment = clientAppointments.find((appointment) => appointment.id === quickEditNote.entityId);
        if (!currentAppointment) {
          return;
        }

        const result = await updateAppointmentNote(currentAppointment, quickEditNote.id, quickEditText.trim(), quickEditVisibility);
        replaceAppointmentInState(result.data);
      }

      closeQuickEditNoteModal();
      showToast({
        title: "Note Updated",
        body: "The note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteSaveError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleNoteAction = async (note: ClientTimelineNote, action: "archive" | "restore" | "delete") => {
    setIsApplyingNoteAction(true);
    setNoteSaveError(null);

    try {
      if (note.entityType === "client") {
        const result =
          action === "archive"
            ? await archiveOwnerNote(owner, note.id)
            : action === "restore"
              ? await unarchiveOwnerNote(owner, note.id)
              : await deleteOwnerNoteItem(owner, note.id);
        replaceOwnerInState(result.data);
      } else if (note.entityType === "pet") {
        const currentPet = pets.find((pet) => pet.id === note.entityId);
        if (!currentPet) {
          return;
        }

        const result =
          action === "archive"
            ? await archivePetNote(currentPet, note.id)
            : action === "restore"
              ? await unarchivePetNote(currentPet, note.id)
              : await deletePetNoteItem(currentPet, note.id);
        replacePetInState(result.data);
      } else {
        const currentAppointment = clientAppointments.find((appointment) => appointment.id === note.entityId);
        if (!currentAppointment) {
          return;
        }

        const result =
          action === "archive"
            ? await archiveAppointmentNote(currentAppointment, note.id)
            : action === "restore"
              ? await unarchiveAppointmentNote(currentAppointment, note.id)
              : await deleteAppointmentNoteItem(currentAppointment, note.id);
        replaceAppointmentInState(result.data);
      }

      showToast({
        title: action === "archive" ? "Note Archived" : action === "restore" ? "Note Restored" : "Note Deleted",
        body:
          action === "archive"
            ? "The note was moved out of the active list."
            : action === "restore"
              ? "The note was restored to the active list."
              : "The note was deleted.",
        variant: action === "delete" ? "warning" : "success",
      });
    } catch (error) {
      setNoteSaveError(error instanceof Error ? error.message : "Unable to update note.");
    } finally {
      setIsApplyingNoteAction(false);
    }
  };

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

        <div className="page-actions d-flex gap-2 flex-wrap align-items-center">
          <span className={`mode-indicator${isEditMode ? " mode-indicator-edit" : ""}`}>
            {isEditMode ? "Edit Mode" : "View Mode"}
          </span>

          {isEditMode ? (
            <>
              <Button variant="outline-secondary" onClick={handleCancelEdit} disabled={isSavingClient}>
                Cancel Edit
              </Button>
              <Button variant="outline-secondary" onClick={() => setShowNotesModal(true)}>
                View Notes
              </Button>
              <Button variant="primary" onClick={() => void handleSaveClient()} disabled={isSavingClient}>
                {isSavingClient && <Spinner animation="border" size="sm" className="me-2" />}
                Save Client
              </Button>
            </>
          ) : (
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-secondary">Actions</Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setIsEditMode(true)}>
                  <PencilSquare aria-hidden="true" />
                  <span className="visually-hidden">Edit client</span>
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowNotesModal(true)}>View Notes</Dropdown.Item>
                <Dropdown.Item onClick={() => setShowScheduleModal(true)}>Schedule Appointment</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => setShowArchiveClientModal(true)}>Archive Client</Dropdown.Item>
                <Dropdown.Item className="text-danger" onClick={() => setShowDeleteClientModal(true)}>
                  Delete Client
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Owner Information</Card.Title>

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
                    <Form.Label>First Name</Form.Label>
                    <Form.Control value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Preferred Contact</Form.Label>
                    <Form.Select value={preferredContactMethod} onChange={(event) => setPreferredContactMethod(event.target.value as ContactMethod)}>
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="messenger">Messenger</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control value={address} onChange={(event) => setAddress(event.target.value)} />
                  </Form.Group>
                  <div className="client-notes-preview">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Client Notes</Form.Label>
                      <Button size="sm" variant="outline-secondary" onClick={() => setShowNotesModal(true)}>
                        Manage Notes
                      </Button>
                    </div>
                    <p className="text-muted small mb-0">
                      Notes are edited individually. Use the notes view to add, archive, restore, or delete them.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-1">
                    <strong>Contact:</strong>
                  </p>
                  <ClientContactActions phone={owner.phone} email={owner.email} stacked />
                  <p className="mb-1">
                    <strong>Address:</strong> {owner.address ?? "-"}
                  </p>
                  <p className="mb-3">
                    <strong>Preferred Contact:</strong> {owner.preferredContactMethod}
                  </p>
                  <div className="client-notes-preview">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                      <strong>Client Notes</strong>
                      {(activeClientNotes.length > 3 || activeTimelineNotes.length > activeClientNotes.length || archivedTimelineNotes.length > 0) && (
                        <Button size="sm" variant="outline-secondary" onClick={() => setShowNotesModal(true)}>
                          View More
                        </Button>
                      )}
                    </div>
                    {previewClientNotes.length === 0 ? (
                      <p className="text-muted mb-0">No active client notes.</p>
                    ) : (
                      <div className="d-grid gap-2">
                        {previewClientNotes.map((note) => (
                          <Card
                            key={note.id}
                            className="note-card"
                            onClick={() => openEditNoteEditor({
                              id: note.id,
                              entityId: owner.id,
                              entityType: "client",
                              entityLabel: `${owner.firstName} ${owner.lastName}`,
                              text: note.text,
                              visibility: note.visibility,
                              createdAt: note.createdAt,
                              updatedAt: note.updatedAt,
                              isArchived: note.isArchived,
                              archivedAt: note.archivedAt,
                            })}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openEditNoteEditor({
                                  id: note.id,
                                  entityId: owner.id,
                                  entityType: "client",
                                  entityLabel: `${owner.firstName} ${owner.lastName}`,
                                  text: note.text,
                                  visibility: note.visibility,
                                  createdAt: note.createdAt,
                                  updatedAt: note.updatedAt,
                                  isArchived: note.isArchived,
                                  archivedAt: note.archivedAt,
                                });
                              }
                            }}
                          >
                            <Card.Body className="d-grid gap-2">
                              <div className="note-card-meta">
                                <span className="client-note-type">client</span>
                                {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                {note.updatedAt && <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>}
                              </div>
                              <div className="note-card-text">{note.text}</div>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title className="mb-0">Pets</Card.Title>
                {isEditMode && (
                  <Button size="sm" variant="primary" onClick={() => { setSelectedPet(null); setShowEditPetModal(true); }}>
                    Add Pet
                  </Button>
                )}
              </div>
              {pets.length === 0 ? (
                <p className="text-muted mb-0">No pets on file.</p>
              ) : (
                <ListGroup>
                  {pets.map((pet) => (
                    <ListGroup.Item key={pet.id}>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <strong>{pet.name}</strong> - {pet.species}, {getCompactBreedLabel(pet)}
                        </div>
                        <div className="pet-row-actions">
                          {isEditMode ? (
                            <>
                              <button
                                type="button"
                                className="pet-row-indicator-button"
                                onClick={() => setViewingPet(pet)}
                              >
                                <span className="pet-row-indicator">View</span>
                              </button>
                              <button
                                type="button"
                                className="pet-row-indicator-button"
                                aria-label="Edit pet"
                                onClick={() => {
                                  setSelectedPet(pet);
                                  setShowEditPetModal(true);
                                }}
                              >
                                <span className="pet-row-indicator">
                                  <PencilSquare aria-hidden="true" />
                                </span>
                              </button>
                            </>
                          ) : (
                            <Link to={`/pets/${pet.id}`} className="pet-row-indicator-link">
                              <span className="pet-row-indicator">View</span>
                            </Link>
                          )}
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
                    const pet = allPets.find((record) => record.id === appt.petId);
                    return (
                      <ListGroup.Item key={appt.id} action onClick={() => { setSelectedAppointment(appt); setShowAppointmentDetailsModal(true); }}>
                        <strong>{pet?.name ?? "Unknown Pet"}</strong> - {new Date(appt.start).toLocaleString()} - {appt.status}
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <PetFormModal show={showEditPetModal} onHide={() => setShowEditPetModal(false)} owners={owners} initialPet={selectedPet} lockedOwnerId={selectedPet ? undefined : owner.id} onSaved={(updatedPet) => {
        setAllPets((currentPets) => {
          const existingPetIndex = currentPets.findIndex((pet) => pet.id === updatedPet.id);
          if (existingPetIndex === -1) return [...currentPets, updatedPet];
          return currentPets.map((pet) => (pet.id === updatedPet.id ? updatedPet : pet));
        });
        setPets((currentPets) => {
          const existingPetIndex = currentPets.findIndex((pet) => pet.id === updatedPet.id);
          if (existingPetIndex === -1) return [...currentPets, updatedPet];
          return currentPets.map((pet) => (pet.id === updatedPet.id ? updatedPet : pet));
        });
        showToast({ title: selectedPet ? "Pet Updated" : "Pet Added", body: selectedPet ? "Pet changes saved and ready for backend persistence." : "Pet created and ready for backend persistence.", variant: "success" });
        setShowEditPetModal(false);
        setSelectedPet(null);
      }} />
      <PetQuickViewModal show={!!viewingPet} pet={viewingPet} owner={owner} appointments={viewingPetAppointments} onHide={() => setViewingPet(null)} onBack={() => setViewingPet(null)} allowPageNavigation returnToParentOnSave={false} onPetUpdated={(updatedPet) => { replacePetInState(updatedPet); }} onPetArchived={(archivedPet) => { replacePetInState(archivedPet); setViewingPet(null); }} onPetDeleted={(petId) => { setAllPets((currentPets) => currentPets.filter((pet) => pet.id !== petId)); setPets((currentPets) => currentPets.filter((pet) => pet.id !== petId)); setViewingPet(null); }} />
      <AppointmentFormModal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} owners={owners} pets={pets} lockedOwnerId={owner.id} initialOwnerId={owner.id} onSaved={(appointment) => { setAllAppointments((currentAppointments) => [...currentAppointments, appointment]); showToast({ title: "Appointment Scheduled", body: "The appointment was created and is ready for backend persistence.", variant: "success" }); }} />
      <AppointmentDetailsModal show={showAppointmentDetailsModal} onHide={() => { setShowAppointmentDetailsModal(false); setSelectedAppointment(null); }} appointment={selectedAppointment} owners={owners} pets={allPets} onUpdated={(updatedAppointment) => {
        if (updatedAppointment.isArchived) {
          setAllAppointments((currentAppointments) => currentAppointments.map((appointment) => appointment.id === updatedAppointment.id ? updatedAppointment : appointment));
          setClientAppointments((currentAppointments) => currentAppointments.filter((appointment) => appointment.id !== updatedAppointment.id));
          setSelectedAppointment(null);
          setShowAppointmentDetailsModal(false);
          return;
        }
        replaceAppointmentInState(updatedAppointment);
      }} onDeleted={(appointmentId) => {
        setAllAppointments((currentAppointments) => currentAppointments.filter((appointment) => appointment.id !== appointmentId));
        setClientAppointments((currentAppointments) => currentAppointments.filter((appointment) => appointment.id !== appointmentId));
        setSelectedAppointment(null);
        setShowAppointmentDetailsModal(false);
      }} />
      <ConfirmDeleteModal show={showArchiveClientModal} title="Archive Client" body="Archiving removes this client from the visible client lists and related active views. All pets, pet appointments, and notes under this client will also be archived." note={`Pets affected: ${relatedPetSummary} Archived client records can still be retrieved later if needed. Deleting permanently removes the record instead.`} confirmLabel="Archive" confirmVariant="warning" onCancel={() => setShowArchiveClientModal(false)} onConfirm={async () => { const result = await archiveOwner(owner); replaceOwnerInState(result.data); showToast({ title: "Client Archived", body: result.mode === "api" ? "Client archived in backend." : "Client archived in mock mode.", variant: "warning" }); setShowArchiveClientModal(false); navigate("/contacts"); }} />
      <ConfirmDeleteModal show={showDeleteClientModal} title="Delete Client" body="Deleting permanently removes this client from the system." note="If you only want to hide this client from visible data, choose Archive instead. Archived records can still be retrieved later if needed." confirmLabel="Delete Permanently" onCancel={() => setShowDeleteClientModal(false)} onConfirm={async () => { const result = await deleteOwner(owner); setOwners((currentOwners) => currentOwners.filter((currentOwner) => currentOwner.id !== result.data.id)); showToast({ title: "Client Deleted", body: result.mode === "api" ? "Client deleted from backend." : "Client deleted in mock mode.", variant: "warning" }); setShowDeleteClientModal(false); navigate("/contacts"); }} />
      <ConfirmDeleteModal show={showArchivePetModal} title="Archive Pet" body="Archiving removes this pet from active pet views and also archives its appointments and related notes." note="Archived pet records can still be retrieved later if needed. Deleting permanently removes the record instead." confirmLabel="Archive" confirmVariant="warning" onCancel={() => { setShowArchivePetModal(false); setSelectedPet(null); }} onConfirm={async () => { if (!selectedPet) return; const petToArchive = selectedPet; const archivedAt = new Date().toISOString(); const result = await archivePet(petToArchive); replacePetInState(result.data); setAllAppointments((currentAppointments) => currentAppointments.map((appointment) => appointment.petId === petToArchive.id ? { ...appointment, isArchived: true, archivedAt } : appointment)); showToast({ title: "Pet Archived", body: result.mode === "api" ? "Pet archived in backend." : "Pet archived in mock mode.", variant: "warning" }); setShowArchivePetModal(false); setSelectedPet(null); }} />
      <ConfirmDeleteModal show={showDeletePetModal} title="Delete Pet" body="Deleting permanently removes this pet from the system." note="If you only want to hide this pet from visible data, choose Archive instead. Archived records can still be retrieved later if needed." confirmLabel="Delete Permanently" onCancel={() => { setShowDeletePetModal(false); setSelectedPet(null); }} onConfirm={async () => { if (!selectedPet) return; const result = await deletePet(selectedPet); setAllPets((currentPets) => currentPets.filter((pet) => pet.id !== result.data.id)); setPets((currentPets) => currentPets.filter((pet) => pet.id !== result.data.id)); showToast({ title: "Pet Deleted", body: result.mode === "api" ? "Pet deleted in backend." : "Pet deleted in mock mode.", variant: "warning" }); setShowDeletePetModal(false); setSelectedPet(null); }} />
      <Modal show={showNotesModal} onHide={() => { setShowNotesModal(false); resetNotesEditor(); }} centered fullscreen="sm-down">
        <Modal.Header closeButton>
          <div className="w-100 d-flex justify-content-between align-items-start gap-3">
            <Modal.Title>Client Notes</Modal.Title>
            <Button variant="outline-secondary" size="sm" onClick={openNewNoteEditor}>
              Add Note
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body>
          {noteSaveError && <Alert variant="danger" className="mb-3">{noteSaveError}</Alert>}
          {activeTimelineNotes.length === 0 ? <p className="text-muted mb-0">No active notes have been added to this client, pets, or appointments.</p> : (
            <div className="d-grid gap-2">
              {activeTimelineNotes.map((note) => (
                <Card
                  key={`${note.entityType}-${note.entityId}-${note.id}`}
                  className="note-card"
                  onClick={() => openEditNoteEditor(note)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEditNoteEditor(note);
                    }
                  }}
                >
                  <Card.Body className="d-grid gap-2">
                    <div className="note-card-meta">
                      <span className={`client-note-type client-note-type-${note.entityType}`}>{note.entityType}</span>
                      <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                        {note.visibility === "client" ? "Client-facing" : "Internal"}
                      </span>
                      {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                      <span>{note.entityLabel}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}{note.updatedAt ? ` | Updated ${new Date(note.updatedAt).toLocaleString()}` : ""}</span>
                    </div>
                    <div className="note-card-text">{note.text}</div>
                    <div className="note-inline-actions">
                      <button
                        type="button"
                        className="pet-row-indicator-button"
                        aria-label="Edit note"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditNoteEditor(note);
                        }}
                      >
                        <span className="pet-row-indicator">
                          <PencilSquare aria-hidden="true" />
                        </span>
                      </button>
                      <button type="button" className="pet-row-indicator-button" disabled={isApplyingNoteAction} onClick={(event) => { event.stopPropagation(); void handleNoteAction(note, "archive"); }}><span className="pet-row-indicator">Archive</span></button>
                      <button type="button" className="pet-row-indicator-button" disabled={isApplyingNoteAction} onClick={(event) => { event.stopPropagation(); void handleNoteAction(note, "delete"); }}><span className="pet-row-indicator pet-row-indicator-danger">Delete</span></button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
          {archivedTimelineNotes.length > 0 && (
            <div className="mt-3">
              <Button variant="outline-secondary" size="sm" onClick={() => setShowArchivedNotes((current) => !current)} aria-expanded={showArchivedNotes} aria-controls="archived-client-notes">
                {showArchivedNotes ? "Hide Archived Notes" : `Show Archived Notes (${archivedTimelineNotes.length})`}
              </Button>
              <Collapse in={showArchivedNotes}>
                <div id="archived-client-notes" className="mt-3 d-grid gap-2">
                  {archivedTimelineNotes.map((note) => (
                    <Card
                      key={`${note.entityType}-${note.entityId}-${note.id}`}
                      className="note-card"
                      onClick={() => openEditNoteEditor(note)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openEditNoteEditor(note);
                        }
                      }}
                    >
                      <Card.Body className="d-grid gap-2">
                        <div className="note-card-meta">
                          <span className={`client-note-type client-note-type-${note.entityType}`}>{note.entityType}</span>
                          <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                            {note.visibility === "client" ? "Client-facing" : "Internal"}
                          </span>
                          {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                          <span>{note.entityLabel}</span>
                          <span>Archived {note.archivedAt ? new Date(note.archivedAt).toLocaleString() : ""}</span>
                        </div>
                        <div className="note-card-text">{note.text}</div>
                        <div className="note-inline-actions">
                          <button type="button" className="pet-row-indicator-button" disabled={isApplyingNoteAction} onClick={(event) => { event.stopPropagation(); void handleNoteAction(note, "restore"); }}><span className="pet-row-indicator">Restore</span></button>
                          <button type="button" className="pet-row-indicator-button" disabled={isApplyingNoteAction} onClick={(event) => { event.stopPropagation(); void handleNoteAction(note, "delete"); }}><span className="pet-row-indicator pet-row-indicator-danger">Delete</span></button>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </Collapse>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNotesModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showAddNoteModal} onHide={() => { setShowAddNoteModal(false); resetNotesEditor(); }} centered fullscreen="sm-down">
        <Modal.Header closeButton>
          <Modal.Title>New Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {noteSaveError && <Alert variant="danger" className="mb-3">{noteSaveError}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Attached To</Form.Label>
            <Form.Control
              type="text"
              value={`${owner.firstName} ${owner.lastName} (Client)`}
              readOnly
            />
            <Form.Text className="text-muted">
              Notes added here stay attached to this client.
            </Form.Text>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Note</Form.Label>
            <Form.Control as="textarea" rows={6} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Enter note details..." />
          </Form.Group>
          <Form.Group>
            <Form.Label>Visibility</Form.Label>
            <Form.Select value={noteVisibility} onChange={(event) => setNoteVisibility(event.target.value as NoteVisibility)}>
              <option value="internal">Internal only</option>
              <option value="client">Client-facing</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => { setShowAddNoteModal(false); resetNotesEditor(); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSaveNote()} disabled={!noteText.trim() || isSavingNote}>
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showQuickEditNoteModal} onHide={closeQuickEditNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {noteSaveError && (
            <Alert variant="danger" className="mb-3">
              {noteSaveError}
            </Alert>
          )}
          {quickEditNote && (
            <p className="text-muted small">
              Editing note on {quickEditNote.entityLabel}
            </p>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Note</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={quickEditText}
              onChange={(event) => setQuickEditText(event.target.value)}
              placeholder="Update note details..."
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Visibility</Form.Label>
            <Form.Select value={quickEditVisibility} onChange={(event) => setQuickEditVisibility(event.target.value as NoteVisibility)}>
              <option value="internal">Internal only</option>
              <option value="client">Client-facing</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeQuickEditNoteModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSaveQuickEditNote()} disabled={!quickEditText.trim() || isSavingNote}>
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
