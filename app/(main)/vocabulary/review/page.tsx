import { redirect } from "next/navigation";

export default function VocabularyReviewPage() {
  redirect("/review?from=vocabulary");
}
