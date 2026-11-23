import React, { createContext, useContext, useEffect, useState } from "react";
import { languages, translateUI } from "./translations";
const Context = createContext();
export function I18nProvider({ children }) {
  const [language, update] = useState(() => {
    try {
      return languages[localStorage.getItem("unsaid-language")]
        ? localStorage.getItem("unsaid-language")
        : "en";
    } catch {
      return "en";
    }
  });
  function setLanguage(value) {
    if (languages[value]) update(value);
  }
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("unsaid-language", language);
    } catch {
      /* Memory preference still works. */
    }
  }, [language]);
  return (
    <Context.Provider
      value={{
        language,
        setLanguage,
        t: (text) => translateUI(text, language),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function LanguageSelect({ onChange }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-select">
      <span>{t("Language")}</span>
      <select
        aria-label={t("App language")}
        value={language}
        onChange={(e) => (onChange || setLanguage)(e.target.value)}
      >
        {Object.entries(languages).map(([code, label]) => (
          <option key={code} value={code} lang={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
