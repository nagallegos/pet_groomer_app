import { Card, Spinner } from "react-bootstrap";

interface PageLoaderProps {
  label?: string;
}

export default function PageLoader({
  label = "Loading data...",
}: PageLoaderProps) {
  return (
    <Card className="shadow-sm page-loader-card">
      <Card.Body className="page-loader-body">
        <Spinner animation="border" role="status" className="page-loader-spinner" />
        <div className="page-loader-text">{label}</div>
      </Card.Body>
    </Card>
  );
}
