"use client";

import { useCallback, useRef } from "react";
import { Type } from "lucide-react";

import SegmentedControl from "@/components/foundation/forms/SegmentedControl";
import { SettingsControlRow } from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import useAppFontSize from "@/hooks/preferences/useAppFontSize";
import { setAppFontSize, type AppFontSize } from "@/lib/appPreferences";

const FONT_SIZE_CLASSES: Record<AppFontSize, string> = {
  small: "text-[0.8125rem]",
  medium: "text-[0.9375rem]",
  large: "text-[1.125rem]",
};

/**
 * Three sizes, shown at their own size. A row that demonstrates the setting
 * is worth more than a screen that describes it.
 */
export default function FontSizeSettingsButton({ id }: { id?: string }) {
  /**
   * The stored preference is an external store, not component state, so it is
   * read through useSyncExternalStore rather than copied in on mount. Both
   * snapshots use getAppFontSize because it already returns the default when
   * there is no window, which keeps the server and client renders identical.
   */
  const fontSize = useAppFontSize();
  const controlRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const copy = t.settings.fontSize;

  /*
   * The control stays under the finger that is using it.
   *
   * This setting is the root font size, so every rem in the app answers to
   * it — including all the rows stacked above this one. Changing it relaid
   * the whole page while the scroller kept the same scrollTop, and the
   * scroller is measured in pixels, so the row moved. Measured on a 812px
   * screen with the row parked 400px down: switching to Large put it at
   * 960px, off the bottom of the screen entirely, and Small pulled it up to
   * 325px. Either way the reader lost the control mid-decision, and
   * comparing three sizes means using it three times.
   *
   * So: note where the control is, change the size, and give the scroller
   * back exactly the difference. Reading the rect the second time is what
   * flushes the layout the new font size just invalidated, so the number is
   * the real one rather than a frame old. The rest of the page still grows
   * and shrinks around it — this row is simply the fixed point it does that
   * around.
   */
  const changeFontSize = useCallback((next: AppFontSize) => {
    const anchor = controlRef.current;
    const scroller = anchor?.closest<HTMLElement>(
      "[data-app-scroll-viewport]",
    );

    if (!anchor) {
      setAppFontSize(next);
      return;
    }

    const before = anchor.getBoundingClientRect().top;
    setAppFontSize(next);
    const drift = anchor.getBoundingClientRect().top - before;

    if (drift === 0) return;

    /*
     * The app scroller on a signed-in route; the window everywhere else,
     * so this still holds still on any surface that hosts the row without
     * the protected app's frame around it.
     */
    if (scroller) {
      scroller.scrollTop += drift;
      return;
    }

    window.scrollBy(0, drift);
  }, []);

  return (
    <SettingsControlRow
      id={id}
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={<Type size={16} strokeWidth={1.8} />}
      stacked
      control={
        <div ref={controlRef} className="w-fit">
          <SegmentedControl<AppFontSize>
            groupLabel={copy.rowTitle}
            value={fontSize}
            onChange={changeFontSize}
            options={(["small", "medium", "large"] as const).map((value) => ({
              value,
              content: (
                <span className={`${FONT_SIZE_CLASSES[value]} leading-none`}>
                  A
                </span>
              ),
              label: copy.options[value].label,
            }))}
          />
        </div>
      }
    />
  );
}
