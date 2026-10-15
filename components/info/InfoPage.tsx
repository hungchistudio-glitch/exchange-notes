"use client";

import Link from "next/link";
import { useId } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Camera,
  Globe2,
  Mail,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Yumi3DFigure from "@/components/yumi3d/Yumi3DFigure";
import useTranslation from "@/hooks/i18n/useTranslation";
import { formatEffective } from "@/lib/legal";
import { useLegalCopy, type InitialLegalCopy } from "@/lib/legal/useLegalCopy";
import { getInterfaceLanguageMeta } from "@/lib/languages";

import InfoLanguagePicker from "./InfoLanguagePicker";
import styles from "./InfoPage.module.css";

/* =========================================================
   About, Community & Safety, the Privacy Policy and the Terms of Service —
   one component, two homes

   Each of these pages exists twice: once at /about for anyone who has not
   signed in, and once at /profile/about inside Settings. Same words, same
   layout; what differs is where "back" goes and whether a language chosen
   here has to be remembered across the sign-in boundary.

   Signed in, the parent of all four is Help & About, because that is the
   row a reader tapped to get here. Signed out there is no Help screen, so
   About's parent is the landing page and the other three belong to About.

   The policy and the terms are not in the interface dictionaries: they come
   from lib/legal, rendered on the server in the reader's language and loaded
   per language after that. See lib/legal/useLegalCopy.
   This used to send a reader who arrived from Help back to About instead,
   which is a different screen from the one they came from.
   ========================================================= */

export type InfoPageKind = "about" | "community" | "privacy" | "terms";

export const INFO_CONTACT_EMAIL = "hungchistudio@gmail.com";

const PAGES: InfoPageKind[] = ["about", "community", "privacy", "terms"];
const FEATURE_ICONS = [Camera, MessagesSquare, BookOpen] as const;

type InfoPageProps = {
  page: InfoPageKind;
  /** Rendered outside the signed-in app, at /about rather than /profile/about. */
  publicView?: boolean;
  /** The policy and terms as the server rendered them; see useLegalCopy. */
  legal?: InitialLegalCopy;
};

export default function InfoPage({ page, publicView = false, legal }: InfoPageProps) {
  const { t, language } = useTranslation();
  const copy = t.info;
  const noticeId = useId();
  const htmlLang = getInterfaceLanguageMeta(language).htmlLang;
  const isLegal = page === "privacy" || page === "terms";
  const legalCopy = useLegalCopy(isLegal ? language : null, legal);
  const legalDoc = isLegal && legalCopy ? legalCopy[page] : null;
  const root = publicView ? "" : "/profile";

  const back = publicView
    ? page === "about"
      ? { href: "/", label: copy.nav.home }
      : { href: "/about", label: copy.nav.about }
    : { href: "/profile/help", label: copy.nav.back };

  return (
    <main
      className={styles.page}
      lang={htmlLang}
    >
      <div className={styles.shell}>
        <header className={styles.toolbar}>
          <Link href={back.href} className={styles.back}>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>{back.label}</span>
          </Link>
          <InfoLanguagePicker publicView={publicView} />
        </header>

        <article className={styles.article}>
          <div className={styles.eyebrow}>
            <span aria-hidden="true" />
            Exchange Notes
          </div>
          <h1>{copy.nav[page]}</h1>

          {page === "about" ? (
            <>
              {/*
                No aria-label here. It carried the tagline, which is also the
                heading inside it, so the whole hero was announced twice.
              */}
              <section className={styles.hero}>
                {/*
                  The 3D Yumi, the one the reader will meet in the app, and
                  not the old flat mark that used to blink here: there is
                  one Yumi (Chi, 2026-10-15). She turns on her own and does
                  not take a drag, because on a reading page a drag that
                  starts on her should still be a scroll.
                */}
                <div className={styles.yumi} aria-hidden="true">
                  <Yumi3DFigure interactive={false} fill={0.4} />
                </div>
                <h2 className={styles.tagline}>{copy.about.tagline}</h2>
                <p className={styles.greeting}>{copy.about.greeting}</p>
              </section>

              <section className={styles.prose}>
                <h2>{copy.about.storyTitle}</h2>
                {copy.about.story.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>

              <section className={styles.features}>
                <h2>{copy.about.featuresTitle}</h2>
                <div className={styles.featureGrid}>
                  {copy.about.features.map((feature, index) => {
                    const Icon = FEATURE_ICONS[index] ?? Sparkles;

                    return (
                      <div key={feature.title} className={styles.feature}>
                        <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                        <h3>{feature.title}</h3>
                        <p>{feature.body}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={`${styles.prose} ${styles.ai}`}>
                <Sparkles size={22} aria-hidden="true" />
                <h2>{copy.about.ai.title}</h2>
                <p>{copy.about.ai.body}</p>
              </section>

              <p className={styles.closing}>{copy.about.closing}</p>
            </>
          ) : page === "community" ? (
            <>
              <p className={styles.intro}>{copy.community.intro}</p>

              <div className={styles.sections}>
                {copy.community.rules.map((section, index) => (
                  <section key={section.title} className={styles.prose}>
                    <span className={styles.sectionNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2>{section.title}</h2>
                    <p>{section.body}</p>
                  </section>
                ))}
              </div>

              <p className={styles.contactIntro}>{copy.community.contact}</p>
            </>
          ) : legalCopy && legalDoc ? (
            <>
              {/* Intl on the server and in the browser are different ICU
                  builds; a date they spell slightly differently is not a
                  reason to throw the page's hydration away. */}
              <p className={styles.effective} suppressHydrationWarning>
                {formatEffective(legalCopy, htmlLang)}
              </p>
              <p className={styles.intro}>{legalDoc.intro}</p>

              <aside className={styles.notice} aria-labelledby={noticeId}>
                <ShieldCheck size={22} aria-hidden="true" />
                <strong id={noticeId}>{legalDoc.summaryTitle}</strong>
                <ul>
                  {legalDoc.summary.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </aside>

              <div className={styles.sections}>
                {legalDoc.sections.map((section, index) => (
                  <section
                    key={section.title}
                    id={`section-${index + 1}`}
                    className={styles.prose}
                  >
                    <span className={styles.sectionNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2>{section.title}</h2>
                    {section.body?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.points ? (
                      <ul className={styles.points}>
                        {section.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    ) : null}
                    {section.after?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                ))}
              </div>

              {/*
                Ends in a colon, so the address has to be the next thing
                read. It was not, once: the footer opened with the planet
                line, and a reader met "contact:" followed by a joke about
                Earth.
              */}
              <p className={styles.contactIntro}>{legalDoc.contact}</p>
            </>
          ) : null}

          <footer className={styles.footer}>
            <a className={styles.email} href={`mailto:${INFO_CONTACT_EMAIL}`}>
              <Mail size={17} aria-hidden="true" />
              <span>
                <span className={styles.contactLabel}>{copy.nav.contact}</span>
                {INFO_CONTACT_EMAIL}
              </span>
            </a>

            <nav className={styles.related} aria-label={copy.nav.related}>
              {PAGES.filter((kind) => kind !== page).map((kind) => (
                <Link key={kind} href={`${root}/${kind}`}>
                  <span>{copy.nav[kind]}</span>
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <p className={styles.planet}>
              <Globe2 size={17} aria-hidden="true" />
              {copy.about.planet}
            </p>
          </footer>
        </article>
      </div>
    </main>
  );
}
