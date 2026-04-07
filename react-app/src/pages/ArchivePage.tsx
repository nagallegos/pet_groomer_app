import { useMemo, useState } from "react";
import { Alert, Button, Card, Collapse, Form, ListGroup, Modal } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { useAppData } from "../components/common/AppDataProvider";
import { ChevronDownIcon, SearchIcon } from "../components/common/AppIcons";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import { useAppToast } from "../components/common/AppToastProvider";
import useInitialLoading from "../hooks/useInitialLoading";
import { formatAppointmentServices } from "../lib/appointmentServices";
import { getCompactBreedLabel, getDetailedBreedLabel } from "../lib/petBreeds";
import {
  deleteAppointment,
  deleteOwner,
  deletePet,
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
  const {
    owners,
    pets,
    appointments,
    setOwners,
    setPets,
    setAppointments,
  } = useAppData();
  const { archiveType } = useParams<{ archiveType: ArchiveType }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [sortValue, setSortValue] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [groupValue, setGroupValue] = useState("letter");
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);
  const [includeRelatedOnUnarchive, setIncludeRelatedOnUnarchive] = useState(true);
  const [showControls, setShowControls] = useState(false);

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
          description: "Review archived pet records, check ownership details, and restore them when needed.",
          singularLabel: "pet",
          searchLabel: "Search Archived Pets",
          searchPlaceholder: "Search by pet, breed, species, or owner",
          filterLabel: "Species",
          filterOptions: ["all", "dog", "cat"],
          sortOptions: [
            { value: "name", label: "Pet Name" },
            { value: "owner", label: "Owner" },
            { value: "breed", label: "Breed" },
          ],
          groupOptions: [
            { value: "letter", label: "Alphabet" },
            { value: "species", label: "Species" },
            { value: "owner", label: "Owner" },
          ],
        };
      case "appointments":
        return {
          title: "Appointment Archives",
          description: "Browse archived appointments by date, client, or status and restore them to the schedule history.",
          singularLabel: "appointment",
          searchLabel: "Search Archived Appointments",
          searchPlaceholder: "Search by client, pet, service, or status",
          filterLabel: "Status",
          filterOptions: ["all", "scheduled", "confirmed", "completed", "cancelled", "no-show"],
          sortOptions: [
            { value: "date", label: "Appointment Date" },
            { value: "client", label: "Client" },
            { value: "pet", label: "Pet" },
          ],
          groupOptions: [
            { value: "month", label: "Month" },
            { value: "status", label: "Status" },
            { value: "client", label: "Client" },
          ],
        };
      case "clients":
      default:
        return {
          title: "Client Archives",
          description: "Search archived client records, review contact details, and restore them to the active client list.",
          singularLabel: "client",
          searchLabel: "Search Archived Clients",
          searchPlaceholder: "Search by first name, last name, email, or phone",
          filterLabel: "Preferred Contact",
          filterOptions: ["all", "text", "email", "messenger"],
          sortOptions: [
            { value: "name", label: "Client Name" },
            { value: "lastName", label: "Last Name" },
            { value: "email", label: "Email" },
          ],
          groupOptions: [
            { value: "letter", label: "Alphabet" },
            { value: "preferredContactMethod", label: "Preferred Contact" },
          ],
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
        })
        .sort((a, b) => {
          const aValue =
            sortValue === "lastName"
              ? a.lastName
              : sortValue === "email"
                ? a.email
                : `${a.firstName} ${a.lastName}`;
          const bValue =
            sortValue === "lastName"
              ? b.lastName
              : sortValue === "email"
                ? b.email
                : `${b.firstName} ${b.lastName}`;
          const direction = sortDirection === "asc" ? 1 : -1;
          return aValue.localeCompare(bValue, undefined, { sensitivity: "base" }) * direction;
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
            getDetailedBreedLabel(pet),
            pet.species,
            owner ? `${owner.firstName} ${owner.lastName}` : "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearchTerm);
        })
        .sort((a, b) => {
          const aOwner = owners.find((owner) => owner.id === a.ownerId);
          const bOwner = owners.find((owner) => owner.id === b.ownerId);
          const aValue =
            sortValue === "owner"
              ? `${aOwner?.lastName ?? ""} ${aOwner?.firstName ?? ""}`.trim()
              : sortValue === "breed"
                ? getDetailedBreedLabel(a)
                : a.name;
          const bValue =
            sortValue === "owner"
              ? `${bOwner?.lastName ?? ""} ${bOwner?.firstName ?? ""}`.trim()
              : sortValue === "breed"
                ? getDetailedBreedLabel(b)
                : b.name;
          const direction = sortDirection === "asc" ? 1 : -1;
          return aValue.localeCompare(bValue, undefined, { sensitivity: "base" }) * direction;
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
      })
      .sort((a, b) => {
        const aOwner = owners.find((record) => record.id === a.ownerId);
        const bOwner = owners.find((record) => record.id === b.ownerId);
        const aPet = pets.find((record) => record.id === a.petId);
        const bPet = pets.find((record) => record.id === b.petId);
        const direction = sortDirection === "asc" ? 1 : -1;

        if (sortValue === "date") {
          return (new Date(a.start).getTime() - new Date(b.start).getTime()) * direction;
        }

        const aValue =
          sortValue === "client"
            ? `${aOwner?.lastName ?? ""} ${aOwner?.firstName ?? ""}`.trim()
            : aPet?.name ?? "";
        const bValue =
          sortValue === "client"
            ? `${bOwner?.lastName ?? ""} ${bOwner?.firstName ?? ""}`.trim()
            : bPet?.name ?? "";

        return aValue.localeCompare(bValue, undefined, { sensitivity: "base" }) * direction;
      });
  }, [appointments, filterValue, normalizedSearchTerm, owners, pets, sortDirection, sortValue, validArchiveType]);

  const totalPages = Math.max(1, Math.ceil(archivedItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = archivedItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = archivedItems.length === 0 ? 0 : Math.min(archivedItems.length, safePage * PAGE_SIZE);
  const pagedItems = archivedItems.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, Array<Owner | Pet | Appointment>>();

    pagedItems.forEach((item) => {
      let label = "Other";

      if (validArchiveType === "clients") {
        const owner = item as Owner;
        label =
          groupValue === "preferredContactMethod"
            ? owner.preferredContactMethod === "text"
              ? "Text"
              : owner.preferredContactMethod === "email"
                ? "Email"
                : "Messenger"
            : (sortValue === "lastName" ? owner.lastName : owner.firstName)
                .charAt(0)
                .toUpperCase() || "#";
      } else if (validArchiveType === "pets") {
        const pet = item as Pet;
        const owner = owners.find((record) => record.id === pet.ownerId);
        label =
          groupValue === "species"
            ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1)
              : groupValue === "owner"
                ? `${owner?.firstName ?? ""} ${owner?.lastName ?? ""}`.trim() || "Unknown Owner"
                : (sortValue === "owner"
                    ? owner?.lastName ?? ""
                  : sortValue === "breed"
                    ? getDetailedBreedLabel(pet)
                    : pet.name)
                  .charAt(0)
                  .toUpperCase() || "#";
      } else {
        const appointment = item as Appointment;
        const owner = owners.find((record) => record.id === appointment.ownerId);
        label =
          groupValue === "status"
            ? appointment.status
            : groupValue === "client"
              ? `${owner?.lastName ?? ""}${owner?.lastName ? ", " : ""}${owner?.firstName ?? ""}`.trim() ||
                "Unknown Client"
              : new Date(appointment.start).toLocaleString(undefined, {
                  month: "long",
                  year: "numeric",
                });
      }

      const currentGroup = groups.get(label) ?? [];
      currentGroup.push(item);
      groups.set(label, currentGroup);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [groupValue, owners, pagedItems, sortValue, validArchiveType]);

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
            {owner.email} | {owner.phone} | {owner.preferredContactMethod}
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
            {pet.species} | {getCompactBreedLabel(pet)}
            {owner ? ` | ${owner.firstName} ${owner.lastName}` : ""}
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
          {pet?.name ?? "Pet"} | {owner?.firstName ?? ""} {owner?.lastName ?? ""}
        </div>
        <div className="small text-muted">
          {new Date(appointment.start).toLocaleString()} | {formatAppointmentServices(appointment)} | {appointment.status}
        </div>
      </>
    );
  };

  const handleUnarchive = async () => {
    if (!selectedItem) return;

    if (validArchiveType === "clients") {
      const result = await unarchiveOwner(selectedItem as Owner, {
        includeRelated: includeRelatedOnUnarchive,
      });
      setOwners((currentOwners) =>
        currentOwners.map((owner) =>
          owner.id === result.data.id ? result.data : owner,
        ),
      );
      if (includeRelatedOnUnarchive) {
        const selectedOwner = selectedItem as Owner;
        setPets((currentPets) =>
          currentPets.map((pet) =>
            pet.ownerId === selectedOwner.id
              ? { ...pet, isArchived: false, archivedAt: undefined }
              : pet,
          ),
        );
        setAppointments((currentAppointments) =>
          currentAppointments.map((appointment) =>
            appointment.ownerId === selectedOwner.id
              ? { ...appointment, isArchived: false, archivedAt: undefined }
              : appointment,
          ),
        );
      }
    } else if (validArchiveType === "pets") {
      const petToRestore = selectedItem as Pet;
      const result = await unarchivePet(petToRestore);
      setPets((currentPets) =>
        currentPets.map((pet) => (pet.id === result.data.id ? result.data : pet)),
      );
      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.petId === petToRestore.id
            ? { ...appointment, isArchived: false, archivedAt: undefined }
            : appointment,
        ),
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
    setIncludeRelatedOnUnarchive(true);
  };

  const handleDeleteArchivedItem = async () => {
    if (!selectedItem) {
      return;
    }

    if (validArchiveType === "clients") {
      const owner = selectedItem as Owner;
      await deleteOwner(owner);
      setOwners((currentOwners) =>
        currentOwners.filter((currentOwner) => currentOwner.id !== owner.id),
      );
      setPets((currentPets) =>
        currentPets.filter((pet) => pet.ownerId !== owner.id),
      );
      setAppointments((currentAppointments) =>
        currentAppointments.filter((appointment) => appointment.ownerId !== owner.id),
      );
    } else if (validArchiveType === "pets") {
      const pet = selectedItem as Pet;
      await deletePet(pet);
      setPets((currentPets) => currentPets.filter((currentPet) => currentPet.id !== pet.id));
      setAppointments((currentAppointments) =>
        currentAppointments.filter((appointment) => appointment.petId !== pet.id),
      );
    } else {
      const appointment = selectedItem as Appointment;
      await deleteAppointment(appointment);
      setAppointments((currentAppointments) =>
        currentAppointments.filter((currentAppointment) => currentAppointment.id !== appointment.id),
      );
    }

    showToast({
      title: "Item Deleted",
      body: "The archived record was permanently deleted.",
      variant: "warning",
    });
    setShowDeleteModal(false);
    setShowQuickViewModal(false);
    setSelectedItemId(null);
  };

  const selectedOwnerPets = useMemo(() => {
    if (!selectedItem || validArchiveType !== "clients") {
      return [];
    }
    const owner = selectedItem as Owner;
    return pets.filter((pet) => pet.ownerId === owner.id);
  }, [pets, selectedItem, validArchiveType]);

  if (isLoading) {
    return <PageLoader label="Loading archives..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Archives</p>
          <h2 className="mb-1">{pageConfig.title}</h2>
          <p className="text-muted mb-0">{pageConfig.description}</p>
        </div>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body className="search-panel-card">
          <div className="search-panel-header">
            <Form
              className="search-panel-main"
              onSubmit={(event) => event.preventDefault()}
            >
              <Form.Group>
                <Form.Label>{pageConfig.searchLabel}</Form.Label>
                <div className="search-panel-input-row">
                  <Form.Control
                    type="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder={pageConfig.searchPlaceholder}
                  />
                  <Button type="submit" variant="primary" aria-label="Search archives">
                    <SearchIcon className="search-panel-icon" />
                  </Button>
                </div>
              </Form.Group>
            </Form>
          </div>

          <Collapse in={showControls}>
            <div id="archive-search-controls" className="search-panel-controls">
              <div className="search-panel-control-grid">
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

                <Form.Group className="client-sort-group">
                  <Form.Label>Sort Field</Form.Label>
                  <Form.Select
                    value={sortValue}
                    onChange={(event) => setSortValue(event.target.value)}
                  >
                    {pageConfig.sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="client-sort-group">
                  <Form.Label>Sort Order</Form.Label>
                  <Form.Select
                    value={sortDirection}
                    onChange={(event) =>
                      setSortDirection(event.target.value as "asc" | "desc")
                    }
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="client-sort-group">
                  <Form.Label>Group By</Form.Label>
                  <Form.Select
                    value={groupValue}
                    onChange={(event) => setGroupValue(event.target.value)}
                  >
                    {pageConfig.groupOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Collapse>

          <div className="search-panel-corner">
            <Button
              variant={showControls ? "primary" : "outline-secondary"}
              className="search-panel-toggle"
              onClick={() => setShowControls((current) => !current)}
              aria-expanded={showControls}
              aria-controls="archive-search-controls"
              aria-label={showControls ? "Hide filters and sort" : "Show filters and sort"}
            >
              <ChevronDownIcon
                className={`search-panel-caret${showControls ? " search-panel-caret-open" : ""}`}
              />
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm archive-results-card">
        <Card.Body>
          <div className="archive-results-header">
            <div>
              <Card.Title className="mb-1">Archived Items</Card.Title>
              <p className="text-muted small mb-0">
                Showing {rangeStart}-{rangeEnd} of {archivedItems.length} archived {pageConfig.singularLabel}
                {archivedItems.length === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="archive-results-meta">
              <div className="archive-results-chip">Sorted by {sortValue}</div>
              <div className="archive-results-chip">Grouped by {groupValue}</div>
              <div className={`archive-results-chip${selectedItemId ? " archive-results-chip-active" : ""}`}>
                {selectedItemId ? "1 selected" : "0 selected"}
              </div>
              <Button
                variant="primary"
                disabled={!selectedItemId}
                onClick={() => setShowUnarchiveModal(true)}
              >
                Unarchive Selected
              </Button>
              <Button
                variant="outline-secondary"
                disabled={!selectedItemId}
                onClick={() => setShowQuickViewModal(true)}
              >
                View Selected
              </Button>
              <Button
                variant="outline-danger"
                disabled={!selectedItemId}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Selected
              </Button>
            </div>
          </div>

          {pagedItems.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No archived items match the current search and filter.
            </Alert>
          ) : (
            <div className="directory-group-stack">
              {groupedItems.map((group) => (
                <section key={group.label} className="directory-group-section">
                  <div className="directory-group-heading">{group.label}</div>
                  <ListGroup variant="flush" className="appointment-list-group archive-list-group">
                    {group.items.map((item) => {
                      const itemId = item.id;
                      const isSelected = selectedItemId === itemId;

                      return (
                        <ListGroup.Item
                          key={itemId}
                          action
                          active={isSelected}
                          onClick={() => {
                            setSelectedItemId((current) => {
                              if (current === itemId) {
                                return null;
                              }
                              return itemId;
                            });
                            if (!isSelected) {
                              setShowQuickViewModal(true);
                            }
                          }}
                          className="archive-list-item"
                        >
                          <div className="archive-list-item-main">
                            <span
                              aria-hidden="true"
                              className={`archive-list-item-indicator archive-list-item-indicator-${validArchiveType}`}
                            />
                            <div className="archive-list-item-copy">
                              {renderItem(item)}
                            </div>
                          </div>
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </section>
              ))}
            </div>
          )}

          <div className="archive-pagination">
            <Button
              variant="outline-secondary"
              className="appointment-list-page-btn"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous page"
            >
              ‹
            </Button>
            <span className="text-muted small">
              {rangeStart}-{rangeEnd} of {archivedItems.length}
            </span>
            <Button
              variant="outline-secondary"
              className="appointment-list-page-btn"
              disabled={safePage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next page"
            >
              ›
            </Button>
          </div>
        </Card.Body>
      </Card>

      <ConfirmDeleteModal
        show={showUnarchiveModal && validArchiveType !== "clients"}
        title="Unarchive Item"
        body="This will restore the selected record to the active lists and views."
        note={
          validArchiveType === "clients"
            ? "For clients, you can choose to restore related pets, appointments, and notes together."
            : "Are you sure you want to unarchive this item?"
        }
        confirmLabel="Unarchive"
        confirmVariant="success"
        onCancel={() => setShowUnarchiveModal(false)}
        onConfirm={() => {
          void handleUnarchive();
        }}
      />
      <Modal
        show={showUnarchiveModal && validArchiveType === "clients"}
        onHide={() => {
          setShowUnarchiveModal(false);
          setIncludeRelatedOnUnarchive(true);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Unarchive Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="fw-semibold mb-2">Restore this client to active records?</p>
          <p className="mb-3">
            You can restore only the client, or restore the client plus all related pets,
            appointments, and notes.
          </p>
          <Form.Check
            type="switch"
            id="include-related-unarchive"
            label="Also unarchive related pets, appointments, and notes"
            checked={includeRelatedOnUnarchive}
            onChange={(event) => setIncludeRelatedOnUnarchive(event.target.checked)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowUnarchiveModal(false);
              setIncludeRelatedOnUnarchive(true);
            }}
          >
            Keep It
          </Button>
          <Button
            variant="success"
            onClick={() => {
              void handleUnarchive();
            }}
          >
            Unarchive
          </Button>
        </Modal.Footer>
      </Modal>
      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete Archived Item"
        body="Deleting permanently removes this archived record from the system."
        note="This action cannot be undone."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          void handleDeleteArchivedItem();
        }}
      />
      <Modal
        show={showQuickViewModal}
        onHide={() => setShowQuickViewModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Archived Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!selectedItem && (
            <p className="text-muted mb-0">No item selected.</p>
          )}
          {selectedItem && validArchiveType === "clients" && (
            <div className="d-grid gap-2">
              <div className="fw-semibold">
                {(selectedItem as Owner).firstName} {(selectedItem as Owner).lastName}
              </div>
              <div className="text-muted small">{(selectedItem as Owner).email}</div>
              <div className="text-muted small">{(selectedItem as Owner).phone}</div>
              <div className="text-muted small">
                Preferred contact: {(selectedItem as Owner).preferredContactMethod}
              </div>
              <div className="text-muted small">
                Archived pets: {selectedOwnerPets.length}
              </div>
            </div>
          )}
          {selectedItem && validArchiveType === "pets" && (
            <div className="d-grid gap-2">
              <div className="fw-semibold">{(selectedItem as Pet).name}</div>
              <div className="text-muted small">
                {(selectedItem as Pet).species} - {getDetailedBreedLabel(selectedItem as Pet)}
              </div>
              <div className="text-muted small">
                Owner: {owners.find((owner) => owner.id === (selectedItem as Pet).ownerId)?.firstName ?? "Unknown"}{" "}
                {owners.find((owner) => owner.id === (selectedItem as Pet).ownerId)?.lastName ?? ""}
              </div>
            </div>
          )}
          {selectedItem && validArchiveType === "appointments" && (
            <div className="d-grid gap-2">
              <div className="fw-semibold">
                {new Date((selectedItem as Appointment).start).toLocaleString()}
              </div>
              <div className="text-muted small">
                Status: {(selectedItem as Appointment).status}
              </div>
              <div className="text-muted small">
                Service: {formatAppointmentServices(selectedItem as Appointment)}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-danger" onClick={() => setShowDeleteModal(true)} disabled={!selectedItem}>
            Delete Permanently
          </Button>
          <Button variant="secondary" onClick={() => setShowQuickViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
