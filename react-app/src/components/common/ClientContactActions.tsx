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

  return (
    <div className={stacked ? "client-contact-actions client-contact-actions-stacked" : "client-contact-actions"}>
      <div className="client-contact-row">
        <span className="client-contact-value">{phone}</span>
        <div className="client-contact-buttons">
          <a href={`tel:${normalizedPhone}`} className="client-contact-icon-btn" aria-label={`Call ${phone}`} title="Call">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M6.6 3.5h2.8l1.2 4.1l-1.8 1.8a15.8 15.8 0 0 0 5.8 5.8l1.8-1.8l4.1 1.2v2.8c0 .8-.6 1.5-1.5 1.5C10.4 19 5 13.6 5 5a1.5 1.5 0 0 1 1.6-1.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a href={`sms:${normalizedPhone}`} className="client-contact-icon-btn" aria-label={`Text ${phone}`} title="Text">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8A1.5 1.5 0 0 1 19 17.5H9l-4.5 3v-4H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
      <div className="client-contact-row">
        <span className="client-contact-value text-break">{email}</span>
        <div className="client-contact-buttons">
          <a href={`mailto:${email}`} className="client-contact-icon-btn" aria-label={`Email ${email}`} title="Email">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M4.5 7.5h15A1.5 1.5 0 0 1 21 9v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15V9a1.5 1.5 0 0 1 1.5-1.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m4 8 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
