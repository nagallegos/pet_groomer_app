import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, ListGroup } from "react-bootstrap";
import { useParams } from "react-router-dom";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import { useAppToast } from "../components/common/AppToastProvider";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import useInitialLoading from "../hooks/useInitialLoading";
import { formatAppointmentServices } from "../lib/appointmentServices";
import {
  unarchiveAppointment,
  unarchiveOwner,
  unarchivePet,
} from "../lib/crmApi";
import type { Appointment, Owner, Pet } from "../types/models";

type ArchiveType = "clients" | "pets" | "appointments";

const PAGE_SIZE = 12;

export default function ArchivePage() {
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const { archiveType } = useParams<{ archiveType: ArchiveType }>();
  const [owners, setOwners] = useState<Owner[]>(mockOwners);
  const [pets, setPets] = useState<Pet[]>(mockPets);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);

  const validArchiveType: ArchiveType =
    archiveType === "clients" ||
    archiveType === "pets" ||
    archiveType === "appointments"
      ? archiveType
      : "clients";

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const pageConfig = useMemo(() => {
    switch (validArchiveType) {
      case "pets":
        return {
          title: "Pet Archives",
          searchLabel: "Search Archived Pets",
          searchPlaceholder: "Search by pet, breed, species, or owner",
          filterLabel: "Species",
          filterOptions: ["all", "dog", "cat"],
        };
      case "appointments":
        return {
          title: "Appointment Archives",
          searchLabel: "Search Archived Appointments",
          searchPlaceholder: "Search by client, pet, service, or status",
          filterLabel: "Status",
          filterOptions: ["all", "scheduled", "confirmed", "completed", "cancelled", "no-show"],
        };
      case "clients":
      default:
        return {
          title: "Client Archives",
          searchLabel: "Search Archived Clients",
          searchPlaceholder: "Search by first name, last name, email, or phone",
          filterLabel: "Preferred Contact",
          filterOptions: ["all", "text", "email"],
        };
    }
  }, [validArchiveType]);

  const archivedItems = useMemo(() => {
    if (validArchiveType === "clients") {
      return owners
        .filter((owner) => owner.isArchived)
        .filter((owner) =>
          filterValue === "all" ? true : owner.preferredContactMethod === filterValue,
        )
        .filter((owner) => {
          if (!normalizedSearchTerm) return true;
          return [
            owner.firstName,
            owner.lastName,
            owner.email,
            owner.phone,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearchTerm);
        });
    }

    if (validArchiveType === "pets") {
      return pets
        .filter((pet) => pet.isArchived)
        .filter((pet) => (filterValue === "all" ? true : pet.species === filterValue))
        .filter((pet) => {
          const owner = owners.find((owner) => owner.id === pet.ownerId);
          if (!normalizedSearchTerm) return true;
          return [
            pet.name,
            pet.breed,
            pet.species,
            owner ? `${owner.firstName} ${owner.lastName}` : "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearchTerm);
        });
    }

    return appointments
      .filter((appointment) => appointment.isArchived)
      .filter((appointment) =>
        filterValue === "all" ? true : appointment.status === filterValue,
      )
      .filter((appointment) => {
        const owner = owners.find((item) => item.id === appointment.ownerId);
        const pet = pets.find((item) => item.id === appointment.petId);
        if (!normalizedSearchTerm) return true;
        return [
          owner ? `${owner.firstName} ${owner.lastName}` : "",
          pet?.name ?? "",
          formatAppointmentServices(appointment),
          appointment.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm);
      });
  }, [appointments, filterValue, normalizedSearchTerm, owners, pets, validArchiveType]);

  const totalPages = Math.max(1, Math.ceil(archivedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = archivedItems.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;

    if (validArchiveType === "clients") {
      return owners.find((owner) => owner.id === selectedItemId) ?? null;
    }

    if (validArchiveType === "pets") {
      return pets.find((pet) => pet.id === selectedItemId) ?? null;
    }

    return appointments.find((appointment) => appointment.id === selectedItemId) ?? null;
  }, [appointments, owners, pets, selectedItemId, validArchiveType]);

  const renderItem = (item: Owner | Pet | Appointment) => {
    if (validArchiveType === "clients") {
      const owner = item as Owner;
      return (
        <>
          <div className="fw-semibold">{owner.firstName} {owner.lastName}</div>
          <div className="small text-muted">
            {owner.email} • {owner.phone} • {owner.preferredContactMethod}
          </div>
        </>
      );
    }

    if (validArchiveType === "pets") {
      const pet = item as Pet;
      const owner = owners.find((record) => record.id === pet.ownerId);
      return (
        <>
          <div className="fw-semibold">{pet.name}</div>
          <div className="small text-muted">
            {pet.species} • {pet.breed}
            {owner ? ` • ${owner.firstName} ${owner.lastName}` : ""}
          </div>
        </>
      );
    }

    const appointment = item as Appointment;
    const owner = owners.find((record) => record.id === appointment.ownerId);
    const pet = pets.find((record) => record.id === appointment.petId);

    return (
      <>
        <div className="fw-semibold">
          {pet?.name ?? "Pet"} • {owner?.firstName ?? ""} {owner?.lastName ?? ""}
        </div>
        <div className="small text-muted">
          {new Date(appointment.start).toLocaleString()} •{" "}
          {formatAppointmentServices(appointment)} • {appointment.status}
        </div>
      </>
    );
  };

  const handleUnarchive = async () => {
    if (!selectedItem) return;

    if (validArchiveType === "clients") {
      const result = await unarchiveOwner(selectedItem as Owner);
      setOwners((currentOwners) =>
        currentOwners.map((owner) =>
          owner.id === result.data.id ? result.data : owner,
        ),
      );
    } else if (validArchiveType === "pets") {
      const result = await unarchivePet(selectedItem as Pet);
      setPets((currentPets) =>
        currentPets.map((pet) => (pet.id === result.data.id ? result.data : pet)),
      );
    } else {
      const result = await unarchiveAppointment(selectedItem as Appointment);
      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === result.data.id ? result.data : appointment,
        ),
      );
    }

    showToast({
      title: "Item Unarchived",
      body: "The selected item has been restored to active records.",
      variant: "success",
    });
    setShowUnarchiveModal(false);
    setSelectedItemId(null);
  };

  if (isLoading) {
    return <PageLoader label="Loading archives..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Archives</p>
          <h2 className="mb-1">{pageConfig.title}</h2>
          <p className="text-muted mb-0">
            Search archived records, review them, and restore them to active status.
          </p>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-3 align-items-stretch align-items-lg-end">
            <Form.Group className="flex-grow-1">
              <Form.Label>{pageConfig.searchLabel}</Form.Label>
              <Form.Control
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder={pageConfig.searchPlaceholder}
              />
            </Form.Group>

            <Form.Group className="client-sort-group">
              <Form.Label>{pageConfig.filterLabel}</Form.Label>
              <Form.Select
                value={filterValue}
                onChange={(event) => {
                  setFilterValue(event.target.value);
                  setPage(1);
                }}
              >
                {pageConfig.filterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? `All ${pageConfig.filterLabel}` : option}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
            <div>
              <Card.Title className="mb-1">Archived Items</Card.Title>
              <p className="text-muted small mb-0">
                Showing {archivedItems.length} archived item
                {archivedItems.length === 1 ? "" : "s"}.
              </p>
            </div>
            <Button
              variant="primary"
              disabled={!selectedItemId}
              onClick={() => setShowUnarchiveModal(true)}
            >
              Unarchive Selected
            </Button>
          </div>

          {pagedItems.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No archived items match the current search and filter.
            </Alert>
          ) : (
            <ListGroup variant="flush" className="appointment-list-group">
              {pagedItems.map((item) => {
                const itemId = item.id;
                const isSelected = selectedItemId === itemId;

                return (
                  <ListGroup.Item
                    key={itemId}
                    action
                    active={isSelected}
                    onClick={() => setSelectedItemId(itemId)}
                  >
                    {renderItem(item)}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}

          <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
            <Button
              variant="outline-secondary"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline-secondary"
              disabled={safePage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </Card.Body>
      </Card>

      <ConfirmDeleteModal
        show={showUnarchiveModal}
        title="Unarchive Item"
        body="This will restore the selected record to the active lists and views."
        note="Are you sure you want to unarchive this item?"
        confirmLabel="Unarchive"
        confirmVariant="success"
        onCancel={() => setShowUnarchiveModal(false)}
        onConfirm={() => {
          void handleUnarchive();
        }}
      />
    </>
  );
}
