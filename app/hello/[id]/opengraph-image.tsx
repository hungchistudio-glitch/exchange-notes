import { loadHello } from "@/lib/hello/load";
import { HELLO_OG_ALT, HELLO_OG_SIZE, helloOgImage } from "@/lib/hello/ogImage";

/* A hello's link preview; what it shows, and when it shows nothing, is in lib/hello/ogImage.tsx. */

export const alt = HELLO_OG_ALT;
export const size = HELLO_OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return helloOgImage(await loadHello(id));
}
