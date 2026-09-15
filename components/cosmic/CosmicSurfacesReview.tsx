"use client";

import { useEffect, useState } from "react";

import ProgressHud from "@/components/cosmic/ProgressHud";
import Card from "@/components/foundation/cards/Card";
import SettingsSwitch from "@/components/foundation/forms/SettingsSwitch";
import TextArea from "@/components/foundation/forms/TextArea";
import AppHeader from "@/components/foundation/layout/AppHeader";
import Screen from "@/components/foundation/layout/Screen";
import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import NoteCard from "@/components/notes/NoteCard";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import type { InterfaceMode } from "@/lib/appPreferences";
import type { LanguageCode } from "@/lib/languages";
import type { Note } from "@/lib/notes/repository";

const PREVIEW_TEXT: Array<{
  language: LanguageCode;
  label: string;
  text: string;
  meaning: string;
}> = [
  { language: "en", label: "English", text: "A small moment worth remembering.", meaning: "Preview content · A note from today's language practice." },
  { language: "zh-TW", label: "繁體中文", text: "把今天值得記住的小事，留給明天的自己。", meaning: "預覽內容・練習用自己的話說出心情。" },
  { language: "es", label: "Español", text: "Un pequeño momento que merece ser recordado.", meaning: "Contenido de vista previa · ¿Qué aprendiste hoy?" },
  { language: "fr", label: "Français", text: "Un petit moment qui mérite d’être gardé en mémoire.", meaning: "Contenu d’aperçu · Qu’avez-vous appris aujourd’hui ?" },
  { language: "it", label: "Italiano", text: "Un piccolo momento che vale la pena ricordare.", meaning: "Contenuto di anteprima · Che cosa hai imparato oggi?" },
];

const PREVIEW_NOTES: Array<{ label: string; note: Note }> = PREVIEW_TEXT.map((sample) => ({
  label: sample.label,
  note: {
    id: `preview-only-${sample.language}`,
    ownerId: "preview-only",
    originalText: sample.text,
    originalLanguage: sample.language,
    personalMeaning: sample.meaning,
    context: "Development visual review fixture; never saved.",
    tags: ["preview", sample.label],
    privacy: "private",
    sourceKind: "manual",
    sourceName: null,
    sourceUrl: null,
    sourceNoteId: null,
    sourceOwnerId: null,
    sourceOwnerName: null,
    createdAt: "2026-09-15T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    interpretations: [],
    isSharedWithMe: false,
  },
}));

const controlClass = "rounded-full border border-line px-3 py-2 text-ink-strong aria-pressed:bg-ink-strong aria-pressed:text-surface";

/**
 * Mounts real shared surfaces with clearly labelled, local-only fixtures.
 * Like CosmicYumiReview, the provider receives the actual stored mode. Only
 * the temporary DOM presentation changes; no preference setters are called.
 */
