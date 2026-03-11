import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "react-bootstrap";
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
import { useAppToast } from "../components/common/AppToastProvider";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import { formatAppointmentServices } from "../lib/appointmentServices";
import { archiveAppointment, deleteAppointment } from "../lib/crmApi";
import type { Appointment } from "../types/models";

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

const MOBILE_BREAKPOINT = 768;

function getAppointmentStatusTheme(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return {
        background: "#6c9a71",
        border: "#4f7b55",
        text: "#f7fff8",
        dotClassName: "appointment-status-dot-confirmed",
      };
    case "completed":
      return {
        background: "#98a8a2",
        border: "#788983",
        text: "#f8fbfa",
        dotClassName: "appointment-status-dot-completed",
      };
    case "cancelled":
      return {
        background: "#ca6d6b",
        border: "#aa4f4c",
        text: "#fff8f8",
        dotClassName: "appointment-status-dot-cancelled",
      };
    case "no-show":
      return {
        background: "#e3b24f",
        border: "#bb8a25",
        text: "#4f3a12",
        dotClassName: "appointment-status-dot-no-show",
      };
    case "scheduled":
    default:
      return {
        background: "#2f6b5c",
        border: "#1f5145",
        text: "#f4fffb",
        dotClassName: "appointment-status-dot-scheduled",
      };
  }
}

function MobileAgendaStyleEvent({
  event,
  onEdit,
}: EventProps<CalendarEvent> & { onEdit: (event: CalendarEvent) => void }) {
  const statusTheme = getAppointmentStatusTheme(event.resource.status);

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
            {formatAppointmentServices(event.resource)} • {event.resource.status}
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline-secondary"
        className="agenda-event-edit-btn"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onEdit(event);
        }}
      >
        Edit
      </Button>
    </div>
  );
}

export default function SchedulePage() {
  const { showToast } = useAppToast();

  const getInitialView = (): CalendarViewName =>
    window.innerWidth < MOBILE_BREAKPOINT ? Views.DAY : Views.MONTH;

  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<CalendarViewName>(
    getInitialView,
  );
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      setCurrentView((prev) => {
        if (mobile) {
          if (prev === Views.MONTH || prev === Views.WEEK || prev === Views.WORK_WEEK) {
            return Views.DAY;
          }
          return prev;
        }

        if (prev === "three_day") {
          return Views.DAY;
        }

        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      appointments.map((appt) => {
        const owner = mockOwners.find((o) => o.id === appt.ownerId);
        const pet = mockPets.find((p) => p.id === appt.petId);

        return {
          id: appt.id,
          title: `${pet?.name ?? "Pet"} • ${owner?.firstName ?? ""} ${owner?.lastName ?? ""}`,
          start: new Date(appt.start),
          end: new Date(appt.end),
          resource: appt,
        };
      }),
    [appointments],
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
        currentAppointments.filter(
          (currentAppointment) => currentAppointment.id !== result.data.id,
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
        month: true,
      } as const)
    : ({
        month: true,
        week: true,
        work_week: TuesdaySaturdayWorkWeekView,
        day: true,
      } as const);

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Appointments</p>
          <h2 className="mb-1">Schedule Appointments</h2>
          <p className="text-muted mb-0">
            Mobile opens in day view with an additional compact 3-day view.
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

      <Card className="shadow-sm schedule-calendar-card mb-4">
        <Card.Body className="calendar-card-body">
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
                agenda: {
                  event: (props) => (
                    <MobileAgendaStyleEvent
                      {...props}
                      onEdit={(event) => handleOpenAppointment(event.resource)}
                    />
                  ),
                },
              }}
              views={availableViews as never}
            />
          </div>
        </Card.Body>
      </Card>

      <PaginatedAppointmentList
        appointments={appointments}
        owners={mockOwners}
        pets={mockPets}
        onAppointmentClick={handleOpenAppointment}
        onArchiveAppointment={(appointment) =>
          setAppointmentPendingArchive(appointment)
        }
        onDeleteAppointment={(appointment) => setAppointmentPendingDelete(appointment)}
      />

      <AppointmentFormModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        owners={mockOwners}
        pets={mockPets}
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
        owners={mockOwners}
        pets={mockPets}
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setAppointments((currentAppointments) =>
              currentAppointments.filter(
                (appointment) => appointment.id !== updatedAppointment.id,
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
