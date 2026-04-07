import { Button, Col, ListGroup, Row } from "react-bootstrap";
import { getCompactBreedLabel } from "../../lib/petBreeds";
import type { Owner, Pet } from "../../types/models";
import PetCard from "./PetCard";

type PetViewMode = "card" | "list";

interface PetGridProps {
  pets: Pet[];
  ownersById: Map<string, Owner>;
  onPetClick: (pet: Pet) => void;
  viewMode: PetViewMode;
}

export default function PetGrid({
  pets,
  ownersById,
  onPetClick,
  viewMode,
}: PetGridProps) {
  if (pets.length === 0) {
    return (
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="mb-2">No matching pets</h5>
          <p className="text-muted mb-0">
            Try a different search or adjust the sort filters.
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <ListGroup variant="flush" className="pet-list-view">
            {pets.map((pet) => {
              const owner = ownersById.get(pet.ownerId);

              return (
                <ListGroup.Item key={pet.id}>
                  <Button
                    variant="link"
                    className="pet-list-item"
                    onClick={() => onPetClick(pet)}
                  >
                    <span className="pet-list-primary">{pet.name}</span>
                    <span className="pet-list-secondary">
                      {getCompactBreedLabel(pet)}
                      {owner
                        ? ` • ${owner.firstName} ${owner.lastName}`
                        : ""}
                    </span>
                  </Button>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </div>
      </div>
    );
  }

  return (
    <Row className="g-3">
      {pets.map((pet) => (
        <Col md={6} xl={4} key={pet.id}>
          <PetCard
            pet={pet}
            owner={ownersById.get(pet.ownerId) ?? null}
            onClick={() => onPetClick(pet)}
          />
        </Col>
      ))}
    </Row>
  );
}
