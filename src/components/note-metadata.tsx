import { Clock3, Folder as FolderIcon } from "lucide-react";
import { formatDateLabel, formatUpdatedAt } from "@/lib/note-formatters";
import type { FolderTreeNode, Note } from "@/lib/notes-repository";

type NoteMetadataProps = {
  note: Pick<Note, "createdAt" | "updatedAt">;
  folder?: FolderTreeNode;
};

export function NoteMetadata({ note, folder }: NoteMetadataProps) {
  return (
    <div className="paper-metadata">
      <span>{formatDateLabel(note.createdAt)}</span>
      {folder ? (
        <>
          <span className="metadata-separator">·</span>
          <span>
            <FolderIcon />
            {folder.name}
          </span>
        </>
      ) : null}
      <span className="metadata-separator">·</span>
      <span>
        <Clock3 />
        atualizado {formatUpdatedAt(note.updatedAt).toLocaleLowerCase("pt-BR")}
      </span>
    </div>
  );
}
