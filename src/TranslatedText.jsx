import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useLanguage } from "./i18n";
import { languages } from "./translations";
export default function TranslatedText({
  body,
  kind = "posts",
  id,
  enabled = true,
  onOpen,
  requireUser,
}) {
  const { language, t } = useLanguage();
  const [result, setResult] = useState(null),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const revision = useRef(0);
  useEffect(() => {
    revision.current++;
    setResult(null);
    setShow(false);
    setError("");
    setConfirm(false);
    setBusy(false);
  }, [language, body, id, kind, enabled]);
  useEffect(
    () => () => {
      revision.current++;
    },
    [],
  );
  async function translate() {
    setConfirm(false);
    setBusy(true);
    setError("");
    const current = ++revision.current;
    try {
      const data = await api(`${kind}/${id}/translate`, "POST", {
        target: language,
      });
      if (revision.current === current) {
        setResult(data.translated_text);
        setShow(true);
      }
    } catch (e) {
      if (revision.current === current) setError(e.message);
    } finally {
      if (revision.current === current) setBusy(false);
    }
  }
  return (
    <>
      {onOpen ? (
        <button className="post-body" onClick={onOpen} dir="auto">
          {show ? result : body}
        </button>
      ) : (
        <p className="translated-body" dir="auto">
          {show ? result : body}
        </p>
      )}
      {enabled && (
        <div className="translation-controls">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (result !== null) {
                setShow(!show);
                return;
              }
              if (!requireUser || requireUser()) setConfirm(true);
            }}
          >
            {busy
              ? t("Translating…")
              : result !== null
                ? t(show ? "See original" : "See translation")
                : `${t("Translate")} · ${languages[language]}`}
          </button>
          {show && (
            <small>
              {t("Translated by Google. Translations may not be exact.")}
            </small>
          )}
          {confirm && (
            <div
              className="translation-consent"
              role="group"
              aria-label={t("Translate this public text with Google?")}
            >
              <p>
                {t(
                  "Only this selected text will be sent to Google Cloud Translation.",
                )}
              </p>
              <button className="text-button" onClick={translate}>
                {t("Translate")}
              </button>
              <button className="text-button" onClick={() => setConfirm(false)}>
                {t("Cancel")}
              </button>
            </div>
          )}
          {error && (
            <small className="translation-error" role="alert">
              {t(error)}
            </small>
          )}
        </div>
      )}
    </>
  );
}
