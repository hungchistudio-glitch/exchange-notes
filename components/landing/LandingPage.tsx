"use client";

import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";

import Link from "next/link";
import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import YumiOriginStory from "@/components/landing/story/YumiOriginStory";
import HeroTrial from "@/components/landing/trial/HeroTrial";
import ExchangeShowcase from "@/components/landing/sections/ExchangeShowcase";
import LensShowcase from "@/components/landing/sections/LensShowcase";
import NotesShowcase from "@/components/landing/sections/NotesShowcase";
import YumiShowcase from "@/components/landing/sections/YumiShowcase";
import useTranslation from "@/hooks/i18n/useTranslation";
import { track } from "@/lib/analytics/track";
import {
  setInterfaceLanguage,
  type InterfaceLanguage,
} from "@/lib/appPreferences";
import { loadTranslations } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";
import {
  INTERFACE_LANGUAGE_CODE,
  getInterfaceLanguageMeta,
  learningLanguageList,
} from "@/lib/languages";
import { markChosenBeforeSignIn } from "@/lib/preferences/pendingChoices";

import styles from "./LandingPage.module.css";

type LandingCopy = TranslationDictionary["landing"];

// Every ordinary entry uses the branded Google button on the login page.
// The Supabase redirect button is reserved for that page's recovery flow.
function LandingLoginLink({
  label,
  analyticsEvent,
  analyticsSource,
  className,
}: {
  label: string;
  analyticsEvent: "landing_primary_cta_click" | "landing_final_cta_click";
  analyticsSource: "navigation" | "hero" | "story" | "final";
  className: string;
}) {
  return (
    <Link
      href="/login"
      onClick={() => track(analyticsEvent, { source: analyticsSource })}
      className={`flex min-h-12 w-full items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-85 ${className}`}
    >
      {label}
    </Link>
  );
}

const LANGUAGE_OPTIONS = (
  Object.keys(INTERFACE_LANGUAGE_CODE) as InterfaceLanguage[]
)
  .filter((value) => getInterfaceLanguageMeta(value).availableAsInterface)
  .map((value) => ({ value, meta: getInterfaceLanguageMeta(value) }));

