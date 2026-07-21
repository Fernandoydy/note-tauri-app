import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { NoteActions } from "@/components/note-actions";
import { NoteMetadata } from "@/components/note-metadata";
import { NoteTags } from "@/components/note-tags";
import type { FolderTreeNode, Note } from "@/lib/notes-repository";

export type SaveStatus = "saved" | "saving" | "error";

type NoteEditorProps = {
  note: Note;
  folder?: FolderTreeNode;
  saveStatus: SaveStatus;
  onAddTags: (value: string) => void;
  onBodyChange: (value: string) => void;
  onMoveToTrash: () => void;
  onPermanentlyDelete: () => void;
  onRestore: () => void;
  onSaveTags: (tags: string[]) => void;
  onTitleChange: (value: string) => void;
  onToggleArchived: () => void;
  onTogglePinned: () => void;
};

export function NoteEditor({
  note,
  folder,
  saveStatus,
  onAddTags,
  onBodyChange,
  onMoveToTrash,
  onPermanentlyDelete,
  onRestore,
  onSaveTags,
  onTitleChange,
  onToggleArchived,
  onTogglePinned,
}: NoteEditorProps) {
  const statusText = saveStatus === "saving"
    ? "Salvando..."
    : saveStatus === "error"
      ? "Falha ao salvar"
      : "Salvo agora";

  return (
    <article className="editor-panel">
      <header className="editor-header">
        <div className={`editor-status editor-status--${saveStatus}`}>
          <span className="save-dot" />
          {statusText}
        </div>
        <NoteActions
          note={note}
          onMoveToTrash={onMoveToTrash}
          onPermanentlyDelete={onPermanentlyDelete}
          onRestore={onRestore}
          onToggleArchived={onToggleArchived}
          onTogglePinned={onTogglePinned}
        />
      </header>

      <div className="paper">
        <NoteMetadata note={note} folder={folder} />
        <Input
          className="note-title-input"
          value={note.title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="Título da nota"
          disabled={Boolean(note.deletedAt)}
        />
        <Textarea
          className="note-body-input"
          value={note.body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="Comece a escrever..."
          aria-label="Conteúdo da nota"
          disabled={Boolean(note.deletedAt)}
        />
        <Separator />
        <footer className="paper-footer">
          <NoteTags
            noteId={note.id}
            tags={note.tags}
            readOnly={Boolean(note.deletedAt)}
            onAddTags={onAddTags}
            onRemoveTag={(tag) => onSaveTags(note.tags.filter((item) => item !== tag))}
          />
          <span>{note.body.trim() ? `${note.body.trim().split(/\s+/).length} palavras` : "0 palavras"}</span>
        </footer>
      </div>
    </article>
  );
}
