/**
 * A script that runs while the browser is still parsing the HTML.
 *
 * The type attribute is the whole point. React warns in development whenever a
 * component renders a `<script>`, because a script inserted through a DOM
 * update never executes — so on a client-side navigation this element is inert
 * and React is right to say so. Marking it `text/plain` on the client makes
 * that explicit instead of merely true, which silences a warning that would
 * otherwise be indistinguishable from a real mistake.
 *
 * On the server it stays `text/javascript` and runs during parsing, which is
 * the only moment it is useful: before the first paint, ahead of hydration.
 * `suppressHydrationWarning` covers the deliberate mismatch between the two.
 *
 * Straight from node_modules/next/dist/docs/01-app/02-guides/
 * preventing-flash-before-hydration.md — this is that guide's prescribed
 * helper, not an invention.
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
