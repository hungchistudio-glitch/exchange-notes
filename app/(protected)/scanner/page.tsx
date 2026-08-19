"use client";

import { Camera, ChevronRight, ScanText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AppHeader from "@/components/foundation/layout/AppHeader";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";

/**
 * Scanner Bay.
 *
 * The camera used to be a camera: one button, one behaviour, and a name that
 * described the hardware rather than what it was for. The bay lists what the
 * lens can actually do, and reading a menu you cannot read is far and away
 * the most valuable of those — so it is the one thing here with a card
 * instead of a row.
 *
 * Cosmic Mode only. Standard Mode's camera is unchanged, and a Standard user
 * who lands on this route is sent to it.
 */
export default function ScannerBayPage() {
  const { t } = useTranslation();
  const { isCosmic } = useInterfaceMode();
  const router = useRouter();
  const copy = t.scanner;

  useEffect(() => {
    if (!isCosmic) router.replace("/capture");
  }, [isCosmic, router]);

  if (!isCosmic) return null;

  return (
    <main className="min-h-[100dvh] bg-surface text-black">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col pb-28">
        <AppHeader
          title={copy.bayTitle}
          eyebrow={copy.baySubtitle}
          backHref="/"
          backLabel={copy.back}
        />

        <div className="flex-1 space-y-6 px-5 pt-5 sm:px-6">
          <p className="px-1.5 text-[14px] leading-[22px] text-ink-soft">
            {copy.bayIntro}
          </p>

          <Link
            href="/scanner/menu"
            className="block overflow-hidden rounded-[22px] border border-black/[0.06] bg-white transition-transform duration-100 active:scale-[0.995]"
          >
            <div
              aria-hidden="true"
              className="h-1 w-full bg-gradient-to-r from-[#6fd6ff] via-[#4aa9ff] to-[#8b5cf6]"
            />

            <div className="flex items-start gap-4 px-5 py-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <ScanText size={22} strokeWidth={1.8} />
              </span>

              <span className="min-w-0 flex-1">
                {/*
                  The badge sits above the name rather than beside it: on a
                  phone, "Menu Translator" plus a chip on one line wraps the
                  title into two, and the title is the thing being read.
                */}
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-600">
                  {copy.menuTool.badge}
                </span>

                <span className="mt-1.5 block text-[19px] font-bold tracking-[-0.03em] text-black">
                  {copy.menuTool.title}
                </span>

                <span className="mt-1 block text-[14px] leading-[20px] text-ink-soft">
                  {copy.menuTool.description}
                </span>
              </span>

              <ChevronRight
                aria-hidden="true"
                size={18}
                strokeWidth={1.8}
                className="mt-1 shrink-0 text-ink-faint"
              />
            </div>
          </Link>

          {/*
            One secondary tool, because one secondary tool exists. A bay
            listing four greyed-out promises would say less about what this
            camera can do, not more.
          */}
          <div className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
            <Link
              href="/capture"
              className="flex min-h-[62px] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-100 active:bg-black/[0.035]"
            >
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-strong">
                <Camera size={16} strokeWidth={1.8} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-[21px] tracking-[-0.02em] text-black">
                  {copy.objectTool.title}
                </span>
                <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-soft">
                  {copy.objectTool.description}
                </span>
              </span>

              <ChevronRight
                aria-hidden="true"
                size={17}
                strokeWidth={1.8}
                className="shrink-0 text-ink-faint"
              />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
