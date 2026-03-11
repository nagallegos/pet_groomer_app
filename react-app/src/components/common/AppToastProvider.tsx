import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Toast, ToastContainer } from "react-bootstrap";

type ToastVariant = "success" | "danger" | "info" | "warning";

interface ToastMessage {
  id: number;
  title: string;
  body: string;
  variant: ToastVariant;
}

interface AppToastContextValue {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
}

const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    setToasts((current) => [...current, { ...toast, id: Date.now() + Math.random() }]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <ToastContainer position="bottom-end" className="p-3 app-toast-stack">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            bg={toast.variant}
            onClose={() =>
              setToasts((current) => current.filter((item) => item.id !== toast.id))
            }
            autohide
            delay={3500}
          >
            <Toast.Header closeButton>
              <strong className="me-auto">{toast.title}</strong>
            </Toast.Header>
            <Toast.Body className={toast.variant === "warning" ? "text-dark" : "text-white"}>
              {toast.body}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }

  return context;
}