function LandingLanguagePicker({
  copy,
  language,
}: {
  copy: LandingCopy["languagePicker"];
  language: InterfaceLanguage;
}) {
  const requestRef = useRef(0);
  const [switchingTo, setSwitchingTo] = useState<InterfaceLanguage | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function selectLanguage(value: InterfaceLanguage) {
    if (value === language) return;

    const request = ++requestRef.current;
    setSwitchingTo(value);
    setLoadError(false);

    try {
      /*
       * The setting dispatches synchronously. Fetch the small dictionary
       * chunk first so the whole introduction changes in one paint rather
       * than briefly suspending after the reader chooses a language.
       */
      await loadTranslations(value);
      if (request !== requestRef.current) return;
      setInterfaceLanguage(value);
      /*
       * This page is only ever rendered signed out — a signed-in reader is
       * redirected to /home before it — so a pick here is unambiguously a
       * choice made before signing in, and the account sync must not quietly
       * replace it with whatever was stored last time.
       */
      markChosenBeforeSignIn("interfaceLanguage");
    } catch (error) {
      if (request === requestRef.current) setLoadError(true);
      console.error("Could not load the selected interface language.", error);
    } finally {
      if (request === requestRef.current) setSwitchingTo(null);
    }
  }

  return (
    <fieldset className={styles.languagePicker} aria-label={copy.ariaLabel}>
      <legend className="sr-only">{copy.ariaLabel}</legend>
      <div className={styles.languagePickerLabel}>
        <Languages size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>{copy.label}</span>
      </div>
      <div className={styles.languageOptions}>
        {LANGUAGE_OPTIONS.map(({ value, meta }) => {
          const selected = value === language;
          const switching = value === switchingTo;

          return (
            <button
              key={value}
              type="button"
              lang={meta.htmlLang}
              dir={meta.direction}
              aria-pressed={selected}
              aria-busy={switching || undefined}
              onPointerEnter={() => void loadTranslations(value).catch(() => undefined)}
              onFocus={() => void loadTranslations(value).catch(() => undefined)}
              onClick={() => void selectLanguage(value)}
              className={styles.languageOption}
            >
              <span aria-hidden="true">{meta.badge}</span>
              {meta.endonym}
            </button>
          );
        })}
      </div>
      {loadError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">
          {copy.loadError}
        </p>
      ) : null}
    </fieldset>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: {
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className={styles.sectionCopy}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      <p className={styles.sectionDescription}>{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const viewTrackedRef = useRef(false);
  const { t, language } = useTranslation();
  const copy = t.landing;
  const interfaceLang = getInterfaceLanguageMeta(language).htmlLang;

  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    track("landing_view");
  }, []);

  return (
    <main id="top" className={styles.page}>
      <nav className={styles.nav} aria-label={copy.navigation.ariaLabel}>
        <a
          href="#top"
          className={styles.brand}
          aria-label={copy.navigation.homeAriaLabel}
        >
          <ExchangeNotesLogo className={styles.logo} decorative />
          <span>Exchange Notes</span>
        </a>
        <div className={styles.navCta}>
          <LandingLoginLink
            label={copy.navigation.start}
            analyticsEvent="landing_primary_cta_click"
            analyticsSource="navigation"
            className={styles.navButton}
          />
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="landing-hero-title">
        <div className={styles.heroCopy}>
          <LandingLanguagePicker
            copy={copy.languagePicker}
            language={language}
          />
          <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
          {/* The About page's own first line, which is what this app is for. */}
          <h1 id="landing-hero-title">{copy.hero.title}</h1>
          <p className={styles.heroIntro}>{copy.hero.intro}</p>
          <div className={styles.heroCta}>
            <LandingLoginLink
              label={copy.hero.cta}
              analyticsEvent="landing_primary_cta_click"
              analyticsSource="hero"
              className={styles.primaryButton}
            />
          </div>
          <p className={styles.heroPromise}>{copy.hero.promise}</p>
        </div>
        <HeroTrial copy={copy.hero} language={language} />
      </section>

      <YumiOriginStory
        copy={copy.story}
        language={language}
        cta={
          <LandingLoginLink
            label={copy.hero.cta}
            analyticsEvent="landing_primary_cta_click"
            analyticsSource="story"
            className={styles.primaryButton}
          />
        }
      />

      <section
        className={`${styles.storySection} ${styles.storySectionFirst}`}
        aria-labelledby="landing-notes-title"
      >
        <SectionHeading
          eyebrow={copy.notes.eyebrow}
          id="landing-notes-title"
          title={copy.notes.title}
          description={copy.notes.description}
        />
        <NotesShowcase copy={copy.notes} />
      </section>

      <section
        className={`${styles.storySection} ${styles.storyReverse}`}
        aria-labelledby="landing-exchange-title"
      >
        <SectionHeading
          eyebrow={copy.exchange.eyebrow}
          id="landing-exchange-title"
          title={copy.exchange.title}
          description={copy.exchange.description}
        />
        <ExchangeShowcase copy={copy.exchange} />
      </section>

      <section
        className={styles.storySection}
        aria-labelledby="landing-yumi-title"
      >
        <SectionHeading
          eyebrow={copy.yumi.eyebrow}
          id="landing-yumi-title"
          title={copy.yumi.title}
          description={copy.yumi.description}
        />
        <YumiShowcase copy={copy.yumi} interfaceLang={interfaceLang} />
      </section>

      <section
        className={styles.moodSection}
        aria-labelledby="landing-lens-title"
      >
        <div className={styles.moodHeading}>
          <p className={styles.eyebrow}>{copy.lens.eyebrow}</p>
          <h2 id="landing-lens-title">{copy.lens.title}</h2>
          <p>{copy.lens.subtitle}</p>
        </div>
        <LensShowcase copy={copy.lens} />
      </section>

      <section
        className={styles.closing}
        aria-labelledby="landing-closing-title"
      >
        <ExchangeNotesLogo className={styles.closingLogo} decorative />
        <h2 id="landing-closing-title">
          {copy.closing.title}
          <span>{copy.closing.titleSecond}</span>
        </h2>
        <p>{copy.closing.description}</p>
        <div className={styles.finalCta}>
          <LandingLoginLink
            label={copy.closing.cta}
            analyticsEvent="landing_final_cta_click"
            analyticsSource="final"
            className={styles.primaryButton}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Exchange Notes</span>
        {/* Google's consent screen links this footer's two pages, and its
            brand review checks the home page links them back. */}
        <div className={styles.footerLinks}>
          <Link href="/privacy">{t.info.nav.privacy}</Link>
          <Link href="/terms">{t.info.nav.terms}</Link>
        </div>
        <span>{learningLanguageList()}</span>
      </footer>
    </main>
  );
}
