import { useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { completeAccountSetup } from "../lib/crmApi";

export default function AccountSetupPage() {
  const [searchParams] = useSearchParams();
  const [tempPassword, setTempPassword] = useState("");
  const [username, setUsername] = useState("");
  const [useEmail, setUseEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get("token") ?? "";

  return (
    <div className="login-page-shell">
      <Card className="shadow-sm login-card">
        <Card.Body>
          <p className="page-kicker mb-2">Account Setup</p>
          <h2 className="mb-2">Finish Your Account</h2>
          <p className="text-muted mb-4">Enter the temporary password from your email, then choose your final sign-in details.</p>
          {error && <Alert variant="danger">{error}</Alert>}
          {submitted && <Alert variant="success">Your account is ready. You can sign in now.</Alert>}
          {!submitted && (
            <Form
              onSubmit={async (event) => {
                event.preventDefault();
                setError(null);
                try {
                  await completeAccountSetup({ token, tempPassword, password, username, useEmail });
                  setSubmitted(true);
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "Unable to complete setup.");
                }
              }}
            >
              <Form.Group className="mb-3">
                <Form.Label>Temporary Password</Form.Label>
                <Form.Control type="password" value={tempPassword} onChange={(event) => setTempPassword(event.target.value)} required />
              </Form.Group>
              <Form.Check
                className="mb-3"
                type="switch"
                id="use-email-username"
                label="Use Email as Username"
                checked={useEmail}
                onChange={(event) => setUseEmail(event.target.checked)}
              />
              {!useEmail && (
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control value={username} onChange={(event) => setUsername(event.target.value)} required={!useEmail} />
                </Form.Group>
              )}
              <Form.Group className="mb-4">
                <Form.Label>New Password</Form.Label>
                <Form.Control type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </Form.Group>
              <Button type="submit" className="w-100">Finish Setup</Button>
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
