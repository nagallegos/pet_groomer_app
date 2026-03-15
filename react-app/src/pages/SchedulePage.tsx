import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import {
  Calendar,
  dateFnsLocalizer,
  type EventProps,
  type View,
  Views,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

import AppointmentFormModal from "../components/appointments/AppointmentFormModal";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import PaginatedAppointmentList from "../components/appointments/PaginatedAppointmentList";
import CustomCalendarToolbar from "../components/calendar/CustomCalendarToolbar";
import ThreeDayView from "../components/calendar/ThreeDayView";
import TuesdaySaturdayWorkWeekView from "../components/calendar/TuesdaySaturdayWeekView";
import { useAppData } from "../components/common/AppDataProvider";
import { useAppToast } from "../components/common/AppToastProvider";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import useInitialLoading from "../hooks/useInitialLoading";
import { formatAppointmentServices } from "../lib/appointmentServices";
import { archiveAppointment, deleteAppointment } from "../lib/crmApi";
import type { Appointment, Owner } from "../types/models";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

type CalendarViewName = View | "three_day";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Appointment;
}

interface NewAppointmentDraft {
  ownerId: string;
  petId: string;
  date: string;
  startTime: string;
  endTime: string;
}

const CALENDAR_STATUS_LEGEND: Array<{
  label: string;
  dotClassName: string;
}> = [
  { label: "Scheduled", dotClassName: "appointment-status-dot-scheduled" },
  { label: "Confirmed", dotClassName: "appointment-status-dot-confirmed" },
  { label: "Completed", dotClassName: "appointment-status-dot-completed" },
  { label: "Cancelled", dotClassName: "appointment-status-dot-cancelled" },
  { label: "No Show", dotClassName: "appointment-status-dot-no-show" },
];

function CalendarStatusLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`schedule-calendar-legend${compact ? " schedule-calendar-legend-compact" : ""}`}
      aria-label="Appointment status legend"
    >
      {CALENDAR_STATUS_LEGEND.map((item) => (
        <span key={item.label} className="schedule-calendar-legend-item">
          <span
            aria-hidden="true"
            className={`appointment-status-dot ${item.dotClassName}`}
          />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

const MOBILE_BREAKPOINT = 768;
const MOBILE_LANDSCAPE_HEIGHT_BREAKPOINT = 500;

function isCompactMobileViewport() {
  return (
    window.innerWidth < MOBILE_BREAKPOINT ||
    (window.innerHeight <= MOBILE_LANDSCAPE_HEIGHT_BREAKPOINT &&
      window.innerWidth < 1100)
  );
}

function getAppointmentStatusTheme(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return {
        background: "#5f9c74",
        border: "#48825d",
        text: "#f7fff8",
        dotClassName: "appointment-status-dot-confirmed",
      };
    case "completed":
      return {
        background: "#86939c",
        border: "#6d7a83",
        text: "#f8fbfa",
        dotClassName: "appointment-status-dot-completed",
      };
    case "cancelled":
      return {
        background: "#c85f66",
        border: "#a94a50",
        text: "#fff8f8",
        dotClassName: "appointment-status-dot-cancelled",
      };
    case "no-show":
      return {
        background: "#d9a441",
        border: "#b98624",
        text: "#4f3a12",
        dotClassName: "appointment-status-dot-no-show",
      };
    case "scheduled":
    default:
      return {
        background: "#7f63c8",
        border: "#684cb2",
        text: "#fbf9ff",
        dotClassName: "appointment-status-dot-scheduled",
      };
  }
}

function MobileAgendaStyleEvent({
  event,
  onEdit,
  owners,
}: EventProps<CalendarEvent> & {
  onEdit: (event: CalendarEvent) => void;
  owners: Owner[];
}) {
  const statusTheme = getAppointmentStatusTheme(event.resource.status);
  const owner = owners.find((record) => record.id === event.resource.ownerId);
  const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.trim() : "";

  return (
    <div className="agenda-event-row">
      <div className="agenda-event-main">
        <span
          className={`appointment-status-dot ${statusTheme.dotClassName}`}
          aria-hidden="true"
        />
        <div>
          <div className="agenda-event-title">{event.title}</div>
          <div className="agenda-event-meta">
            {ownerName ? `${ownerName} • ` : ""}
            {formatAppointmentServices(event.resource)}
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant="link"
        className="agenda-event-edit-btn"
        aria-label="Edit appointment"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onEdit(event);
        }}
      >
        <PencilSquare aria-hidden="true" />
      </Button>
    </div>
  );
}

