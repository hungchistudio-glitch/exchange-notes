"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import SoundTile from "@/components/pronunciation/lab/SoundTile";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { groupsForModule } from "@/lib/pronunciation/lab/registry";
import { localize } from "@/lib/pronunciation/localizedText";

const ALL = "__all";

/**
 * Every sound in the language, grouped the way the pack groups them.
 *
 * The filter row is built from the pack rather than from a fixed list, so
 * Chinese shows initials/medials/finals/tones, Spanish shows its r-sounds
 * and softening consonants, and a language added tomorrow shows whatever it
 * declares — no branch here changes.
 */
export default function SoundsModule() {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.lab;

  const { pack, progress } = usePronunciationLab();
  const searchParams = useSearchParams();

  const groups = useMemo(() => groupsForModule(pack, "sounds"), [pack]);

  /*
   * The group from the URL is only honoured if this pack actually has it.
   * Following a link to /sounds?group=tones after switching to Spanish must
   * land on something real rather than on an empty grid.
   */
  const requested = searchParams.get("group");
  const initialGroup =
    requested && groups.some((group) => group.id === requested) ? requested : ALL;

  const [selected, setSelected] = useState<string>(initialGroup);

  const visible = useMemo(() => {
    const allowed = new Set(groups.map((group) => group.id));

    return pack.units.filter(
      (unit) =>
        allowed.has(unit.group) &&
        (selected === ALL || unit.group === selected),
    );
  }, [groups, pack.units, selected]);

  const activeGroup = groups.find((group) => group.id === selected);

  return (
    <LabScreen
      title={copy.sounds.title}
      eyebrow={pack.displayName}
      subtitle={
        activeGroup?.description
          ? localize(activeGroup.description, interfaceLanguage)
          : copy.sounds.subtitle
      }
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6"
        role="tablist"
        aria-label={copy.sounds.title}
      >
        <GroupChip
          label={copy.sounds.all}
          selected={selected === ALL}
          onSelect={() => setSelected(ALL)}
        />

        {groups.map((group) => (
          <GroupChip
            key={group.id}
            label={localize(group.label, interfaceLanguage)}
            selected={selected === group.id}
            onSelect={() => setSelected(group.id)}
          />
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        {fill(copy.sounds.soundCount, { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <div className="mt-4">
          <LabEmpty title={copy.sounds.empty} />
        </div>
      ) : (
        // Two columns on a phone, three once there is room. No fourth step:
        // the app's content column is capped at a comfortable reading width
        // on every screen, and four tiles inside it would be narrower than
        // the symbol they exist to show.
        <ul className="mt-3 grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3">
          {visible.map((unit) => {
            const mastery = progress[unit.id]?.mastery ?? "new";

            return (
              <li key={unit.id}>
                <SoundTile
                  unit={unit}
                  href={`/pronunciation/sounds/${encodeURIComponent(unit.id)}`}
                  mastery={mastery}
                  masteryLabel={copy.mastery[mastery]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </LabScreen>
  );
}

function GroupChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`font-cjk inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-[0.8125rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
        selected
          ? "border-black bg-black text-white"
          : "border-line bg-white text-ink-soft hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}
