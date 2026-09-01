"use client";

import Link from "next/link";
import { Languages, LockKeyhole, Users } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguageName } from "@/lib/languages";
import type { Note } from "@/lib/notes/repository";

export default function NoteCard({ note }: { note: Note }) {
  const { t, language: interfaceLanguage } = useTranslation();
  const parsedDate = new Date(note.createdAt);
  const date = Number.isNaN(parsedDate.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(parsedDate);

  return (
    <Link
      href={`/notes/${note.id}`}
      className="block rounded-[24px] border border-black/[0.06] bg-white p-4 shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          <Languages size={13} />
          {getLanguageName(note.originalLanguage, interfaceLanguage)}
        </span>
        <span className="inline-flex items-center gap-1 text-[0.625rem] text-ink-faint">
          {note.isSharedWithMe ? <Users size={12} /> : <LockKeyhole size={11} />}
          {date}
        </span>
      </div>

      <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-[0.9375rem] font-semibold leading-6 text-ink-strong">
        {note.originalText}
      </p>

      {note.personalMeaning ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{note.personalMeaning}</p>
      ) : null}

      {note.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-surface px-2.5 py-1 text-[0.625rem] font-medium text-ink-soft">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {note.isSharedWithMe ? (
        <p className="mt-3 text-[0.6875rem] font-semibold text-ink-soft">
          {t.home.notes.sharedBy.replace("{name}", note.sourceOwnerName || note.sourceName || t.home.notes.sharedWithMe)}
        </p>
      ) : null}
    </Link>
  );
}
