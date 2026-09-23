"use client";

import { useId, useRef, useState } from "react";
import { Languages } from "lucide-react";
import useTranslation from "@/hooks/i18n/useTranslation";
import { setInterfaceLanguage, type InterfaceLanguage } from "@/lib/appPreferences";
import { loadTranslations, TRANSLATION_LANGUAGES } from "@/lib/i18n";
import { getInterfaceLanguageMeta } from "@/lib/languages";
import { markChosenBeforeSignIn } from "@/lib/preferences/pendingChoices";
import styles from "./InfoPage.module.css";

export default function InfoLanguagePicker({ publicView }: { publicView: boolean }) {
  const { language, t } = useTranslation();
  const request = useRef(0);
  const [pending, setPending] = useState<InterfaceLanguage | null>(null);
  const [failed, setFailed] = useState(false);
  const errorId = useId();

  async function select(value: InterfaceLanguage) {
    const selection = ++request.current;
    setFailed(false);
    setPending(value === language ? null : value);
    if (value === language) return;
    try {
      await loadTranslations(value);
      if (request.current !== selection) return;
      // Public routes do not mount account sync. Preserve this explicit
      // choice when the reader next enters the signed-in app.
      if (publicView) markChosenBeforeSignIn("interfaceLanguage");
      setInterfaceLanguage(value);
    } catch {
      if (request.current === selection) setFailed(true);
    } finally {
      if (request.current === selection) setPending(null);
    }
  }

  return (
    <div className={styles.languagePicker}>
      <label className={styles.languageLabel}>
        <Languages size={17} aria-hidden="true" />
        <span>{t.landing.languagePicker.label}</span>
        <select
          value={pending ?? language}
          onChange={(event) => void select(event.target.value as InterfaceLanguage)}
          aria-busy={pending !== null}
          aria-describedby={failed ? errorId : undefined}
        >
          {TRANSLATION_LANGUAGES.map((value) => {
            const meta = getInterfaceLanguageMeta(value);
            return <option key={value} value={value} lang={meta.htmlLang}>{meta.endonym}</option>;
          })}
        </select>
      </label>
      {failed && <p id={errorId} role="alert" className={styles.error}>{t.landing.languagePicker.loadError}</p>}
    </div>
  );
}
