import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../lib/crmApi";

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="login-page-shell">
      <Card className="shadow-sm login-card">
        <Card.Body>
          <p className="page-kicker mb-2">Password Reset</p>
          <h2 className="mb-2">Reset Your Password</h2>
          <p className="text-muted mb-4">Enter your account email and we will send a reset link.</p>
          {error && <Alert variant="danger">{error}</Alert>}
          {submitted && <Alert variant="success">If that account exists, a reset email has been sent.</Alert>}
          <Form
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              try {
                await requestPasswordReset(email);
                setSubmitted(true);
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "Unable to request reset.");
              }
            }}
          >
            <Form.Group className="mb-4">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Form.Group>
            <Button type="submit" className="w-100">Send Reset Email</Button>
          </Form>
          <div className="mt-3 text-center">
            <Link to="/login">Back to Sign In</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
