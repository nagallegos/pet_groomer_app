import { Button, Card, ListGroup } from "react-bootstrap";
import type { Appointment, Owner, Pet } from "../../types/models";

interface AppointmentWeekListProps {
  title: string;
  appointments: Appointment[];
  owners: Owner[];
  pets: Pet[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function AppointmentWeekList({
  title,
  appointments,
  owners,
  pets,
  onAppointmentClick,
}: AppointmentWeekListProps) {
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title>{title}</Card.Title>

        {sortedAppointments.length === 0 ? (
          <p className="text-muted mb-0">No appointments in this week.</p>
        ) : (
          <ListGroup variant="flush">
            {sortedAppointments.map((appt) => {
              const owner = owners.find((o) => o.id === appt.ownerId);
              const pet = pets.find((p) => p.id === appt.petId);

              return (
                <ListGroup.Item key={appt.id} className="px-0">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold">{pet?.name ?? "Pet"}</div>
                      <div className="small text-muted">
                        {owner?.firstName} {owner?.lastName}
                      </div>
                      <div className="small">
                        {new Date(appt.start).toLocaleString()}
                      </div>
                      <div className="small text-capitalize">{appt.status}</div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => onAppointmentClick(appt)}
                    >
                      Open
                    </Button>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}
