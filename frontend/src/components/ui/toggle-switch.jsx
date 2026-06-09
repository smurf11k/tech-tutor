import { useState } from "react";

export function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-4.5" : "translate-x-1",
        ].join(" ")}
        style={checked ? { transform: "translateX(18px)" } : { transform: "translateX(4px)" }}
      />
    </button>
  );
}
