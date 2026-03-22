import { Card, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAppData } from "../components/common/AppDataProvider";
import PageLoader from "../components/common/PageLoader";
import { useAuth } from "../components/common/useAuth";
import useInitialLoading from "../hooks/useInitialLoading";

const CLIENT_PORTAL_NOW = Date.now();

const requestTypeLabels = {
  appointment: "Appointment request",
  appointment_change: "Cancel/Reschedule request",
  new_pet: "New pet request",
  profile_update: "Profile update",
  general: "General request",
} as const;

function formatRequestStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default function ClientHomePage() {
  const isLoading = useInitialLoading();
  const { user } = useAuth();
  const { owners, pets, appointments, requests } = useAppData();

  if (isLoading) {
    return <PageLoader label="Loading client home..." />;
  }

  const owner = owners.find((item) => item.id === user?.ownerId) ?? null;
  const clientPets = pets.filter((pet) => pet.ownerId === user?.ownerId && !pet.isArchived);
  const clientAppointments = appointments
    .filter((appointment) => appointment.ownerId === user?.ownerId && !appointment.isArchived)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const upcomingAppointments = clientAppointments.filter(
    (appointment) => new Date(appointment.end).getTime() >= CLIENT_PORTAL_NOW,
  );
  const clientRequests = requests
    .filter((request) => request.ownerId === user?.ownerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!owner) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Client Profile Not Linked</Card.Title>
          <p className="text-muted mb-0">
            This account is signed in, but it is not linked to a client record yet.
          </p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Client Portal</p>
          <h2 className="mb-1">Welcome back, {owner.firstName}</h2>
          <p className="text-muted mb-0">
            Review your upcoming appointments and request updates in one place.
          </p>
        </div>
      </div>

      <Row className="g-4">
        <Col xs={12} xl={8}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <Card.Title className="mb-0">Upcoming Appointments</Card.Title>
                <Link className="btn btn-sm btn-outline-primary" to="/appointments">
                  View All
                </Link>
              </div>
              <div className="d-grid gap-3">
                {upcomingAppointments.slice(0, 3).map((appointment) => {
                  const pet = clientPets.find((item) => item.id === appointment.petId);
                  return (
                    <Link
                      key={appointment.id}
                      className="client-summary-row client-summary-link"
                      to={`/appointments?appointmentId=${appointment.id}`}
                    >
                      <div>
                        <div className="fw-semibold">{pet?.name ?? "Pet"}</div>
                        <div className="text-muted small">
                          {new Date(appointment.start).toLocaleString()} | {appointment.status}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {upcomingAppointments.length === 0 && (
                  <div className="text-muted small mb-0">No upcoming appointments.</div>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <Card.Title className="mb-0">My Requests</Card.Title>
                <Link className="btn btn-sm btn-outline-primary" to="/requests">
                  View All
                </Link>
              </div>
              <div className="d-grid gap-3">
                {clientRequests.slice(0, 4).map((request) => (
                  <Link
                    key={request.id}
                    className="client-summary-row client-summary-link"
                    to={`/requests?requestId=${request.id}`}
                  >
                    <div>
                      <div className="fw-semibold">{request.subject}</div>
                      <div className="text-muted small">{requestTypeLabels[request.requestType]}</div>
                    </div>
                    <span className="request-status-pill">{formatRequestStatus(request.status)}</span>
                  </Link>
                ))}
                {clientRequests.length === 0 && (
                  <div className="text-muted small">No requests yet.</div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} xl={4}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title className="mb-3">My Information</Card.Title>
              <div className="d-grid gap-2">
                <div>
                  <div className="text-muted small">Name</div>
                  <div>{owner.firstName} {owner.lastName}</div>
                </div>
                <div>
                  <div className="text-muted small">Preferred Contact</div>
                  <div>
                    {owner.preferredContactMethod === "text"
                      ? "Text"
                      : owner.preferredContactMethod === "email"
                        ? "Email"
                        : "Messenger"}
                  </div>
                </div>
                <div>
                  <div className="text-muted small">Email</div>
                  <div>{owner.email}</div>
                </div>
                <div>
                  <div className="text-muted small">Phone</div>
                  <div>{owner.phone}</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title className="mb-2">Quick Actions</Card.Title>
              <p className="text-muted small mb-3">
                Submit a request and the groomer will follow up.
              </p>
              <div className="d-grid gap-2">
                <Link className="btn btn-primary" to="/requests?type=appointment">
                  Request Appointment
                </Link>
                <Link className="btn btn-outline-primary" to="/requests?type=appointment_change">
                  Request Cancel/Reschedule
                </Link>
                <Link className="btn btn-outline-primary" to="/requests?type=new_pet">
                  Request New Pet Profile
                </Link>
                <Link className="btn btn-outline-primary" to="/requests?type=profile_update">
                  Request Profile Update
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
