import { Archive, Pin, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes-repository";

type NoteActionsProps = {
  note: Pick<Note, "deletedAt" | "isArchived" | "isPinned">;
  onMoveToTrash: () => void;
  onPermanentlyDelete: () => void;
  onRestore: () => void;
  onToggleArchived: () => void;
  onTogglePinned: () => void;
};

export function NoteActions({
  note,
  onMoveToTrash,
  onPermanentlyDelete,
  onRestore,
  onToggleArchived,
  onTogglePinned,
}: NoteActionsProps) {
  if (note.deletedAt) {
    return (
      <div className="editor-actions">
        <Button variant="ghost" size="icon" onClick={onRestore} aria-label="Restaurar nota">
          <RotateCcw data-icon="inline-start" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="danger-button"
          onClick={onPermanentlyDelete}
          aria-label="Excluir permanentemente"
        >
          <Trash2 data-icon="inline-start" />
        </Button>
      </div>
    );
  }

  return (
    <div className="editor-actions">
      <Button
        variant="ghost"
        size="icon"
        className={cn(note.isPinned && "icon-button--active")}
        onClick={onTogglePinned}
        aria-label={note.isPinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Pin data-icon="inline-start" fill={note.isPinned ? "currentColor" : "none"} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(note.isArchived && "icon-button--active")}
        onClick={onToggleArchived}
        aria-label={note.isArchived ? "Desarquivar nota" : "Arquivar nota"}
      >
        <Archive data-icon="inline-start" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="danger-button"
        onClick={onMoveToTrash}
        aria-label="Mover para lixeira"
      >
        <Trash2 data-icon="inline-start" />
      </Button>
    </div>
  );
}
