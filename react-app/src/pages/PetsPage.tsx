import { useMemo, useState } from "react";
import { Button, Card, Form } from "react-bootstrap";
import { useAppToast } from "../components/common/AppToastProvider";
import PetFormModal from "../components/pets/PetFormModal";
import PetGrid from "../components/pets/PetGrid";
import PetQuickViewModal from "../components/pets/PetQuickViewModal";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import type { Owner, Pet } from "../types/models";

type SortField = "name" | "breed" | "species" | "owner";
type SortDirection = "asc" | "desc";
type PetViewMode = "card" | "list";

export default function PetsPage() {
  const { showToast } = useAppToast();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>(mockPets);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<PetViewMode>("card");
  const [showAddPetModal, setShowAddPetModal] = useState(false);

  const ownersById = useMemo(
    () => new Map<string, Owner>(mockOwners.map((owner) => [owner.id, owner])),
    [],
  );

  const normalizedSearchInput = searchInput.trim().toLowerCase();
  const normalizedActiveSearchTerm = activeSearchTerm.trim().toLowerCase();

  const filteredAndSortedPets = useMemo(() => {
    const filteredPets = pets.filter((pet) => {
      const owner = ownersById.get(pet.ownerId);
      const ownerName = owner
        ? `${owner.firstName} ${owner.lastName}`.toLowerCase()
        : "";

      if (!normalizedActiveSearchTerm) return true;

      return (
        pet.name.toLowerCase().includes(normalizedActiveSearchTerm) ||
        pet.breed.toLowerCase().includes(normalizedActiveSearchTerm) ||
        pet.species.toLowerCase().includes(normalizedActiveSearchTerm) ||
        ownerName.includes(normalizedActiveSearchTerm)
      );
    });

    return [...filteredPets].sort((a, b) => {
      const aOwner = ownersById.get(a.ownerId);
      const bOwner = ownersById.get(b.ownerId);
      const aValue =
        sortField === "owner"
          ? `${aOwner?.firstName ?? ""} ${aOwner?.lastName ?? ""}`.trim()
          : a[sortField];
      const bValue =
        sortField === "owner"
          ? `${bOwner?.firstName ?? ""} ${bOwner?.lastName ?? ""}`.trim()
          : b[sortField];

      const primaryComparison = aValue.localeCompare(bValue, undefined, {
        sensitivity: "base",
      });

      if (primaryComparison !== 0) {
        return sortDirection === "asc" ? primaryComparison : -primaryComparison;
      }

      const fallbackComparison = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });

      return sortDirection === "asc" ? fallbackComparison : -fallbackComparison;
    });
  }, [normalizedActiveSearchTerm, ownersById, pets, sortDirection, sortField]);

  const searchSuggestions = useMemo(() => {
    if (!normalizedSearchInput) return [];

    return pets
      .filter((pet) => {
        const owner = ownersById.get(pet.ownerId);
        const ownerName = owner
          ? `${owner.firstName} ${owner.lastName}`.toLowerCase()
          : "";

        return (
          pet.name.toLowerCase().includes(normalizedSearchInput) ||
          pet.breed.toLowerCase().includes(normalizedSearchInput) ||
          pet.species.toLowerCase().includes(normalizedSearchInput) ||
          ownerName.includes(normalizedSearchInput)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      .slice(0, 6);
  }, [normalizedSearchInput, ownersById, pets]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearchTerm(searchInput);
    setShowSuggestions(false);
  };

  const handleSuggestionSelect = (pet: Pet) => {
    setSearchInput(pet.name);
    setActiveSearchTerm(pet.name);
    setShowSuggestions(false);
  };

  const selectedPetOwner = useMemo(() => {
    if (!selectedPet) return null;
    return ownersById.get(selectedPet.ownerId) ?? null;
  }, [ownersById, selectedPet]);

  const selectedPetAppointments = useMemo(() => {
    if (!selectedPet) return [];
    return mockAppointments.filter((appointment) => appointment.petId === selectedPet.id);
  }, [selectedPet]);

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Pets</p>
          <h2 className="mb-1">Pet Directory</h2>
          <p className="text-muted mb-0">
            Browse pets by name, breed, species, and owner.
          </p>
        </div>

        <Button
          variant="primary"
          className="w-100 w-md-auto"
          onClick={() => setShowAddPetModal(true)}
        >
          + Add Pet
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
                <Form.Label>Search Pets</Form.Label>
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
                    placeholder="Search by pet, breed, species, or owner"
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
                    {searchSuggestions.map((pet) => {
                      const owner = ownersById.get(pet.ownerId);
                      return (
                        <button
                          key={pet.id}
                          type="button"
                          className="client-search-suggestion"
                          onClick={() => handleSuggestionSelect(pet)}
                        >
                          <span className="fw-semibold">{pet.name}</span>
                          <span className="text-muted small">
                            {pet.breed}
                            {owner ? ` • ${owner.firstName} ${owner.lastName}` : ""}
                          </span>
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
                <option value="name">Pet Name</option>
                <option value="breed">Breed</option>
                <option value="species">Species</option>
                <option value="owner">Owner</option>
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
              Showing {filteredAndSortedPets.length} pet
              {filteredAndSortedPets.length === 1 ? "" : "s"} sorted by{" "}
              {sortField === "name"
                ? "pet name"
                : sortField === "owner"
                  ? "owner"
                  : sortField}{" "}
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

      <PetGrid
        pets={filteredAndSortedPets}
        ownersById={ownersById}
        onPetClick={setSelectedPet}
        viewMode={viewMode}
      />

      <PetQuickViewModal
        show={!!selectedPet}
        pet={selectedPet}
        owner={selectedPetOwner}
        appointments={selectedPetAppointments}
        onHide={() => setSelectedPet(null)}
      />

      <PetFormModal
        show={showAddPetModal}
        onHide={() => setShowAddPetModal(false)}
        owners={mockOwners}
        onSaved={(pet) => {
          setPets((currentPets) => [...currentPets, pet]);
          showToast({
            title: "Pet Added",
            body: "Pet created and ready for backend persistence.",
            variant: "success",
          });
        }}
      />
    </>
  );
}
