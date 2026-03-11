import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { useAppToast } from "../common/AppToastProvider";
import {
  APPOINTMENT_SERVICE_OPTIONS,
  derivePrimaryServiceType,
} from "../../lib/appointmentServices";
import { saveAppointment } from "../../lib/crmApi";
import type { Appointment, Owner, Pet } from "../../types/models";

interface AppointmentFormModalProps {
  show: boolean;
  onHide: () => void;
  owners: Owner[];
  pets: Pet[];
  initialOwnerId?: string;
  initialPetId?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onSaved?: (appointment: Appointment) => void;
}

export default function AppointmentFormModal({
  show,
  onHide,
  owners,
  pets,
  initialOwnerId = "",
  initialPetId = "",
  initialDate = "",
  initialStartTime = "",
  initialEndTime = "",
  onSaved,
}: AppointmentFormModalProps) {
  const { showToast } = useAppToast();
  const [ownerId, setOwnerId] = useState(initialOwnerId);
  const [petId, setPetId] = useState(initialPetId);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServiceType, setCustomServiceType] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setOwnerId(initialOwnerId);
      setPetId(initialPetId);
      setDate(initialDate);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setSelectedServices([]);
      setCustomServiceType("");
      setCost("");
      setNotes("");
      setSaveError(null);
    }
  }, [
    show,
    initialOwnerId,
    initialPetId,
    initialDate,
    initialStartTime,
    initialEndTime,
  ]);

  const activeOwners = useMemo(
    () => owners.filter((owner) => !owner.isArchived),
    [owners],
  );

  const availablePets = useMemo(() => {
    if (!ownerId) return [];
    return pets.filter((pet) => pet.ownerId === ownerId && !pet.isArchived);
  }, [ownerId, pets]);

  const customSelected = selectedServices.includes("Custom");

  const toggleService = (service: string) => {
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service],
    );
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (end <= start) {
      setSaveError("End time must be after start time.");
      setIsSaving(false);
      return;
    }

    const payload = {
      ownerId,
      petId,
      start: start.toISOString(),
      end: end.toISOString(),
      serviceType: derivePrimaryServiceType(selectedServices),
      selectedServices,
      customServiceType: customSelected ? customServiceType : undefined,
      cost: Number(cost) || 0,
      notes,
      status: "scheduled" as const,
    };

    try {
      const result = await saveAppointment(payload);
      showToast({
        title: "Appointment Saved",
        body:
          result.mode === "api"
            ? "Appointment saved to backend."
            : "Appointment saved in mock mode. Connect VITE_API_BASE_URL later to persist to MongoDB.",
        variant: "success",
      });
      onSaved?.(result.data);
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save appointment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Schedule Appointment</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {saveError && (
            <Alert variant="danger" className="mb-3">
              {saveError}
            </Alert>
          )}

          <Form.Group className="mb-3" controlId="clientSelect">
            <Form.Label id="clientLabel">Client</Form.Label>
            <Form.Select
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                setPetId("");
              }}
              required
              aria-labelledby="clientLabel"
            >
              <option value="">Select a client</option>
              {activeOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.firstName} {owner.lastName}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="petSelect">
            <Form.Label id="petLabel">Pet</Form.Label>
            <Form.Select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              required
              disabled={!ownerId}
              aria-labelledby="petLabel"
            >
              <option value="">Select a pet</option>
              {availablePets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} — {pet.breed}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label id="dateLabel">Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              title="Select appointment date"
              aria-labelledby="dateLabel"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label id="startTimeLabel">Start Time</Form.Label>
            <Form.Control
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              title="Select appointment start time"
              aria-labelledby="startTimeLabel"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label id="endTimeLabel">End Time</Form.Label>
            <Form.Control
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              title="Select appointment end time"
              aria-labelledby="endTimeLabel"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label id="serviceTypeLabel">Services</Form.Label>
            <div
              className="service-option-grid"
              role="group"
              aria-labelledby="serviceTypeLabel"
            >
              {APPOINTMENT_SERVICE_OPTIONS.map((service) => (
                <Form.Check
                  key={service}
                  type="checkbox"
                  id={`service-${service}`}
                  label={service}
                  checked={selectedServices.includes(service)}
                  onChange={() => toggleService(service)}
                />
              ))}
            </div>
          </Form.Group>

          {customSelected && (
            <Form.Group className="mb-3">
              <Form.Label id="customServiceTypeLabel">Custom Service</Form.Label>
              <Form.Control
                type="text"
                value={customServiceType}
                onChange={(e) => setCustomServiceType(e.target.value)}
                placeholder="Describe the custom service"
                title="Enter custom service type"
                aria-labelledby="customServiceTypeLabel"
              />
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label id="costLabel">Projected Cost</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="85.00"
              title="Enter projected appointment cost"
              aria-labelledby="costLabel"
            />
          </Form.Group>

          <Form.Group>
            <Form.Label id="notesLabel">Appointment Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any grooming notes or instructions..."
              title="Enter appointment notes"
              aria-labelledby="notesLabel"
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            Save Appointment
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
