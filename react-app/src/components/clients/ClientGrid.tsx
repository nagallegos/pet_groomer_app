import { Button, Col, ListGroup, Row } from "react-bootstrap";
import type { Owner } from "../../types/models";
import ClientCard from "./ClientCard";

type ClientViewMode = "card" | "list";

interface ClientGridProps {
  owners: Owner[];
  onClientClick: (owner: Owner) => void;
  viewMode: ClientViewMode;
}

export default function ClientGrid({
  owners,
  onClientClick,
  viewMode,
}: ClientGridProps) {
  if (owners.length === 0) {
    return (
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="mb-2">No matching clients</h5>
          <p className="text-muted mb-0">
            Try a different name or adjust the sort and search filters.
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <ListGroup variant="flush" className="client-list-view">
            {owners.map((owner) => (
              <ListGroup.Item key={owner.id}>
                <Button
                  variant="link"
                  className="client-list-item"
                  onClick={() => onClientClick(owner)}
                >
                  {owner.firstName} {owner.lastName}
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      </div>
    );
  }

  return (
    <Row className="g-3">
      {owners.map((owner) => (
        <Col md={6} xl={4} key={owner.id}>
          <ClientCard owner={owner} onClick={() => onClientClick(owner)} />
        </Col>
      ))}
    </Row>
  );
}
