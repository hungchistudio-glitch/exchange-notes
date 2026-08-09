"use client";

import { Info, Smartphone } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";

/**
 * The native Home Screen widget, which cannot currently be offered.
 *
 * It ships inside the app build, and that build is signed with a free Apple
 * development profile: installing it needs a paid developer account and
 * Developer Mode on the phone, and the profile expires after seven days. The
 * row used to walk through adding it to the Home Screen, which was an
 * instruction nobody could follow to the end.
 *
 * It stays visible rather than being removed so the answer to "where is the
 * widget" is on the screen where it is expected, next to the Scriptable row
 * that does work.
 */
export default function NativeWidgetSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.iphoneWidget;
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<Smartphone size={16} strokeWidth={1.8} />}
        value={copy.statusUnavailable}
        tone="neutral"
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
        footer={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 w-full rounded-2xl bg-black text-sm font-semibold text-white transition-all active:scale-[0.98]"
          >
            {copy.done}
          </button>
        }
      >
        <div className="space-y-3">
          <section className="rounded-[24px] border border-amber-500/20 bg-amber-500/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <Info size={17} strokeWidth={2.1} />
              </span>

              <div>
                <h3 className="text-[15px] font-semibold text-black">
                  {copy.unavailableTitle}
                </h3>
                <p className="mt-1 text-sm leading-5 text-black/55">
                  {copy.unavailableDescription}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/[0.06] bg-black/[0.025] p-4">
            <h3 className="text-sm font-semibold text-black/75">
              {copy.alternativeTitle}
            </h3>
            <p className="mt-1 text-sm leading-5 text-black/50">
              {copy.alternativeDescription}
            </p>
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
