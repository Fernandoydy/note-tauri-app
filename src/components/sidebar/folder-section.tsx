import { FolderPlus, Search } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
} from "@/components/ui/sidebar";
import { FolderTree } from "@/components/sidebar/folder-tree";
import type { Collection } from "@/components/app-sidebar";
import type { FolderTreeNode, Note } from "@/lib/notes-repository";

type SidebarFolderSectionProps = {
  activeCollection: Collection;
  folderDraft: string;
  folderTree: FolderTreeNode[];
  isCreatingFolder: boolean;
  isLoading: boolean;
  selectedNoteId: number | null;
  trashedFolderTree: FolderTreeNode[];
  visibleNotes: Note[];
  onBeginFolderCreation: () => void;
  onCancelFolderCreation: () => void;
  onCreateFolder: () => void;
  onFolderDraftChange: (value: string) => void;
  onMoveFolder: (folderId: number, parentId: number | null) => void;
  onMoveNote: (noteId: number, folderId: number | null) => void;
  onRestoreFolder: (folder: FolderTreeNode) => void;
  onSelectNote: (noteId: number) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
};

export function SidebarFolderSection({
  activeCollection,
  folderDraft,
  folderTree,
  isCreatingFolder,
  isLoading,
  selectedNoteId,
  trashedFolderTree,
  visibleNotes,
  onBeginFolderCreation,
  onCancelFolderCreation,
  onCreateFolder,
  onFolderDraftChange,
  onMoveFolder,
  onMoveNote,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: SidebarFolderSectionProps) {
  const isTrash = activeCollection === "Lixeira";
  const currentFolderTree = isTrash ? trashedFolderTree : folderTree;
  const hasItems = currentFolderTree.length > 0 || visibleNotes.length > 0;

  return (
    <SidebarGroup className="sidebar-notes-group">
      <SidebarGroupLabel>Notas</SidebarGroupLabel>
      {isTrash ? null : (
        <SidebarGroupAction aria-label="Criar pasta" onClick={onBeginFolderCreation}>
          <FolderPlus />
        </SidebarGroupAction>
      )}
      <SidebarGroupContent>
        {isCreatingFolder && !isTrash ? (
          <form
            className="folder-draft"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateFolder();
            }}
          >
            <SidebarInput
              autoFocus
              value={folderDraft}
              onChange={(event) => onFolderDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onCancelFolderCreation();
              }}
              placeholder="Nome da pasta"
              aria-label="Nome da nova pasta"
            />
          </form>
        ) : null}
        {hasItems ? (
          <FolderTree
            nodes={currentFolderTree}
            notes={visibleNotes}
            selectedNoteId={selectedNoteId}
            mode={isTrash ? "trash" : "active"}
            onMoveFolder={onMoveFolder}
            onMoveNote={onMoveNote}
            onRestoreFolder={onRestoreFolder}
            onSelectNote={onSelectNote}
            onTrashFolder={onTrashFolder}
          />
        ) : !isLoading ? (
          <Empty className="sidebar-empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>Nada por aqui</EmptyTitle>
              <EmptyDescription>
                {isTrash ? "A lixeira está vazia." : "Crie uma nota ou ajuste os filtros."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
