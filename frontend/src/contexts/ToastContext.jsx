import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant, message, title) => {
      if (!message) {
        return;
      }

      const id = ++toastId;
      setToasts((current) => [
        ...current,
        { id, variant, message, title: title ?? (variant === "error" ? "Error" : "Notice") },
      ]);

      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message, title) => push("success", message, title),
      error: (message, title) => push("error", message, title),
      info: (message, title) => push("info", message, title),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              "pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl",
              toast.variant === "error" &&
                "border-destructive/40 bg-destructive/15 text-destructive-foreground",
              toast.variant === "success" &&
                "border-primary/40 bg-primary/15 text-foreground",
              toast.variant === "info" &&
                "border-border bg-card/90 text-foreground",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{toast.title}</p>
                <p className="mt-1 text-sm opacity-90">{toast.message}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
