import { Button, Card } from "react-bootstrap";
import type { Owner } from "../../types/models";

interface ClientCardProps {
  owner: Owner;
  onClick: () => void;
}

export default function ClientCard({ owner, onClick }: ClientCardProps) {
  return (
    <Card className="shadow-sm h-100 client-card">
      <Card.Body className="d-flex flex-column">
        <Card.Title className="mb-2">
          {owner.firstName} {owner.lastName}
        </Card.Title>

        <Card.Text className="mb-1">{owner.phone}</Card.Text>
        <Card.Text className="mb-1 text-break">{owner.email}</Card.Text>
        <Card.Text className="text-muted small mb-3">
          Preferred: {owner.preferredContactMethod}
        </Card.Text>

        <div className="mt-auto d-grid">
          <Button variant="primary" onClick={onClick}>
            Open Client
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
