import React from "react";
import { Shield } from "lucide-react";
import { useLanguage } from "./i18n";

export default function SafetyNotice({ signals = [] }) {
  const { t } = useLanguage();
  if (!signals.length) return null;
  const abusive = signals.some((signal) =>
    ["targeted_abuse", "violence_threat", "personal_info_attack"].includes(
      signal,
    ),
  );
  return (
    <aside className="safety-notice" aria-label={t("Safety reminder")}>
      <Shield size={17} aria-hidden="true" />
      <div>
        <strong>{t("Safety reminder")}</strong>
        <p>
          {abusive
            ? t(
                "This text may contain hurtful or threatening wording. Context matters. You can report it or block the sender.",
              )
            : t(
                "Be cautious with requests for money, investments, or moving to another app. A shared feeling does not verify someone's identity. Use Report or Block if you feel pressured.",
              )}
        </p>
        <small>
          {t(
            abusive
              ? "Automatic checks can make mistakes. A moderator can review the context."
              : "This is an automatic reminder, not a finding of fraud.",
          )}
        </small>
      </div>
    </aside>
  );
}
