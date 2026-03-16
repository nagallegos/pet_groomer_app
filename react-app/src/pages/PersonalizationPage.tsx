import { useMemo, useState } from "react";
import { Alert, Card, Col, Form, Row } from "react-bootstrap";
import { Palette } from "react-bootstrap-icons";
import { useAppToast } from "../components/common/AppToastProvider";
import { useAuth } from "../components/common/useAuth";
import { useTheme, type ThemeName } from "../components/common/ThemeProvider";

const themeOptions: Array<{
  id: ThemeName;
  label: string;
  description: string;
  swatches: string[];
}> = [
  {
    id: "lavender",
    label: "Lavender Glow",
    description: "The current Barks Bubbles & Love palette.",
    swatches: ["#a88bd4", "#f1b8d8", "#f8f1ff"],
  },
  {
    id: "green",
    label: "Garden Fresh",
    description: "Soft green with minty neutrals.",
    swatches: ["#5aa67a", "#cfe8da", "#f1fbf4"],
  },
  {
    id: "blue",
    label: "Coastal Blue",
    description: "Cool blues with airy highlights.",
    swatches: ["#4a7bd0", "#cfe2ff", "#f5f9ff"],
  },
  {
    id: "pink",
    label: "Rose Petal",
    description: "Warm rose and blush tones.",
    swatches: ["#d986b9", "#f6d7ea", "#fff4fb"],
  },
  {
    id: "white",
    label: "Clean Linen",
    description: "Bright, airy whites with soft accents.",
    swatches: ["#e9eef6", "#ffffff", "#f6f7fb"],
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    description: "Maximum clarity with bold contrast.",
    swatches: ["#000000", "#ffffff", "#fdd835"],
  },
];

export default function PersonalizationPage() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useAppToast();
  const {
    themeName,
    themeMode,
    setThemeName,
    setThemeMode,
    toggleThemeMode,
    isDarkModeAvailable,
  } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => themeOptions.find((option) => option.id === themeName),
    [themeName],
  );

  if (!user) {
    return null;
  }

  const persistTheme = async (nextThemeName: ThemeName, nextThemeMode: "light" | "dark") => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        notifyByEmail: user.notifyByEmail,
        notifyByText: user.notifyByText,
        themeName: nextThemeName,
        themeMode: nextThemeMode,
      });
      showToast({
        title: "Personalization saved",
        body: "Your theme preference was saved to your account.",
        variant: "success",
      });
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save personalization.",
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (nextThemeName: ThemeName) => {
    if (nextThemeName === themeName) {
      return;
    }
    const previous = { name: themeName, mode: themeMode };
    const nextMode = nextThemeName === "high-contrast" ? "light" : themeMode;
    setThemeName(nextThemeName);
    setThemeMode(nextMode);

    try {
      await persistTheme(nextThemeName, nextMode);
    } catch {
      setThemeName(previous.name);
      setThemeMode(previous.mode);
    }
  };

  const handleModeToggle = async () => {
    if (!isDarkModeAvailable) {
      return;
    }
    const nextMode = themeMode === "dark" ? "light" : "dark";
    const previous = { name: themeName, mode: themeMode };
    toggleThemeMode();

    try {
      await persistTheme(themeName, nextMode);
    } catch {
      setThemeName(previous.name);
      setThemeMode(previous.mode);
    }
  };

  return (
    <div className="page-content-wrapper">
      <div className="page-header">
        <span className="page-kicker">Personalization</span>
        <div className="d-flex align-items-start gap-2">
          <div>
            <h2 className="mb-1">Theme preferences</h2>
            <p className="text-muted mb-0">
              Choose the color story that follows you across every device.
            </p>
          </div>
          <span className="personalization-icon">
            <Palette />
          </span>
        </div>
      </div>

      {saveError && (
        <Alert variant="danger" className="mb-3">
          {saveError}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body className="personalization-card-body">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <div className="fw-semibold">Dark mode</div>
              <div className="text-muted small">
                Switch between light and dark for the selected theme.
              </div>
            </div>
            <Form.Check
              type="switch"
              id="personalization-dark-mode"
              label={themeMode === "dark" ? "Dark mode" : "Light mode"}
              checked={themeMode === "dark"}
              onChange={handleModeToggle}
              disabled={!isDarkModeAvailable || isSaving}
            />
          </div>
          {!isDarkModeAvailable && (
            <div className="text-muted small mt-2">
              High-contrast keeps the interface in light mode for maximum clarity.
            </div>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3">
        {themeOptions.map((option) => {
          const isSelected = option.id === themeName;
          return (
            <Col key={option.id} xs={12} md={6} lg={4}>
              <button
                type="button"
                className={`theme-card${isSelected ? " theme-card-selected" : ""}`}
                onClick={() => handleThemeChange(option.id)}
                disabled={isSaving}
              >
                <div className="theme-card-header">
                  <div>
                    <div className="fw-semibold">{option.label}</div>
                    <div className="text-muted small">{option.description}</div>
                  </div>
                  <Form.Check
                    type="radio"
                    name="theme-choice"
                    checked={isSelected}
                    onChange={() => handleThemeChange(option.id)}
                    aria-label={`${option.label} theme`}
                  />
                </div>
                <div className="theme-card-swatches">
                  {option.swatches.map((swatch) => (
                    <span
                      key={swatch}
                      className="theme-card-swatch"
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
                {option.id === "high-contrast" && (
                  <div className="theme-card-pill">High contrast only</div>
                )}
              </button>
            </Col>
          );
        })}
      </Row>

      {selectedOption && (
        <div className="text-muted small mt-4">
          Current theme: <strong>{selectedOption.label}</strong>
        </div>
      )}
    </div>
  );
}
