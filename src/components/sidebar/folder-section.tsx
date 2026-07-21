import { Folder as FolderIcon, FolderPlus, RotateCcw } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { FolderTree } from "@/components/sidebar/folder-tree";
import type { Collection } from "@/components/app-sidebar";
import type { Folder, FolderTreeNode } from "@/lib/notes-repository";

type SidebarFolderSectionProps = {
  activeCollection: Collection;
  activeFolderId: number | null;
  folderDraft: string;
  folderTree: FolderTreeNode[];
  isCreatingFolder: boolean;
  trashedFolders: Folder[];
  onBeginFolderCreation: () => void;
  onCancelFolderCreation: () => void;
  onCreateFolder: () => void;
  onFolderDraftChange: (value: string) => void;
  onRestoreFolder: (folder: Folder) => void;
  onSelectFolder: (folder: FolderTreeNode) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
};

export function SidebarFolderSection({
  activeCollection,
  activeFolderId,
  folderDraft,
  folderTree,
  isCreatingFolder,
  trashedFolders,
  onBeginFolderCreation,
  onCancelFolderCreation,
  onCreateFolder,
  onFolderDraftChange,
  onRestoreFolder,
  onSelectFolder,
  onTrashFolder,
}: SidebarFolderSectionProps) {
  if (activeCollection === "Lixeira") {
    return trashedFolders.length > 0 ? (
      <SidebarGroup className="sidebar-folders-group">
        <SidebarGroupLabel>Pastas na lixeira</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {trashedFolders.map((folder) => (
              <SidebarMenuItem key={folder.id}>
                <SidebarMenuButton tooltip={folder.name} onClick={() => onRestoreFolder(folder)}>
                  <FolderIcon />
                  <span>{folder.name}</span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  showOnHover
                  aria-label={`Restaurar ${folder.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRestoreFolder(folder);
                  }}
                >
                  <RotateCcw />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    ) : null;
  }

  return (
    <SidebarGroup className="sidebar-folders-group">
      <SidebarGroupLabel>Pastas</SidebarGroupLabel>
      <SidebarGroupAction aria-label="Criar pasta" onClick={onBeginFolderCreation}>
        <FolderPlus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        {isCreatingFolder ? (
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
        {folderTree.length > 0 ? (
          <FolderTree
            nodes={folderTree}
            activeFolderId={activeFolderId}
            onSelectFolder={onSelectFolder}
            onTrashFolder={onTrashFolder}
          />
        ) : (
          <p className="sidebar-hint">Crie uma pasta para organizar suas notas.</p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
