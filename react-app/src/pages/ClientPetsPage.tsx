import { useState } from "react";
import { Accordion, Button, Card, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../components/common/AppDataProvider";
import PageLoader from "../components/common/PageLoader";
import { useAuth } from "../components/common/useAuth";
import useInitialLoading from "../hooks/useInitialLoading";
import { getNotePostedByLabel } from "../lib/noteUtils";
import { getCompactBreedLabel, getDetailedBreedLabel } from "../lib/petBreeds";
import { formatPetAge, toDateInputValue } from "../lib/petAge";

export default function ClientPetsPage() {
  const isLoading = useInitialLoading();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pets, appointments } = useAppData();
  const [selectedNote, setSelectedNote] = useState<{ text: string; createdAt: string; createdByName?: string } | null>(null);

  if (isLoading) {
    return <PageLoader label="Loading pets..." />;
  }

  const clientPets = pets.filter((pet) => pet.ownerId === user?.ownerId && !pet.isArchived);

  return (
    <>
      <div className="page-header d-flex flex-column gap-2 mb-4">
        <div>
          <p className="page-kicker mb-2">Client Portal</p>
          <h2 className="mb-1">My Pets</h2>
          <p className="text-muted mb-0">
            Review each pet profile, recent appointment history, and any notes shared with you.
          </p>
        </div>
      </div>

      {clientPets.length === 0 ? (
        <Card className="shadow-sm">
          <Card.Body className="d-grid gap-3">
            <div>
              <h5 className="mb-1">No Pets Found</h5>
              <p className="text-muted mb-0">
                There are no active pet profiles on your account right now.
              </p>
            </div>
            <div>
              <Button onClick={() => navigate("/requests?type=new_pet")}>
                Request New Pet Profile
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Accordion className="d-grid gap-3 client-accordion-grid">
          {clientPets.map((pet, index) => {
            const petAppointments = appointments
              .filter((appointment) => appointment.petId === pet.id && !appointment.isArchived)
              .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
            const clientNotes = pet.notes.filter((note) => !note.isArchived && note.visibility === "client");

            return (
              <Accordion.Item
                eventKey={String(index)}
                key={pet.id}
                className="shadow-sm border-0 rounded-4 overflow-hidden"
              >
                <Accordion.Header>
                  <div>
                    <div className="fw-semibold">{pet.name}</div>
                    <div className="text-muted small">{getCompactBreedLabel(pet)} • {pet.species}</div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="d-grid gap-4">
                    <div className="client-detail-grid">
                      <div>
                        <div className="text-muted small">Breed</div>
                        <div>{getDetailedBreedLabel(pet)}</div>
                      </div>
                      <div>
                        <div className="text-muted small">Color</div>
                        <div>{pet.color || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-muted small">Weight</div>
                        <div>{pet.weightLbs ? `${pet.weightLbs} lbs` : "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-muted small">Age</div>
                        <div>{formatPetAge(pet)}</div>
                      </div>
                      <div>
                        <div className="text-muted small">DOB</div>
                        <div>{pet.birthDate ? toDateInputValue(pet.birthDate) : "Not provided"}</div>
                      </div>
                    </div>

                    <div>
                      <h6 className="mb-2">Notes</h6>
                      <div className="d-grid gap-2">
                        {clientNotes.map((note) => (
                          <Card
                            key={note.id}
                            className="note-card"
                            onClick={() => setSelectedNote({ text: note.text, createdAt: note.createdAt, createdByName: note.createdByName })}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedNote({ text: note.text, createdAt: note.createdAt, createdByName: note.createdByName });
                              }
                            }}
                          >
                            <Card.Body className="d-grid gap-2">
                              <div className="note-card-meta">
                                {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="note-card-text">{note.text}</div>
                            </Card.Body>
                          </Card>
                        ))}
                        {clientNotes.length === 0 && (
                          <div className="text-muted small">No notes for this pet.</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h6 className="mb-2">Appointment History</h6>
                      <div className="d-grid gap-2">
                        {petAppointments.slice(0, 5).map((appointment) => (
                          <div key={appointment.id} className="client-summary-row">
                            <div>
                              <div className="fw-semibold">{new Date(appointment.start).toLocaleString()}</div>
                              <div className="text-muted small">
                                {appointment.serviceType || "Grooming"} • {appointment.status}
                              </div>
                            </div>
                          </div>
                        ))}
                        {petAppointments.length === 0 && (
                          <div className="text-muted small">No appointments on file yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      <Modal show={!!selectedNote} onHide={() => setSelectedNote(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedNote && (
            <>
              <div className="text-muted small mb-2">
                {getNotePostedByLabel(selectedNote) && <div>{getNotePostedByLabel(selectedNote)}</div>}
                {new Date(selectedNote.createdAt).toLocaleDateString()}
              </div>
              <div className="note-card-text-full">{selectedNote.text}</div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
