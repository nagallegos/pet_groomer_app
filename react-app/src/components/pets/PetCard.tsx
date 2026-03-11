import { Badge, Button, Card } from "react-bootstrap";
import type { Owner, Pet } from "../../types/models";

interface PetCardProps {
  pet: Pet;
  owner: Owner | null;
  onClick: () => void;
}

export default function PetCard({ pet, owner, onClick }: PetCardProps) {
  return (
    <Card className="shadow-sm h-100 pet-card">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div>
            <Card.Title className="mb-1">{pet.name}</Card.Title>
            <Card.Text className="text-muted small mb-0">
              {owner ? `${owner.firstName} ${owner.lastName}` : "Unknown Owner"}
            </Card.Text>
          </div>

          <Badge bg={pet.species === "dog" ? "primary" : "secondary"}>
            {pet.species}
          </Badge>
        </div>

        <Card.Text className="mb-1">{pet.breed}</Card.Text>
        <Card.Text className="text-muted small mb-3">
          {pet.ageYears ?? "?"} yrs • {pet.weightLbs ?? "?"} lbs
        </Card.Text>

        <div className="mt-auto d-grid">
          <Button variant="primary" onClick={onClick}>
            Open Pet
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
