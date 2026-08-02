export type SavedNote = {
  id: string;
  english: string;
  chinese: string;
  createdAt: string;
};

type NotesListProps = {
  notes: SavedNote[];
  onDelete: (noteId: string) => void;
};

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 7h14M9 7V4.5h6V7M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13"
      />
    </svg>
  );
}

function formatNoteDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function NotesList({
  notes,
  onDelete,
}: NotesListProps) {
  return (
    <div className="mt-5 space-y-3">
      {notes.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-black/[0.1] px-5 py-10 text-center">
          <p className="text-sm font-semibold">
            No notes yet
          </p>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Save a new word or idea from today&apos;s learning.
          </p>
        </div>
      )}

      {notes.map((note) => (
        <article
          key={note.id}
          className="rounded-[24px] border border-black/[0.06] bg-white p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {note.english && (
                <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-7">
                  {note.english}
                </p>
              )}

              {note.chinese && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-500">
                  {note.chinese}
                </p>
              )}

              <p className="mt-4 text-[10px] text-neutral-400">
                {formatNoteDate(note.createdAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
