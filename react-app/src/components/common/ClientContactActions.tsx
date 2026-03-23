import { ChatDots, Envelope, Telephone } from "react-bootstrap-icons";

interface ClientContactActionsProps {
  phone: string;
  email: string;
  stacked?: boolean;
}

function normalizePhone(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");

  if (normalized.startsWith("+")) {
    return normalized;
  }

  const digitsOnly = normalized.replace(/\D/g, "");
  return digitsOnly;
}

export default function ClientContactActions({
  phone,
  email,
  stacked = false,
}: ClientContactActionsProps) {
  const normalizedPhone = normalizePhone(phone);
  const hasPhone = Boolean(phone.trim());
  const hasEmail = Boolean(email.trim());

  return (
    <div className={stacked ? "client-contact-actions client-contact-actions-stacked" : "client-contact-actions"}>
      <div className="client-contact-row">
        <span className="client-contact-value">{hasPhone ? phone : "No phone on file"}</span>
        <div className="client-contact-buttons">
          {hasPhone && (
            <>
              <a href={`tel:${normalizedPhone}`} className="client-contact-icon-btn" aria-label={`Call ${phone}`} title="Call">
                <Telephone aria-hidden="true" />
              </a>
              <a href={`sms:${normalizedPhone}`} className="client-contact-icon-btn" aria-label={`Text ${phone}`} title="Text">
                <ChatDots aria-hidden="true" />
              </a>
            </>
          )}
        </div>
      </div>
      <div className="client-contact-row">
        <span className="client-contact-value text-break">{hasEmail ? email : "No email on file"}</span>
        <div className="client-contact-buttons">
          {hasEmail && (
            <a href={`mailto:${email}`} className="client-contact-icon-btn" aria-label={`Email ${email}`} title="Email">
              <Envelope aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
