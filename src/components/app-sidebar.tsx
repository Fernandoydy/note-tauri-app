import { ChevronDown, Moon, Plus, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarCollectionNav } from "@/components/sidebar/collection-nav";
import { SidebarFolderSection } from "@/components/sidebar/folder-section";
import { SidebarNoteList } from "@/components/sidebar/note-list";
import { SidebarSearch } from "@/components/sidebar/sidebar-search";
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
  search: string;
  searchRef: React.RefObject<HTMLInputElement | null>;
  tags: string[];
  trashedFolders: Folder[];
  trashCount: number;
  visibleNotes: Note[];
  theme: "light" | "dark";
  onBeginFolderCreation: () => void;
  onBrandClick: () => void;
  onCancelFolderCreation: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onFolderDraftChange: (value: string) => void;
  onRestoreFolder: (folder: Folder) => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onSelectCollection: (collection: Collection) => void;
  onSelectFolder: (folder: FolderTreeNode) => void;
  onSelectNote: (noteId: number) => void;
  onSelectTag: (tag: string) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
  onToggleTheme: () => void;
};

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
  search,
  searchRef,
  tags,
  trashedFolders,
  trashCount,
  visibleNotes,
  theme,
  onBeginFolderCreation,
  onBrandClick,
  onCancelFolderCreation,
  onCreateFolder,
  onCreateNote,
  onFolderDraftChange,
  onRestoreFolder,
  onSearchChange,
  onClearSearch,
  onSelectCollection,
  onSelectFolder,
  onSelectNote,
  onSelectTag,
  onTrashFolder,
  onToggleTheme,
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
          <Kbd>⌘ N</Kbd>
        </Button>
        <SidebarSearch
          search={search}
          searchRef={searchRef}
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
        />
      </SidebarHeader>

      <SidebarContent className="notes-sidebar-content">
        <SidebarCollectionNav
          activeCollection={activeCollection}
          activeFolderId={activeFolderId}
          activeNotesCount={activeNotesCount}
          activeTag={activeTag}
          tags={tags}
          trashCount={trashCount}
          onSelectCollection={onSelectCollection}
          onSelectTag={onSelectTag}
        />
        <SidebarFolderSection
          activeCollection={activeCollection}
          activeFolderId={activeFolderId}
          folderDraft={folderDraft}
          folderTree={folderTree}
          isCreatingFolder={isCreatingFolder}
          trashedFolders={trashedFolders}
          onBeginFolderCreation={onBeginFolderCreation}
          onCancelFolderCreation={onCancelFolderCreation}
          onCreateFolder={onCreateFolder}
          onFolderDraftChange={onFolderDraftChange}
          onRestoreFolder={onRestoreFolder}
          onSelectFolder={onSelectFolder}
          onTrashFolder={onTrashFolder}
        />
        <SidebarNoteList
          activeCollection={activeCollection}
          isLoading={isLoading}
          selectedNoteId={selectedNoteId}
          visibleNotes={visibleNotes}
          onSelectNote={onSelectNote}
        />
      </SidebarContent>

      <SidebarFooter className="notes-sidebar-footer">
        <Button
          variant="outline"
          className="theme-toggle"
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          aria-pressed={theme === "dark"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
          <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
        </Button>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Você">
              <Avatar size="sm">
                <AvatarFallback>F</AvatarFallback>
              </Avatar>
              <span className="profile-copy">
                <strong>Você</strong>
                <small>Plano pessoal</small>
              </span>
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
