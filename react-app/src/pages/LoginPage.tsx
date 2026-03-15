import { useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../components/common/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/home";
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="login-page-shell">
      <Card className="shadow-sm login-card">
        <Card.Body>
          <p className="page-kicker mb-2">Sign In</p>
          <h2 className="mb-2">Pet Grooming Manager</h2>
          <p className="text-muted mb-4">Use your assigned account to access the app.</p>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError(null);
              try {
                await login(email, password);
                const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/home";
                navigate(destination, { replace: true });
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>Email or Username</Form.Label>
              <Form.Control value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={isSubmitting}>
              {isSubmitting && <Spinner animation="border" size="sm" className="me-2" />}
              Sign In
            </Button>
          </Form>
          <div className="mt-3 text-center">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
