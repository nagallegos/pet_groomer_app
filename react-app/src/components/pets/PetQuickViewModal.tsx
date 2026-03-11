import { Button, ListGroup, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { formatAppointmentServices } from "../../lib/appointmentServices";
import type { Appointment, Owner, Pet } from "../../types/models";

interface PetQuickViewModalProps {
  show: boolean;
  pet: Pet | null;
  owner: Owner | null;
  appointments: Appointment[];
  onHide: () => void;
}

export default function PetQuickViewModal({
  show,
  pet,
  owner,
  appointments,
  onHide,
}: PetQuickViewModalProps) {
  const navigate = useNavigate();

  if (!pet) return null;

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Modal.Header closeButton>
        <Modal.Title>{pet.name}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="mb-4">
          <h6>Pet Information</h6>
          <p className="mb-1">
            <strong>Species:</strong> {pet.species}
          </p>
          <p className="mb-1">
            <strong>Breed:</strong> {pet.breed}
          </p>
          <p className="mb-1">
            <strong>Weight:</strong> {pet.weightLbs ?? "—"} lbs
          </p>
          <p className="mb-0">
            <strong>Age:</strong> {pet.ageYears ?? "—"} years
          </p>
        </div>

        <div className="mb-4">
          <h6>Owner</h6>
          {owner ? (
            <>
              <p className="mb-1">
                <strong>Name:</strong> {owner.firstName} {owner.lastName}
              </p>
              <p className="mb-1">
                <strong>Phone:</strong> {owner.phone}
              </p>
              <p className="mb-0">
                <strong>Email:</strong> {owner.email}
              </p>
            </>
          ) : (
            <p className="text-muted mb-0">Owner information unavailable.</p>
          )}
        </div>

        <div className="mb-4">
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
        </div>

        <div>
          <h6>Appointment History</h6>
          {appointments.length === 0 ? (
            <p className="text-muted mb-0">No appointments yet.</p>
          ) : (
            <ListGroup>
              {appointments.map((appointment) => (
                <ListGroup.Item key={appointment.id}>
                  {new Date(appointment.start).toLocaleString()} —{" "}
                  {formatAppointmentServices(appointment)} — {appointment.status}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        {owner && (
          <Button
            variant="outline-secondary"
            onClick={() => {
              onHide();
              navigate(`/clients/${owner.id}`);
            }}
          >
            Open Owner
          </Button>
        )}
        <Button
          variant="primary"
          onClick={() => {
            onHide();
            navigate(`/pets/${pet.id}`);
          }}
        >
          Full Pet Page
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
