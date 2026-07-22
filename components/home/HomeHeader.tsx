"use client";

import useTranslation from "@/hooks/i18n/useTranslation";

type HomeHeaderProps = {
  greeting: string;
};

export default function HomeHeader({
  greeting,
}: HomeHeaderProps) {
  const { t } = useTranslation();

  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
        {greeting}
      </p>

      <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.045em] text-black">
        {t.home.hero.title}
      </h1>

      <p className="mt-2 max-w-md text-[15px] leading-6 text-black/48">
        {t.home.hero.description}
      </p>
    </header>
  );
}
