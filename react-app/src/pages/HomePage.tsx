import { useState } from "react";
import { Card, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import UpcomingAppointments from "../components/appointments/UpcomingAppointments";
import { useAppData } from "../components/common/AppDataProvider";
import PageLoader from "../components/common/PageLoader";
import useInitialLoading from "../hooks/useInitialLoading";
import type { Appointment } from "../types/models";

const now = new Date();
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function isProjectedAppointment(start: string, status: string) {
  const appointmentStart = new Date(start);
  return (
    appointmentStart >= now &&
    (status === "scheduled" || status === "confirmed")
  );
}

function countUpcomingAppointments(appointments: Appointment[], days: number) {
  const end = new Date(now);
  end.setDate(end.getDate() + days);

  return appointments.filter((appointment) => {
    const start = new Date(appointment.start);
    return start >= now && start <= end;
  }).length;
}

function countTodayAppointments(appointments: Appointment[]) {
  return appointments.filter((appointment) => {
    const start = new Date(appointment.start);

    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  }).length;
}

function projectedRevenue(appointments: Appointment[], days?: number) {
  const end = new Date(now);

  if (days) {
    end.setDate(end.getDate() + days);
  }

  return appointments
    .filter((appointment) => {
      const start = new Date(appointment.start);

      if (!isProjectedAppointment(appointment.start, appointment.status)) {
        return false;
      }

      return days ? start <= end : true;
    })
    .reduce((total, appointment) => total + appointment.cost, 0);
}

export default function HomePage() {
  const isLoading = useInitialLoading();
  const { appointments, owners, pets, setAppointments } = useAppData();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const dashboardStats = [
    {
      label: "Active Clients",
      value: owners.filter((owner) => !owner.isArchived).length,
      tone: "mint",
    },
    {
      label: "Pets On File",
      value: pets.filter((pet) => !pet.isArchived).length,
      tone: "gold",
    },
    {
      label: "Appointments Today",
      value: countTodayAppointments(appointments),
      tone: "blush",
    },
    {
      label: "Next 7 Days",
      value: countUpcomingAppointments(appointments, 7),
      tone: "foam",
    },
    {
      label: "Projected This Week",
      value: currencyFormatter.format(projectedRevenue(appointments, 7)),
      tone: "gold",
    },
    {
      label: "Upcoming Scheduled Revenue",
      value: currencyFormatter.format(projectedRevenue(appointments)),
      tone: "mint",
    },
  ];

  if (isLoading) {
    return <PageLoader label="Loading studio overview..." />;
  }

  return (
    <>
      <div className="page-header home-page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Home</p>
          <h2 className="mb-1">Studio Overview</h2>
          <p className="text-muted mb-0 home-page-subtitle">
            A quick view of clients, pets, and the upcoming grooming schedule.
          </p>
        </div>
      </div>

      <Row className="g-4 home-overview-grid">
        <Col xs={12} xl={9}>
          <Row className="g-3 mb-4 home-dashboard-stats">
            {dashboardStats.map((stat) => (
              <Col xs={6} xl={4} key={stat.label}>
                <Card className={`shadow-sm dashboard-stat-card dashboard-stat-${stat.tone} home-dashboard-stat-card`}>
                  <Card.Body>
                    <p className="dashboard-stat-label mb-2">{stat.label}</p>
                    <div className="dashboard-stat-value">{stat.value}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <UpcomingAppointments
            appointments={appointments}
            owners={owners}
            pets={pets}
            onAppointmentClick={setSelectedAppointment}
          />
        </Col>

        <Col xs={12} xl={3} className="home-sidebar-stack">
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title className="mb-2">Quick Actions</Card.Title>
              <p className="text-muted small mb-3">
                Jump into the parts of the app staff use most during the day.
              </p>

              <div className="d-grid gap-2">
                <Link className="btn btn-primary" to="/schedule">
                  Open Schedule
                </Link>
                <Link className="btn btn-outline-primary" to="/contacts">
                  Browse Clients
                </Link>
                <Link className="btn btn-outline-primary" to="/analysis">
                  View Analysis
                </Link>
                <Link className="btn btn-outline-primary" to="/pets">
                  Browse Pets
                </Link>
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="mb-2">At a Glance</Card.Title>
              <div className="dashboard-note-list">
                <div className="dashboard-note-item">
                  <strong>Busy week:</strong> Use the schedule page to review the
                  full calendar and switch between agenda, day, and work-week
                  views.
                </div>
                <div className="dashboard-note-item">
                  <strong>Client search:</strong> Contacts and Pets both support
                  live search, sorting, and compact list views.
                </div>
                <div className="dashboard-note-item">
                  <strong>Pet profiles:</strong> Open a pet to review owner
                  details, notes, and appointment history before check-in.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <AppointmentDetailsModal
        show={!!selectedAppointment}
        onHide={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        owners={owners}
        pets={pets}
        onUpdated={(updatedAppointment) => {
          setAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === updatedAppointment.id ? updatedAppointment : appointment,
            ),
          );
          if (updatedAppointment.isArchived) {
            setSelectedAppointment(null);
            return;
          }
          setSelectedAppointment(updatedAppointment);
        }}
        onDeleted={(appointmentId) => {
          setAppointments((currentAppointments) =>
            currentAppointments.filter((appointment) => appointment.id !== appointmentId),
          );
          setSelectedAppointment(null);
        }}
      />
    </>
  );
}
