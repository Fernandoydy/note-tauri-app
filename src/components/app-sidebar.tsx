import {
  Archive,
  ChevronDown,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  Hash,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Folder, FolderTreeNode, Note } from "@/lib/notes-repository";

export type Collection = "Todas as notas" | "Favoritas" | "Arquivadas" | "Lixeira";

type AppSidebarProps = {
  activeCollection: Collection;
  activeFolderId: number | null;
  activeNotesCount: number;
  activeTag: string | null;
  folderDraft: string;
  folderTree: FolderTreeNode[];
  isCreatingFolder: boolean;
  isLoading: boolean;
  selectedNoteId: number | null;
  tags: string[];
  trashedFolders: Folder[];
  trashCount: number;
  visibleNotes: Note[];
  onBeginFolderCreation: () => void;
  onBrandClick: () => void;
  onCancelFolderCreation: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onFolderDraftChange: (value: string) => void;
  onRestoreFolder: (folder: Folder) => void;
  onSelectCollection: (collection: Collection) => void;
  onSelectFolder: (folder: FolderTreeNode) => void;
  onSelectNote: (noteId: number) => void;
  onSelectTag: (tag: string) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
};

type FolderTreeProps = Pick<
  AppSidebarProps,
  "activeFolderId" | "onSelectFolder" | "onTrashFolder"
> & {
  nodes: FolderTreeNode[];
};

const collections: { label: Collection; icon: typeof FileText }[] = [
  { label: "Todas as notas", icon: FileText },
  { label: "Favoritas", icon: Star },
  { label: "Arquivadas", icon: Archive },
  { label: "Lixeira", icon: Trash2 },
];

function previewFor(note: Note) {
  return note.body.replace(/\n/g, " ").trim() || "Comece a escrever...";
}

function FolderTree({ nodes, activeFolderId, onSelectFolder, onTrashFolder }: FolderTreeProps) {
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
          {folder.children.length > 0 && (
            <SidebarMenuSub>
              <FolderTree
                nodes={folder.children}
                activeFolderId={activeFolderId}
                onSelectFolder={onSelectFolder}
                onTrashFolder={onTrashFolder}
              />
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar({
  activeCollection,
  activeFolderId,
  activeNotesCount,
  activeTag,
  folderDraft,
  folderTree,
  isCreatingFolder,
  isLoading,
  selectedNoteId,
  tags,
  trashedFolders,
  trashCount,
  visibleNotes,
  onBeginFolderCreation,
  onBrandClick,
  onCancelFolderCreation,
  onCreateFolder,
  onCreateNote,
  onFolderDraftChange,
  onRestoreFolder,
  onSelectCollection,
  onSelectFolder,
  onSelectNote,
  onSelectTag,
  onTrashFolder,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="notes-sidebar">
      <SidebarHeader className="notes-sidebar-header">
        <Button variant="ghost" className="brand" onClick={onBrandClick}>
          <span className="brand-mark">n</span>
          <span>notas</span>
        </Button>
        <Button className="new-note-button" onClick={onCreateNote}>
          <Plus data-icon="inline-start" />
          <span>Nova nota</span>
          <kbd>⌘ N</kbd>
        </Button>
      </SidebarHeader>

      <SidebarContent className="notes-sidebar-content">
        <SidebarGroup className="sidebar-filter-group">
          <SidebarGroupLabel>Biblioteca</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {collections.map(({ label, icon: Icon }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    isActive={activeCollection === label && activeFolderId === null && activeTag === null}
                    tooltip={label}
                    onClick={() => onSelectCollection(label)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {label === "Todas as notas" && <SidebarMenuBadge>{activeNotesCount}</SidebarMenuBadge>}
                  {label === "Lixeira" && trashCount > 0 && <SidebarMenuBadge>{trashCount}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {tags.length > 0 && (
          <SidebarGroup className="sidebar-filter-group">
            <SidebarGroupLabel>Etiquetas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tags.map((tag) => (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton isActive={activeTag === tag} tooltip={tag} onClick={() => onSelectTag(tag)}>
                      <Hash />
                      <span>{tag}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeCollection === "Lixeira" ? (
          trashedFolders.length > 0 && (
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
          )
        ) : (
          <SidebarGroup className="sidebar-folders-group">
            <SidebarGroupLabel>Pastas</SidebarGroupLabel>
            <SidebarGroupAction aria-label="Criar pasta" onClick={onBeginFolderCreation}>
              <FolderPlus />
            </SidebarGroupAction>
            <SidebarGroupContent>
              {isCreatingFolder && (
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
              )}
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
        )}

        <SidebarGroup className="sidebar-notes-group">
          <SidebarGroupLabel>Notas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNotes.map((note) => (
                <SidebarMenuItem key={note.id}>
                  <SidebarMenuButton
                    size="lg"
                    isActive={selectedNoteId === note.id}
                    tooltip={note.title || "Nota sem título"}
                    onClick={() => onSelectNote(note.id)}
                  >
                    <FileText />
                    <span className="sidebar-note-copy">
                      <strong>{note.title || "Nota sem título"}</strong>
                      <small>{previewFor(note)}</small>
                    </span>
                  </SidebarMenuButton>
                  {note.isPinned && <SidebarMenuBadge><Pin fill="currentColor" /></SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
              {!isLoading && visibleNotes.length === 0 && (
                <Empty className="sidebar-empty">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><Search /></EmptyMedia>
                    <EmptyTitle>Nada por aqui</EmptyTitle>
                    <EmptyDescription>
                      {activeCollection === "Lixeira" ? "A lixeira está vazia." : "Crie uma nota ou ajuste os filtros."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="notes-sidebar-footer">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Você">
              <Avatar size="sm"><AvatarFallback>F</AvatarFallback></Avatar>
              <span className="profile-copy"><strong>Você</strong><small>Plano pessoal</small></span>
              <ChevronDown className="profile-chevron" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppSidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="notes-workspace" style={{ "--sidebar-width": "22rem" } as React.CSSProperties}>
      {children}
    </SidebarProvider>
  );
}
