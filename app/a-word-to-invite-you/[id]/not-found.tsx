import HelloNotFound from "@/components/hello/HelloNotFound";

/* A hello that is off or was never there: 404, and which of the two. */
export const metadata = { robots: { index: false, follow: false } };

export default function HelloNotFoundPage() {
  return <HelloNotFound />;
}
