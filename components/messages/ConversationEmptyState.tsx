import Link from "next/link";
import { MessageCircleMore, UserPlus } from "lucide-react";

type ConversationEmptyStateProps = {
  searchQuery?: string;
};

export default function ConversationEmptyState({
  searchQuery = "",
}: ConversationEmptyStateProps) {
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white px-6 py-10 text-center shadow-[0_8px_22px_rgba(0,0,0,0.045)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ECE9E2] text-black/65">
        {isSearching ? (
          <MessageCircleMore size={24} strokeWidth={1.7} />
        ) : (
          <UserPlus size={24} strokeWidth={1.7} />
        )}
      </div>

      <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.02em] text-black">
        {isSearching ? "No conversations found" : "No conversations yet"}
      </h2>

      <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-black/45">
        {isSearching
          ? `No results matched “${searchQuery.trim()}”.`
          : "Add a language partner to start sharing words, photos, and messages."}
      </p>

      {!isSearching && (
        <Link
          href="/friends"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Add a friend
        </Link>
      )}
    </div>
  );
}
