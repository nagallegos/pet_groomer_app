import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { getApiBaseUrl } from "../lib/crmApi";

type ResponseAction = "confirm" | "cancel" | "reschedule";

interface AppointmentResponseDetails {
  token: string;
  notificationType: string;
  channel: string;
  expiresAt?: string;
  usedAt?: string;
  isExpired: boolean;
  availableActions: ResponseAction[];
  appointment: {
    appointmentId: string;
    ownerName: string;
    petName: string;
    serviceSummary: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  groomerContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

const API_BASE_URL = getApiBaseUrl();

function formatAppointmentDateTime(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const timeZone =
    import.meta.env.VITE_EMAIL_TIMEZONE?.trim() ||
    import.meta.env.VITE_APP_TIMEZONE?.trim() ||
    "America/Chicago";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(parsedDate);
}

export default function AppointmentResponsePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const initialAction = searchParams.get("action") as ResponseAction | null;
  const attemptedEmailActionRef = useRef(false);
  const [details, setDetails] = useState<AppointmentResponseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  useEffect(() => {
    if (!token) {
      setError("This appointment response link is missing its token.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE_URL}/public/appointment-response/${token}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Unable to load appointment." }));
          throw new Error(payload.error ?? "Unable to load appointment.");
        }
        return response.json();
      })
      .then((payload: AppointmentResponseDetails) => {
        if (!cancelled) {
          setDetails(payload);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load appointment.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const markCompletedState = (action: ResponseAction) => {
    setDetails((current) =>
      current
        ? {
            ...current,
            usedAt: new Date().toISOString(),
            availableActions: [],
            appointment: {
              ...current.appointment,
              status: action === "confirm" ? "confirmed" : current.appointment.status,
            },
          }
        : current,
    );
  };

  const submitAction = useCallback(async (
    action: ResponseAction,
    payload?: { clientNote?: string; preferredDate?: string; preferredTime?: string },
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/public/appointment-response/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          source: "public_page",
          ...payload,
        }),
      });
      const result = await response.json().catch(() => ({ error: "Unable to process response." }));
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to process response.");
      }
      setMessage(result.status ?? "Your response has been received.");
      markCompletedState(action);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to process response.");
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  useEffect(() => {
    if (
      !details ||
      initialAction !== "confirm" ||
      attemptedEmailActionRef.current ||
      !details.availableActions.includes("confirm") ||
      message ||
      isSubmitting
    ) {
      return;
    }

    attemptedEmailActionRef.current = true;
    void submitAction("confirm");
  }, [details, initialAction, isSubmitting, message, submitAction]);

  const shouldShowActions =
    Boolean(details) &&
    !details?.usedAt &&
    !details?.isExpired &&
    (details?.availableActions.length ?? 0) > 0;

  return (
    <div className="login-page-shell">
      <Card className="shadow-sm login-card">
        <Card.Body className="d-grid gap-3">
          <div>
            <p className="page-kicker mb-2">Appointment Response</p>
            <h2 className="mb-1">Barks Bubbles & Love</h2>
            <p className="text-muted mb-0">
              Confirm this appointment or let the groomer know you need to cancel or reschedule.
            </p>
          </div>

          {isLoading && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" />
              <span>Loading appointment...</span>
            </div>
          )}

          {error && <Alert variant="danger" className="mb-0">{error}</Alert>}
          {message && <Alert variant="success" className="mb-0">{message}</Alert>}

          {details && !isLoading && (
            <>
              <div className="appointment-detail-summary">
                <div><strong>Pet:</strong> {details.appointment.petName}</div>
                <div><strong>Client:</strong> {details.appointment.ownerName}</div>
                <div><strong>Service:</strong> {details.appointment.serviceSummary}</div>
                <div><strong>Starts:</strong> {formatAppointmentDateTime(details.appointment.startsAt)}</div>
                <div><strong>Ends:</strong> {formatAppointmentDateTime(details.appointment.endsAt)}</div>
                <div><strong>Status:</strong> {details.appointment.status}</div>
              </div>

              <Card className="border-0 bg-light">
                <Card.Body className="d-grid gap-2">
                  <div className="fw-semibold">Need help?</div>
                  <div className="text-muted small">
                    Contact the groomer if you have any issues with this appointment.
                  </div>
                  {details.groomerContact?.name && <div><strong>Name:</strong> {details.groomerContact.name}</div>}
                  {details.groomerContact?.phone && <div><strong>Phone:</strong> {details.groomerContact.phone}</div>}
                  {details.groomerContact?.email && <div><strong>Email:</strong> {details.groomerContact.email}</div>}
                </Card.Body>
              </Card>
            </>
          )}

          {shouldShowActions && (
            <div className="d-grid gap-2">
              {details?.availableActions.includes("confirm") && (
                <Button onClick={() => void submitAction("confirm")} disabled={isSubmitting}>
                  Confirm Appointment
                </Button>
              )}
              {details?.availableActions.includes("cancel") && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowCancelModal(true)}
                  disabled={isSubmitting}
                >
                  Cancel Appointment
                </Button>
              )}
              {details?.availableActions.includes("reschedule") && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowRescheduleModal(true)}
                  disabled={isSubmitting}
                >
                  Request Reschedule
                </Button>
              )}
            </div>
          )}

          {details?.usedAt && (
            <div className="text-muted small">
              Your response has already been received.
            </div>
          )}

          {details?.isExpired && !details.usedAt && (
            <div className="text-muted small">
              This response link has expired. Please contact the groomer directly.
            </div>
          )}

          {initialAction === "confirm" && !isLoading && !error && !message && (
            <div className="text-muted small">
              Processing your confirmation...
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          <p className="mb-0">
            Are you sure you want to cancel this appointment? If you would rather keep the visit and request a different time, choose reschedule instead.
          </p>
          <Form.Group>
            <Form.Label>Cancellation note</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
              placeholder="Let the groomer know why you need to cancel."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowCancelModal(false);
              setShowRescheduleModal(true);
            }}
          >
            I’d Rather Reschedule
          </Button>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            Keep Appointment
          </Button>
          <Button
            variant="danger"
            disabled={isSubmitting || !cancelNote.trim()}
            onClick={async () => {
              await submitAction("cancel", { clientNote: cancelNote.trim() });
              setShowCancelModal(false);
            }}
          >
            {isSubmitting && <Spinner animation="border" size="sm" className="me-2" />}
            Submit Cancellation
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showRescheduleModal} onHide={() => setShowRescheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Request Reschedule</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          <Alert variant="info" className="mb-0">
            The date and time you request are subject to the groomer&apos;s availability. They may not be able to offer the exact slot you request, so please contact the groomer directly to finalize your new appointment.
          </Alert>
          <Form.Group>
            <Form.Label>Preferred date</Form.Label>
            <Form.Control
              type="date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Preferred time</Form.Label>
            <Form.Control
              type="time"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={rescheduleNote}
              onChange={(event) => setRescheduleNote(event.target.value)}
              placeholder="Share what days or times work better for you."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !rescheduleNote.trim()}
            onClick={async () => {
              await submitAction("reschedule", {
                clientNote: rescheduleNote.trim(),
                preferredDate: preferredDate || undefined,
                preferredTime: preferredTime || undefined,
              });
              setShowRescheduleModal(false);
            }}
          >
            {isSubmitting && <Spinner animation="border" size="sm" className="me-2" />}
            Send Reschedule Request
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