export default function CosmicSurfacesReview({ storedMode }: { storedMode: InterfaceMode }) {
  const [previewMode, setPreviewMode] = useState<InterfaceMode>("yumi-cosmic");
  const [fontSize, setFontSize] = useState(16);
  const [checked, setChecked] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-interface-mode");
    root.setAttribute("data-interface-mode", previewMode);

    return () => {
      if (previous === null) root.removeAttribute("data-interface-mode");
      else root.setAttribute("data-interface-mode", previous);
    };
  }, [previewMode]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.fontSize;
    root.style.fontSize = `${fontSize}px`;
    return () => { root.style.fontSize = previous; };
  }, [fontSize]);

  function closeSheet() {
    setSheetOpen(false);
  }

  return (
    <InterfaceModeProvider initialMode={storedMode}>
      <Screen>
        <aside className="space-y-3 border-b border-line p-4" style={{ fontSize: "14px" }} aria-label="Development review controls">
          <p className="font-semibold">Development review only · 開發預覽</p>
          <p className="text-ink-soft">Sample notes stay on this page. These controls temporarily change presentation and restore it when you leave.</p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Preview color mode">
            <button type="button" className={controlClass} aria-pressed={previewMode === "yumi-cosmic"} onClick={() => setPreviewMode("yumi-cosmic")}>Cosmic</button>
            <button type="button" className={controlClass} aria-pressed={previewMode === "standard"} onClick={() => setPreviewMode("standard")}>Standard</button>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Preview root font size">
            {[16, 20, 32].map((size) => (
              <button key={size} type="button" className={controlClass} aria-pressed={fontSize === size} onClick={() => setFontSize(size)}>{size}px{size === 32 ? " · 200%" : ""}</button>
            ))}
          </div>
        </aside>

        <AppHeader
          title="Learning, together"
          eyebrow="SHARED SURFACES · 預覽"
          action={<button type="button" className="rounded-full border border-line px-3 py-2 text-sm" onClick={() => { setSelectedNote(null); setSheetOpen(true); }}>Open sheet</button>}
        />

        <div className="space-y-6 px-4 py-6">
          <section aria-label="Real progress component">
            <p className="mb-3 text-xs text-ink-soft">Actual ProgressHud · Signed-out sessions show the empty state.</p>
            <ProgressHud />
          </section>

          <Card className="space-y-4 p-5">
            <h2 className="text-lg font-semibold">Shared card &amp; controls</h2>
            <p className="text-sm leading-6 text-ink-soft">Preview content · 保留每個值得記住的片刻。</p>
            <button type="button" role="switch" aria-checked={checked} className="flex min-h-11 w-full items-center justify-between gap-4 text-left" onClick={() => setChecked((value) => !value)}>
              <span className="text-sm">Local preview switch · 預覽開關</span>
              <SettingsSwitch checked={checked} />
            </button>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Editable preview · 練習筆記</span>
              <TextArea rows={3} defaultValue="Hello, Yumi. 今天也想學一點新東西。" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Empty field</span>
              <TextArea rows={2} placeholder="Write a thought · 寫下你的想法" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Error field</span>
              <TextArea rows={2} error defaultValue="Preview validation state · 預覽錯誤狀態" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Disabled field</span>
              <TextArea rows={2} disabled defaultValue="Preview unavailable state · 預覽停用狀態" />
            </label>
          </Card>

          <section className="space-y-4" aria-labelledby="preview-notes-title">
            <div>
              <h2 id="preview-notes-title" className="text-lg font-semibold">Sample notes · 多語言預覽</h2>
              <p className="mt-1 text-sm text-ink-soft">Five actual NoteCard components. Selecting a sample opens a local preview sheet.</p>
            </div>
            {PREVIEW_NOTES.map(({ label, note }) => (
              <div key={note.id} className="space-y-2" onClickCapture={(event) => { event.preventDefault(); setSelectedNote(note); setSheetOpen(true); }}>
                <p className="text-xs font-medium text-ink-soft">Preview · {label}</p>
                <NoteCard note={note} />
              </div>
            ))}
          </section>

          <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">Pronunciation glyph preview</h2>
            <p className="text-sm leading-7">IPA · /həˈloʊ/ /ˈlɜːrnɪŋ/ /θ/ /ð/ /ʃ/ /ʒ/ /ŋ/ /æ/ /ə/</p>
            <p lang="zh-TW" className="text-base leading-8">注音 · ㄋㄧˇ ㄏㄠˇ · ㄒㄩㄝˊ ㄒㄧˊ · ㄓ ㄔ ㄕ ㄖ ㄗ ㄘ ㄙ</p>
          </Card>
        </div>

        <BottomSheet
          open={sheetOpen}
          onClose={closeSheet}
          title={selectedNote ? "Sample note · 預覽筆記" : "Shared sheet · 預覽面板"}
          description="Development preview content. Nothing on this sheet is saved."
          footer={<button type="button" className="w-full rounded-full border border-line px-4 py-3 font-medium" onClick={closeSheet}>Close preview · 關閉預覽</button>}
        >
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-base leading-7">{selectedNote?.originalText ?? "A small moment worth remembering. 把值得記住的片刻留下來。"}</p>
            <p className="text-sm leading-6 text-ink-soft">{selectedNote?.personalMeaning ?? "Español · Français · Italiano · /həˈloʊ/ · ㄋㄧˇ ㄏㄠˇ"}</p>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Local draft · 預覽草稿</span>
              <TextArea rows={3} placeholder="Try typing here · 可在此輸入" />
            </label>
          </div>
        </BottomSheet>
      </Screen>
    </InterfaceModeProvider>
  );
}
