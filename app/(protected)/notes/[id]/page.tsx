"use client";

import { use } from "react";

import NoteDetail from "@/components/notes/NoteDetail";

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <NoteDetail noteId={id} />;
}
