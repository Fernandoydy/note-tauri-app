import { Folder as FolderIcon, FolderOpen, Trash2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import type { FolderTreeNode } from "@/lib/notes-repository";

type FolderTreeProps = {
  nodes: FolderTreeNode[];
  activeFolderId: number | null;
  onSelectFolder: (folder: FolderTreeNode) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
};

export function FolderTree({ nodes, activeFolderId, onSelectFolder, onTrashFolder }: FolderTreeProps) {
  return (
    <SidebarMenu>
      {nodes.map((folder) => (
        <SidebarMenuItem key={folder.id}>
          <SidebarMenuButton
            isActive={activeFolderId === folder.id}
            tooltip={folder.name}
            onClick={() => onSelectFolder(folder)}
          >
            {activeFolderId === folder.id ? <FolderOpen /> : <FolderIcon />}
            <span>{folder.name}</span>
          </SidebarMenuButton>
          <SidebarMenuAction
            showOnHover
            aria-label={`Mover ${folder.name} para a lixeira`}
            onClick={(event) => {
              event.stopPropagation();
              onTrashFolder(folder);
            }}
          >
            <Trash2 />
          </SidebarMenuAction>
          {folder.children.length > 0 ? (
            <SidebarMenuSub>
              <FolderTree
                nodes={folder.children}
                activeFolderId={activeFolderId}
                onSelectFolder={onSelectFolder}
                onTrashFolder={onTrashFolder}
              />
            </SidebarMenuSub>
          ) : null}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
