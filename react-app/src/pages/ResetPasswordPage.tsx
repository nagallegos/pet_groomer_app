import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../lib/crmApi";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get("token") ?? "";

  return (
    <div className="login-page-shell">
      <Card className="shadow-sm login-card">
        <Card.Body>
          <p className="page-kicker mb-2">Password Reset</p>
          <h2 className="mb-2">Choose a New Password</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          {submitted && <Alert variant="success">Your password has been reset. You can sign in now.</Alert>}
          {!submitted && (
            <Form
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                try {
                  await resetPassword(token, password);
                  setSubmitted(true);
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "Unable to reset password.");
                }
              }}
            >
              <Form.Group className="mb-4">
                <Form.Label>New Password</Form.Label>
                <Form.Control type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </Form.Group>
              <Button type="submit" className="w-100">Reset Password</Button>
            </Form>
          )}
          <div className="mt-3 text-center">
            <Link to="/login">Back to Sign In</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
