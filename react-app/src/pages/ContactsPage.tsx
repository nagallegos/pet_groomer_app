import { useMemo, useState } from "react";
import { Button, Card, Form } from "react-bootstrap";
import { useAppToast } from "../components/common/AppToastProvider";
import PageLoader from "../components/common/PageLoader";
import ClientGrid from "../components/clients/ClientGrid";
import ClientQuickViewModal from "../components/clients/ClientQuickViewModal";
import ClientFormModal from "../components/clients/ClientFormModal";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import useInitialLoading from "../hooks/useInitialLoading";
import type { Owner } from "../types/models";

type SortField = "firstName" | "lastName";
type SortDirection = "asc" | "desc";
type ClientViewMode = "card" | "list";

export default function ContactsPage() {
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const [selectedClient, setSelectedClient] = useState<Owner | null>(null);
  const [owners, setOwners] = useState<Owner[]>(mockOwners);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("firstName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<ClientViewMode>("card");

  const normalizedSearchInput = searchInput.trim().toLowerCase();
  const normalizedActiveSearchTerm = activeSearchTerm.trim().toLowerCase();

  const filteredAndSortedOwners = useMemo(() => {
    const filteredOwners = owners.filter((owner) => {
      if (!normalizedActiveSearchTerm) return true;

      return (
        owner.firstName.toLowerCase().includes(normalizedActiveSearchTerm) ||
        owner.lastName.toLowerCase().includes(normalizedActiveSearchTerm) ||
        `${owner.firstName} ${owner.lastName}`
          .toLowerCase()
          .includes(normalizedActiveSearchTerm)
      );
    });

    return [...filteredOwners].sort((a, b) => {
      const primaryComparison = a[sortField].localeCompare(b[sortField], undefined, {
        sensitivity: "base",
      });

      if (primaryComparison !== 0) {
        return sortDirection === "asc" ? primaryComparison : -primaryComparison;
      }

      const fallbackComparison = a.firstName.localeCompare(b.firstName, undefined, {
        sensitivity: "base",
      });

      return sortDirection === "asc" ? fallbackComparison : -fallbackComparison;
    });
  }, [normalizedActiveSearchTerm, owners, sortDirection, sortField]);

  const searchSuggestions = useMemo(() => {
    if (!normalizedSearchInput) return [];

    return owners
      .filter((owner) => {
        return (
          owner.firstName.toLowerCase().includes(normalizedSearchInput) ||
          owner.lastName.toLowerCase().includes(normalizedSearchInput) ||
          `${owner.firstName} ${owner.lastName}`
            .toLowerCase()
            .includes(normalizedSearchInput)
        );
      })
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
          undefined,
          { sensitivity: "base" },
        ),
      )
      .slice(0, 6);
  }, [normalizedSearchInput, owners]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearchTerm(searchInput);
    setShowSuggestions(false);
  };

  const handleSuggestionSelect = (owner: Owner) => {
    const fullName = `${owner.firstName} ${owner.lastName}`;
    setSearchInput(fullName);
    setActiveSearchTerm(fullName);
    setShowSuggestions(false);
  };

  const selectedClientPets = useMemo(() => {
    if (!selectedClient) return [];
    return mockPets.filter((pet) => pet.ownerId === selectedClient.id);
  }, [selectedClient]);

  const selectedClientAppointments = useMemo(() => {
    if (!selectedClient) return [];
    return mockAppointments.filter(
      (appt) => appt.ownerId === selectedClient.id,
    );
  }, [selectedClient]);

  if (isLoading) {
    return <PageLoader label="Loading clients..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Clients</p>
          <h2 className="mb-1">Client Contacts</h2>
          <p className="text-muted mb-0">
            Manage pet owners and view upcoming appointments.
          </p>
        </div>

        <Button
          variant="primary"
          className="w-100 w-md-auto"
          onClick={() => setShowAddClientModal(true)}
        >
          + Add Client
        </Button>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-3 align-items-stretch align-items-lg-end">
            <Form
              className="client-search-group flex-grow-1 position-relative"
              onSubmit={handleSearchSubmit}
            >
              <Form.Group>
                <Form.Label>Search Clients</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="search"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (normalizedSearchInput) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Search by first or last name"
                  />
                  <Button type="submit" variant="primary">
                    Search
                  </Button>
                </div>
              </Form.Group>

              {showSuggestions &&
                searchSuggestions.length > 0 &&
                normalizedSearchInput && (
                  <div className="client-search-suggestions mt-2">
                    {searchSuggestions.map((owner) => {
                      const fullName = `${owner.firstName} ${owner.lastName}`;

                      return (
                        <button
                          key={owner.id}
                          type="button"
                          className="client-search-suggestion"
                          onClick={() => handleSuggestionSelect(owner)}
                        >
                          <span className="fw-semibold">{fullName}</span>
                          <span className="text-muted small">{owner.email}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
            </Form>

            <Form.Group className="client-sort-group">
              <Form.Label>Sort Field</Form.Label>
              <Form.Select
                value={sortField}
                onChange={(event) => setSortField(event.target.value as SortField)}
              >
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="client-sort-group">
              <Form.Label>Sort Order</Form.Label>
              <Form.Select
                value={sortDirection}
                onChange={(event) =>
                  setSortDirection(event.target.value as SortDirection)
                }
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="client-view-group">
              <Form.Label>View</Form.Label>
              <div className="client-view-toggle">
                <Button
                  variant={viewMode === "card" ? "primary" : "outline-primary"}
                  onClick={() => setViewMode("card")}
                >
                  Card View
                </Button>
                <Button
                  variant={viewMode === "list" ? "primary" : "outline-primary"}
                  onClick={() => setViewMode("list")}
                >
                  List View
                </Button>
              </div>
            </Form.Group>
          </div>

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mt-3">
            <p className="text-muted small mb-0">
              Showing {filteredAndSortedOwners.length} client
              {filteredAndSortedOwners.length === 1 ? "" : "s"} sorted by{" "}
              {sortField === "firstName" ? "first name" : "last name"}{" "}
              {sortDirection === "asc" ? "ascending" : "descending"}.
            </p>

            {activeSearchTerm && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setActiveSearchTerm("");
                  setShowSuggestions(false);
                }}
              >
                Clear Search
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <ClientGrid
        owners={filteredAndSortedOwners}
        onClientClick={setSelectedClient}
        viewMode={viewMode}
      />

      <ClientQuickViewModal
        show={!!selectedClient}
        owner={selectedClient}
        pets={selectedClientPets}
        appointments={selectedClientAppointments}
        onHide={() => setSelectedClient(null)}
        onOwnerArchived={(ownerId) => {
          setOwners((currentOwners) =>
            currentOwners.filter((owner) => owner.id !== ownerId),
          );
          setSelectedClient(null);
        }}
        onOwnerDeleted={(ownerId) => {
          setOwners((currentOwners) =>
            currentOwners.filter((owner) => owner.id !== ownerId),
          );
          setSelectedClient(null);
        }}
      />

      <ClientFormModal
        show={showAddClientModal}
        onHide={() => setShowAddClientModal(false)}
        onSaved={(owner) => {
          setOwners((currentOwners) => [...currentOwners, owner]);
          showToast({
            title: "Client Added",
            body: "Client created and ready for backend persistence.",
            variant: "success",
          });
        }}
      />
    </>
  );
}
