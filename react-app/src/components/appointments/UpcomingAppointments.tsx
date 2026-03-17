import { useMemo, useState } from "react";
import { Badge, Button, ButtonGroup, Card, ListGroup } from "react-bootstrap";
import { formatAppointmentServices } from "../../lib/appointmentServices";
import { formatAppointmentCurrency, getAppointmentQuotePrice } from "../../lib/appointmentPricing";
import type { Appointment, Owner, Pet } from "../../types/models";

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  owners: Owner[];
  pets: Pet[];
  onAppointmentClick?: (appointment: Appointment) => void;
}

type RangeOption = "3days" | "week" | "2weeks" | "month";

export default function UpcomingAppointments({
  appointments,
  owners,
  pets,
  onAppointmentClick,
}: UpcomingAppointmentsProps) {
  const [range, setRange] = useState<RangeOption>("week");
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const end = new Date(now);

    switch (range) {
      case "3days":
        end.setDate(now.getDate() + 3);
        break;
      case "week":
        end.setDate(now.getDate() + 7);
        break;
      case "2weeks":
        end.setDate(now.getDate() + 14);
        break;
      case "month":
        end.setDate(now.getDate() + 30);
        break;
    }

    return appointments
      .filter((appt) => {
        const appointmentStart = new Date(appt.start);
        return appointmentStart >= now && appointmentStart <= end;
      })
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }, [appointments, range]);

  const getOwnerName = (ownerId: string) => {
    const owner = owners.find((item) => item.id === ownerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : "Unknown Owner";
  };

  const getPetName = (petId: string) => {
    const pet = pets.find((item) => item.id === petId);
    return pet?.name ?? "Unknown Pet";
  };

  const getStatusVariant = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "cancelled":
        return "danger";
      case "completed":
        return "secondary";
      case "no-show":
        return "warning";
      case "scheduled":
      default:
        return "primary";
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <Card.Title className="mb-1">Upcoming Appointments</Card.Title>
            <p className="text-muted mb-0 small">
              View upcoming bookings by date range.
            </p>
          </div>
        </div>

        <ButtonGroup className="mb-3 w-100">
          <Button
            variant={range === "3days" ? "primary" : "outline-primary"}
            onClick={() => setRange("3days")}
          >
            3 Days
          </Button>
          <Button
            variant={range === "week" ? "primary" : "outline-primary"}
            onClick={() => setRange("week")}
          >
            Week
          </Button>
          <Button
            variant={range === "2weeks" ? "primary" : "outline-primary"}
            onClick={() => setRange("2weeks")}
          >
            2 Weeks
          </Button>
          <Button
            variant={range === "month" ? "primary" : "outline-primary"}
            onClick={() => setRange("month")}
          >
            Month
          </Button>
        </ButtonGroup>

        {filteredAppointments.length === 0 ? (
          <p className="text-muted mb-0">
            No upcoming appointments in this range.
          </p>
        ) : (
          <ListGroup variant="flush">
            {filteredAppointments.map((appt) => (
              <ListGroup.Item key={appt.id} className="px-0">
                <div
                  className={`d-flex justify-content-between align-items-start gap-3${onAppointmentClick ? " upcoming-appointment-item" : ""}`}
                  role={onAppointmentClick ? "button" : undefined}
                  tabIndex={onAppointmentClick ? 0 : undefined}
                  onClick={onAppointmentClick ? () => onAppointmentClick(appt) : undefined}
                  onKeyDown={onAppointmentClick ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onAppointmentClick(appt);
                    }
                  } : undefined}
                >
                  <div>
                    <div className="fw-semibold">{getPetName(appt.petId)}</div>
                    <div className="small text-muted">
                      {getOwnerName(appt.ownerId)}
                    </div>
                    <div className="small">
                      {new Date(appt.start).toLocaleString()}
                    </div>
                    <div className="small text-muted">
                      {formatAppointmentServices(appt)}
                    </div>
                    <div className="small fw-semibold appointment-cost-highlight">
                      Quote {formatAppointmentCurrency(getAppointmentQuotePrice(appt))}
                    </div>
                  </div>

                  <div className="d-flex flex-column align-items-end gap-2">
                    <Badge bg={getStatusVariant(appt.status)}>
                      {appt.status}
                    </Badge>

                    {onAppointmentClick && (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAppointmentClick(appt);
                        }}
                      >
                        Open
                      </Button>
                    )}
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}
