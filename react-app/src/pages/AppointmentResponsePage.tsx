import { useEffect, useState } from "react";
import { Alert, Button, Card, Spinner } from "react-bootstrap";
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
}

const API_BASE_URL = getApiBaseUrl();

export default function AppointmentResponsePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const initialAction = searchParams.get("action") as ResponseAction | null;
  const [details, setDetails] = useState<AppointmentResponseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!details || !initialAction || !details.availableActions.includes(initialAction) || message || isSubmitting) {
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/public/appointment-response/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: initialAction }),
        });
        const payload = await response.json().catch(() => ({ error: "Unable to process response." }));
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to process response.");
        }
        setMessage(payload.status ?? "Your response was received.");
        setDetails((current) =>
          current
            ? {
                ...current,
                usedAt: new Date().toISOString(),
                availableActions: [],
                appointment: {
                  ...current.appointment,
                  status: initialAction === "confirm" ? "confirmed" : current.appointment.status,
                },
              }
            : current,
        );
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to process response.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [details, initialAction, isSubmitting, message, token]);

  const handleAction = async (action: ResponseAction) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/public/appointment-response/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({ error: "Unable to process response." }));
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to process response.");
      }
      setMessage(payload.status ?? "Your response was received.");
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
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to process response.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="appointment-detail-summary">
              <div><strong>Pet:</strong> {details.appointment.petName}</div>
              <div><strong>Client:</strong> {details.appointment.ownerName}</div>
              <div><strong>Service:</strong> {details.appointment.serviceSummary}</div>
              <div><strong>Starts:</strong> {details.appointment.startsAt}</div>
              <div><strong>Ends:</strong> {details.appointment.endsAt}</div>
              <div><strong>Status:</strong> {details.appointment.status}</div>
            </div>
          )}

          {details && !details.usedAt && !details.isExpired && details.availableActions.length > 0 && (
            <div className="d-grid gap-2">
              {details.availableActions.map((action) => (
                <Button
                  key={action}
                  onClick={() => {
                    void handleAction(action);
                  }}
                  disabled={isSubmitting}
                  variant={action === "confirm" ? "primary" : "outline-secondary"}
                >
                  {action === "confirm"
                    ? "Confirm Appointment"
                    : action === "cancel"
                      ? "Request Cancellation"
                      : "Request Reschedule"}
                </Button>
              ))}
            </div>
          )}

          {details?.usedAt && (
            <div className="text-muted small">
              This response link has already been used.
            </div>
          )}

          {details?.isExpired && !details.usedAt && (
            <div className="text-muted small">
              This response link has expired. Please contact the groomer directly.
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