function CalendarPetEventChip({ event }: EventProps<CalendarEvent>) {
  return <span>{event.title}</span>;
}

export default function SchedulePage() {
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const { owners, pets, appointments, setAppointments } = useAppData();

  const getInitialView = (): CalendarViewName =>
    isCompactMobileViewport() ? Views.DAY : Views.MONTH;

  const [isMobile, setIsMobile] = useState(() => isCompactMobileViewport());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<CalendarViewName>(getInitialView);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [appointmentPendingDelete, setAppointmentPendingDelete] =
    useState<Appointment | null>(null);
  const [appointmentPendingArchive, setAppointmentPendingArchive] =
    useState<Appointment | null>(null);
  const [draft, setDraft] = useState<NewAppointmentDraft>({
    ownerId: "",
    petId: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = isCompactMobileViewport();
      setIsMobile(mobile);

      setCurrentView((prev) => {
        if (mobile) {
          if (
            prev === Views.MONTH ||
            prev === Views.WEEK ||
            prev === Views.WORK_WEEK
          ) {
            return Views.DAY;
          }
          return prev;
        }

        if (prev === "three_day" || prev === Views.AGENDA) {
          return Views.MONTH;
        }

        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleAppointments = useMemo(
    () => appointments.filter((appointment) => !appointment.isArchived),
    [appointments],
  );

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      visibleAppointments.map((appointment) => {
        const pet = pets.find((item) => item.id === appointment.petId);

        return {
          id: appointment.id,
          title: pet?.name ?? "Pet",
          start: new Date(appointment.start),
          end: new Date(appointment.end),
          resource: appointment,
        };
      }),
    [pets, visibleAppointments],
  );

  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    setDraft({
      ownerId: "",
      petId: "",
      date: start.toISOString().slice(0, 10),
      startTime: start.toTimeString().slice(0, 5),
      endTime: new Date(start.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5),
    });
    setShowCreateModal(true);
  };

  const handleOpenAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    handleOpenAppointment(event.resource);
  };

  const handleDeleteAppointment = async (appointment: Appointment) => {
    try {
      const result = await deleteAppointment(appointment);
      setAppointments((currentAppointments) =>
        currentAppointments.filter(
          (currentAppointment) => currentAppointment.id !== result.data.id,
        ),
      );
      showToast({
        title: "Appointment Deleted",
        body:
          result.mode === "api"
            ? "Appointment deleted from backend."
            : "Appointment deleted in mock mode.",
        variant: "warning",
      });
      setAppointmentPendingDelete(null);
      setShowDetailsModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      showToast({
        title: "Delete Failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to delete appointment.",
        variant: "danger",
      });
    }
  };

  const handleArchiveAppointment = async (appointment: Appointment) => {
    try {
      const result = await archiveAppointment(appointment);
      setAppointments((currentAppointments) =>
        currentAppointments.map(
          (currentAppointment) =>
            currentAppointment.id === result.data.id
              ? result.data
              : currentAppointment,
        ),
      );
      showToast({
        title: "Appointment Archived",
        body:
          result.mode === "api"
            ? "Appointment archived in backend."
            : "Appointment archived in mock mode.",
        variant: "warning",
      });
      setAppointmentPendingArchive(null);
      setShowDetailsModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      showToast({
        title: "Archive Failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to archive appointment.",
        variant: "danger",
      });
    }
  };

  const availableViews = isMobile
    ? ({
        day: true,
        three_day: ThreeDayView,
        agenda: true,
      } as const)
    : ({
        month: true,
        week: true,
        work_week: TuesdaySaturdayWorkWeekView,
        day: true,
      } as const);

  const calendarView = (
    <div
      className={`calendar-scroll schedule-calendar-shell schedule-calendar-shell-${currentView.replace(
        "_",
        "-",
      )}`}
    >
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        selectable
        popup
        date={currentDate}
        view={currentView as View}
        onNavigate={(date) => setCurrentDate(date)}
        onView={(view) => setCurrentView(view as CalendarViewName)}
        defaultView={getInitialView() as View}
        className="schedule-calendar"
        style={{ height: isMobile ? 560 : 750 }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={(event) => {
          if (currentView === Views.AGENDA) {
            return {
              style: {
                backgroundColor: "transparent",
                borderColor: "transparent",
                color: "inherit",
                boxShadow: "none",
              },
            };
          }

          const statusTheme = getAppointmentStatusTheme(event.resource.status);

          return {
            style: {
              backgroundColor: statusTheme.background,
              borderColor: statusTheme.border,
              color: statusTheme.text,
            },
          };
        }}
        components={{
          toolbar: CustomCalendarToolbar,
          event: CalendarPetEventChip,
          agenda: {
            event: (props) => (
              <MobileAgendaStyleEvent
                {...props}
                owners={owners}
                onEdit={(event) => handleOpenAppointment(event.resource)}
              />
            ),
          },
        }}
        views={availableViews as never}
      />
    </div>
  );

  if (isLoading) {
    return <PageLoader label="Loading schedule..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Appointments</p>
          <h2 className="mb-1">Schedule Appointments</h2>
          <p className="text-muted mb-0">
            Mobile opens in day view with additional 3-day and agenda views.
          </p>
        </div>

        <Button
          variant="primary"
          className="w-100 w-md-auto"
          onClick={() => setShowCreateModal(true)}
        >
          Schedule Appointment
        </Button>
      </div>

      {isMobile ? (
        <Card className="shadow-sm schedule-calendar-card schedule-calendar-launcher-card mb-4">
          <Card.Body className="calendar-card-body">
            <div className="schedule-calendar-launcher">
              <div>
                <Card.Title className="mb-1">Calendar</Card.Title>
                <p className="text-muted small mb-0">
                  Open the calendar in a focused view without the page scroll
                  fighting the time grid.
                </p>
                <div className="mt-2">
                  <CalendarStatusLegend compact />
                </div>
              </div>

              <Button
                variant="outline-primary"
                onClick={() => setShowMobileCalendar(true)}
              >
                View Calendar
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-sm schedule-calendar-card mb-4">
          <Card.Body className="calendar-card-body">
            <div className="schedule-calendar-card-header">
              <div className="schedule-calendar-card-header-main">
                <Card.Title className="mb-0">Calendar</Card.Title>
                <CalendarStatusLegend />
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                className="schedule-calendar-fullscreen-btn"
                onClick={() => setShowMobileCalendar(true)}
              >
                Fullscreen
              </Button>
            </div>
            {calendarView}
          </Card.Body>
        </Card>
      )}

      <PaginatedAppointmentList
        appointments={visibleAppointments}
        owners={owners}
        pets={pets}
        onAppointmentClick={handleOpenAppointment}
      />

      <Modal
        show={showMobileCalendar}
        onHide={() => setShowMobileCalendar(false)}
        fullscreen
        className="schedule-calendar-modal"
      >
        <Modal.Header closeButton>
          <div className="schedule-calendar-modal-header-content">
            <div>
              <Modal.Title>Calendar</Modal.Title>
              <div className="mt-2">
                <CalendarStatusLegend compact={isMobile} />
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>{calendarView}</Modal.Body>
      </Modal>

      <AppointmentFormModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        owners={owners}
        pets={pets}
        initialOwnerId={draft.ownerId}
        initialPetId={draft.petId}
        initialDate={draft.date}
        initialStartTime={draft.startTime}
        initialEndTime={draft.endTime}
        onSaved={(appointment) => {
          setAppointments((currentAppointments) => [
            ...currentAppointments,
            appointment,
          ]);
        }}
      />

      <AppointmentDetailsModal
        show={showDetailsModal}
        onHide={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        owners={owners}
        pets={pets}
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setAppointments((currentAppointments) =>
              currentAppointments.map(
                (appointment) =>
                  appointment.id === updatedAppointment.id
                    ? updatedAppointment
                    : appointment,
              ),
            );
            setSelectedAppointment(null);
            return;
          }

          setAppointments((currentAppointments) =>
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
          setSelectedAppointment(null);
        }}
      />

      <ConfirmDeleteModal
        show={!!appointmentPendingArchive}
        title="Archive Appointment"
        body="Archiving removes the appointment from the visible schedule and appointment list."
        note="Archived appointments can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setAppointmentPendingArchive(null)}
        onConfirm={() => {
          if (appointmentPendingArchive) {
            void handleArchiveAppointment(appointmentPendingArchive);
          }
        }}
      />

      <ConfirmDeleteModal
        show={!!appointmentPendingDelete}
        title="Delete Appointment"
        body="Deleting permanently removes this appointment from the schedule and appointment list."
        note="If you only want to hide it from visible data, use Archive instead. Archived appointments can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setAppointmentPendingDelete(null)}
        onConfirm={() => {
          if (appointmentPendingDelete) {
            void handleDeleteAppointment(appointmentPendingDelete);
          }
        }}
      />
    </>
  );
}
