import { Button, Card } from "react-bootstrap";
import ClientContactActions from "../common/ClientContactActions";
import type { Owner } from "../../types/models";

interface ClientCardProps {
  owner: Owner;
  onClick: () => void;
}

export default function ClientCard({ owner, onClick }: ClientCardProps) {
  return (
    <Card className="shadow-sm h-100 client-card">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <Card.Title className="mb-0">
            {owner.firstName} {owner.lastName}
          </Card.Title>
          <span className={`user-status-badge${owner.hasPortalAccount ? "" : " user-status-badge-inactive"}`}>
            {owner.hasPortalAccount ? "Portal account" : "No portal"}
          </span>
        </div>

        <ClientContactActions phone={owner.phone} email={owner.email} stacked />
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
