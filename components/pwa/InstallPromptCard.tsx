"use client";

import { Bell, LoaderCircle, Share, WifiOff, Zap } from "lucide-react";
import { useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import usePwaInstall from "@/hooks/pwa/usePwaInstall";

type InstallPromptCardProps = {
  onDismiss?: () => void;
  onInstalled?: () => void;
};

export default function InstallPromptCard({ onDismiss, onInstalled }: InstallPromptCardProps) {
  const { t } = useTranslation();
  const copy = t.pwa;
  const { platform, canPromptInstall, promptInstall } = usePwaInstall();

  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  async function handlePrimaryAction() {
    if (platform === "ios") {
      setShowIosSteps(true);
      return;
    }

    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);

    if (outcome === "accepted") {
      onInstalled?.();
    }
  }

  if (showIosSteps) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="text-[18px] font-bold tracking-[-0.02em] text-black">
          {copy.iosStepsTitle}
        </h2>

        <ol className="mt-5 w-full space-y-3.5 text-left">
          {[copy.iosStep1, copy.iosStep2, copy.iosStep3, copy.iosStep4].map((stepText, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                {index === 0 ? <Share size={12} strokeWidth={2} /> : index + 1}
              </span>
              <span className="text-[14px] leading-6 text-ink-strong">{stepText}</span>
            </li>
          ))}
        </ol>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-black/[0.05] text-sm font-semibold text-black transition-colors hover:bg-black/[0.08]"
          >
            {copy.gotIt}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/yumi-brand/app-icon/icon-192.png"
        alt="Exchange Notes"
        width={64}
        height={64}
        className="h-16 w-16 rounded-[20px] shadow-[0_6px_20px_rgba(0,0,0,0.1)]"
      />

      <h2 className="mt-4 text-[19px] font-bold tracking-[-0.02em] text-black">
        {copy.title}
      </h2>

      <p className="mt-1.5 max-w-xs text-[14px] leading-6 text-ink-soft">
        {copy.subtitle}
      </p>

      <div className="mt-6 w-full space-y-3.5 text-left">
        <Benefit icon={<Zap size={16} strokeWidth={1.8} />} title={copy.benefitInstantTitle} description={copy.benefitInstantDescription} />
        <Benefit icon={<Bell size={16} strokeWidth={1.8} />} title={copy.benefitConnectedTitle} description={copy.benefitConnectedDescription} />
        <Benefit icon={<WifiOff size={16} strokeWidth={1.8} />} title={copy.benefitAnywhereTitle} description={copy.benefitAnywhereDescription} />
      </div>

      <button
        type="button"
        onClick={() => void handlePrimaryAction()}
        disabled={installing || (platform !== "ios" && !canPromptInstall)}
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-[15px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {installing ? <LoaderCircle size={16} className="animate-spin" /> : null}
        {copy.installCta}
      </button>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2.5 flex h-10 w-full items-center justify-center text-[13px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
        >
          {copy.maybeLater}
        </button>
      ) : null}
    </div>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-strong">
        {icon}
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-black">{title}</span>
        <span className="block text-[13px] leading-5 text-ink-soft">{description}</span>
      </span>
    </div>
  );
}
