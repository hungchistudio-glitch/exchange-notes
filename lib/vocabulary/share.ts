import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Handing a saved word to something outside the app

   One file for the share sheet and the clipboard, because the word list
   and the copy key beside each word both need the copy and neither should
   pay for a second file on the tab's first render.
   ========================================================= */

/**
 * Puts text on the clipboard, by the older route where the newer one is
 * missing.
 *
 * Throws when neither works, so the caller can say nothing was copied rather
 * than show a tick over an empty clipboard.
 */
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();

  const copied = document.execCommand("copy");
  input.remove();

  if (!copied) throw new Error("Clipboard is unavailable.");
}

/**
 * Hands a word to the share sheet, or copies it where there is none.
 *
 * Says where it went, so the button can show a copy happened: on a browser
 * with no share sheet the word was copied without a sign of anything. And
 * closing the share sheet is not a failure. It used to fall through to the
 * clipboard and replace whatever the reader had copied, behind their back.
 */
export async function shareVocabularyItem(
  item: VocabularyItem,
): Promise<"shared" | "copied" | "none"> {
  const text = `${item.word} — ${item.translation}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "none";
      }
      // The share sheet could not open. Copy instead.
    }
  }

  try {
    await copyText(text);
    return "copied";
  } catch (error) {
    console.error("Could not share the word:", error);
    return "none";
  }
}
