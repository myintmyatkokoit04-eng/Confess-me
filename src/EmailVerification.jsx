import React, { useEffect, useState } from "react";
import { api } from "./api";
import { useLanguage } from "./i18n";

export default function EmailVerification({
  pending,
  onVerified,
  onChangeEmail,
}) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(
    () => Date.now() + pending.resend_after * 1000,
  );
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  return (
    <>
      <p>{t("Enter the 6-digit code sent to your email.")}</p>
      <p className="verification-email">
        <strong>{pending.email}</strong>
      </p>
      <p className="muted">
        {t("The code expires in 10 minutes. Check Spam if you cannot find it.")}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            await api("register/verify", "POST", { code });
            await onVerified();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("Confirmation code")}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            value={code}
            disabled={busy}
            onChange={(e) =>
              setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {notice && <p role="status">{t(notice)}</p>}
        <button className="primary full" disabled={busy || code.length !== 6}>
          {t("Verify & create account")}
        </button>
      </form>
      <button
        className="text-button full auth-switch"
        disabled={busy || remaining > 0}
        onClick={async () => {
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const result = await api("register/resend", "POST");
            setResendAt(Date.now() + result.resend_after * 1000);
            setNow(Date.now());
            setCode("");
            setNotice("A new code has been sent. Use the latest email.");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("Resend code")}
        {remaining > 0 ? ` (${remaining}s)` : ""}
      </button>
      <button
        className="text-button full"
        disabled={busy}
        onClick={onChangeEmail}
      >
        {t("Use a different email / back to sign in")}
      </button>
    </>
  );
}
