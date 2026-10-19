/* =========================================================
   What a hello may say, under the app's own domain

   A hello is a page on exchange-notes-app.vercel.app with a person's name
   and two words on it, open to anyone with the link. That makes it worth
   misusing: "call 0912…", "add my LINE", a name that reads like the app's
   own staff (Chi's review, 2026-10-19). So both are held to what they are
   for.

     a side    a word or a short phrase: at most 40 characters, no link,
               no address, no phone or account number (five digits or
               more), no "@handle", no "LINE ID:"-style contact line
     a name    a nickname: the same rules, cut to 24 characters; a name
               that breaks them is not shown at all, and the hello falls
               back to the sender's Exchange ID

   The sender's Exchange ID is shown beside any nickname, so a name can
   never stand alone as who sent it.

   Shared by the server (what is stored and shown) and the editor (what it
   tells the sharer before they press create). Checked when shown as well
   as when stored, so a rule added later covers hellos made before it.
   ========================================================= */

export const HELLO_TEXT_MAX = 40;
export const HELLO_NAME_MAX = 24;

/* A link, a "www." or an email address. */
const LINK = /(https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[a-z]{2,})/i;

/* An "@handle" anywhere: a way to be found somewhere else. */
const HANDLE = /(^|[\s(（:：,，])@[\p{L}\p{N}_.]{2,}/u;

/*
 * A contact line: a platform named with "id" or a colon after it, or the
 * Chinese ways of saying "add me" / "message me". Only with the "id" or
 * the colon, so that "line", "online" and "telegram" stay ordinary words.
 */
const CONTACT =
  /\b(line|wechat|whatsapp|telegram|instagram|ig|kakao|signal|skype|discord|messenger)\s*(id\b|[:：])|加我|加賴|私訊|私信|聯絡我|聯繫我/iu;

/* Five or more digits, however they are spaced or written. */
function tooManyDigits(text: string): boolean {
  return (text.match(/[0-9０-９]/g) ?? []).length >= 5;
}

function tidy(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Why a text may not go on a hello, or null when it may. */
export function helloTextProblem(text: string): "link" | "contact" | "digits" | null {
  if (LINK.test(text)) return "link";
  if (HANDLE.test(text) || CONTACT.test(text)) return "contact";
  if (tooManyDigits(text)) return "digits";
  return null;
}

/** A side's text as a hello may show it, or null. */
export function cleanHelloText(value: unknown, max = HELLO_TEXT_MAX): string | null {
  if (typeof value !== "string") return null;
  const text = tidy(value);
  if (!text || Array.from(text).length > max || helloTextProblem(text)) return null;
  return text;
}

/**
 * The sender's nickname as a hello shows it: tidied, cut to 24 characters,
 * or null when there is none or it breaks the rules — the hello then names
 * them by Exchange ID alone.
 */
export function cleanSenderName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = tidy(value);
  if (!text || helloTextProblem(text)) return null;
  const characters = Array.from(text);
  return characters.length > HELLO_NAME_MAX ? `${characters.slice(0, HELLO_NAME_MAX).join("").trimEnd()}…` : text;
}
