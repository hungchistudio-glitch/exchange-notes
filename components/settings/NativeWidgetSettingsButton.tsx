"use client";

import {
  Camera,
  Check,
  Plus,
  Search,
  Smartphone,
  Volume2,
} from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";

const STEP_ICONS = [
  Smartphone,
  Plus,
  Search,
  Check,
] as const;

export default function NativeWidgetSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.iphoneWidget;
  const [open, setOpen] = useState(false);

  const steps = [
    copy.stepOne,
    copy.stepTwo,
    copy.stepThree,
    copy.stepFour,
  ];

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<Smartphone size={16} strokeWidth={1.8} />}
        value={copy.statusNative}
        tone="emerald"
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
        <div className="space-y-5">
          <section className="rounded-[24px] border border-emerald-500/15 bg-emerald-500/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check size={17} strokeWidth={2.2} />
              </span>

              <div>
                <h3 className="text-[15px] font-semibold text-black">
                  {copy.nativeTitle}
                </h3>
                <p className="mt-1 text-sm leading-5 text-ink-soft">
                  {copy.nativeDescription}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {copy.addTitle}
            </h3>

            <ol className="mt-2 overflow-hidden rounded-[24px] border border-black/[0.06] bg-white">
              {steps.map((step, index) => {
                const StepIcon = STEP_ICONS[index];

                return (
                  <li
                    key={step}
                    className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3.5 last:border-b-0"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft">
                      <StepIcon size={15} strokeWidth={1.9} />
                    </span>
                    <span className="text-sm font-medium leading-5 text-ink-strong">
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-[24px] border border-black/[0.06] bg-black/[0.025] p-4">
            <div className="flex items-start gap-3">
              <Volume2
                aria-hidden="true"
                size={18}
                strokeWidth={1.8}
                className="mt-0.5 shrink-0 text-ink-soft"
              />
              <div>
                <h3 className="text-sm font-semibold text-ink-strong">
                  {copy.behaviorTitle}
                </h3>
                <p className="mt-1 text-sm leading-5 text-ink-soft">
                  {copy.behaviorDescription}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3 text-xs font-medium text-ink-soft">
              <Plus size={14} strokeWidth={1.9} />
              <Camera size={14} strokeWidth={1.9} />
              <span>{copy.openAppNote}</span>
            </div>
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
