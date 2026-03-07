import React, { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google script")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });

const GoogleAuthButton = ({ mode = "login", onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");
  const [retrySeed, setRetrySeed] = useState(0);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      if (!clientId) {
        if (mounted) setError("Google auth is not configured.");
        return;
      }

      try {
        await loadGoogleScript();
        if (!mounted || !window.google?.accounts?.id || !buttonRef.current) return;
        setError("");

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response?.credential && onCredential) {
              await onCredential(response.credential);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 340,
          text: mode === "signup" ? "signup_with" : "signin_with",
        });
      } catch (err) {
        if (mounted) setError("Unable to load Google sign-in right now.");
      }
    };

    setup();
    return () => {
      mounted = false;
    };
  }, [clientId, mode, onCredential, retrySeed]);

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => {
            setError("");
            setRetrySeed((v) => v + 1);
          }}
          className="font-bold text-amber-800 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={disabled ? "opacity-60 pointer-events-none" : ""}>
      <div ref={buttonRef} className="flex justify-center" />
    </div>
  );
};

export default GoogleAuthButton;
