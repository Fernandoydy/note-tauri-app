import { FileText, Pin, Search } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Collection } from "@/components/app-sidebar";
import type { Note } from "@/lib/notes-repository";

function previewFor(note: Note) {
  return note.body.replace(/\n/g, " ").trim() || "Comece a escrever...";
}

type SidebarNoteListProps = {
  activeCollection: Collection;
  isLoading: boolean;
  selectedNoteId: number | null;
  visibleNotes: Note[];
  onSelectNote: (noteId: number) => void;
};

export function SidebarNoteList({
  activeCollection,
  isLoading,
  selectedNoteId,
  visibleNotes,
  onSelectNote,
}: SidebarNoteListProps) {
  return (
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
              {note.isPinned ? (
                <SidebarMenuBadge>
                  <Pin fill="currentColor" />
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          ))}
          {!isLoading && visibleNotes.length === 0 ? (
            <Empty className="sidebar-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle>Nada por aqui</EmptyTitle>
                <EmptyDescription>
                  {activeCollection === "Lixeira"
                    ? "A lixeira está vazia."
                    : "Crie uma nota ou ajuste os filtros."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
