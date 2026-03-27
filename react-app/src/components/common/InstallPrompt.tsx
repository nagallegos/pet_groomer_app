import { useEffect, useMemo, useState } from "react";
import { Alert, Button } from "react-bootstrap";

const DISMISS_KEY = "barks-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneMode());

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
    } catch {
      setDismissed(false);
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      setIsStandalone(isStandaloneMode());
    };

    handleDisplayModeChange();
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const userAgent = typeof window === "undefined" ? "" : window.navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);
  const shouldShowIosInstructions = useMemo(
    () => isIos && isSafari && !isStandalone,
    [isIos, isSafari, isStandalone],
  );

  const shouldShow = !dismissed && !isStandalone && (Boolean(deferredPrompt) || shouldShowIosInstructions);

  if (!shouldShow) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Ignore storage errors and just hide for this session.
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome !== "accepted") {
      return;
    }

    setDeferredPrompt(null);
    handleDismiss();
  };

  return (
    <Alert variant="light" className="install-prompt-banner d-lg-none" dismissible onClose={handleDismiss}>
      <div className="install-prompt-copy">
        <strong>Install Barks on your phone</strong>
        <span>
          {deferredPrompt
            ? "Add it to your home screen for a full-screen app experience and faster access."
            : "In Safari, tap Share and choose Add to Home Screen to save it like a regular app."}
        </span>
      </div>
      {deferredPrompt ? (
        <Button variant="primary" size="sm" onClick={() => void handleInstall()}>
          Install app
        </Button>
      ) : null}
    </Alert>
  );
}
