import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder as FolderIcon, FolderOpen, Pin, RotateCcw, Trash2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import type { FolderTreeNode, Note } from "@/lib/notes-repository";

type FolderTreeMode = "active" | "trash";

type FolderTreeProps = {
  nodes: FolderTreeNode[];
  notes: Note[];
  selectedNoteId: number | null;
  mode: FolderTreeMode;
  onRestoreFolder: (folder: FolderTreeNode) => void;
  onSelectNote: (noteId: number) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
};

type FolderTreeItemsProps = FolderTreeProps & {
  parentId: number | null;
  folderIds: ReadonlySet<number>;
};

type TreeItem =
  | { kind: "folder"; value: FolderTreeNode }
  | { kind: "note"; value: Note };

function noteLabel(note: Note) {
  return note.title || "Nota sem título";
}

function previewFor(note: Note) {
  return note.body.replace(/\n/g, " ").trim() || "Comece a escrever...";
}

function collectFolderIds(nodes: FolderTreeNode[]) {
  const ids = new Set<number>();

  for (const node of nodes) {
    ids.add(node.id);
    for (const childId of collectFolderIds(node.children)) ids.add(childId);
  }

  return ids;
}

function compareItems(left: TreeItem, right: TreeItem) {
  if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;

  const leftLabel = left.kind === "folder" ? left.value.name : noteLabel(left.value);
  const rightLabel = right.kind === "folder" ? right.value.name : noteLabel(right.value);

  return leftLabel.localeCompare(rightLabel, "pt-BR", { sensitivity: "base" });
}

function NoteTreeItem({
  note,
  selectedNoteId,
  onSelectNote,
}: Pick<FolderTreeProps, "selectedNoteId" | "onSelectNote"> & { note: Note }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        isActive={selectedNoteId === note.id}
        tooltip={noteLabel(note)}
        onClick={() => onSelectNote(note.id)}
      >
        <FileText />
        <span className="sidebar-note-copy">
          <strong>{noteLabel(note)}</strong>
          <small>{previewFor(note)}</small>
        </span>
      </SidebarMenuButton>
      {note.isPinned ? (
        <SidebarMenuBadge>
          <Pin fill="currentColor" />
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

function FolderTreeItem({
  folder,
  notes,
  selectedNoteId,
  mode,
  folderIds,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: FolderTreeItemsProps & { folder: FolderTreeNode }) {
  const [open, setOpen] = useState(true);
  const hasChildren = folder.children.length > 0 || notes.some((note) => note.folderId === folder.id);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<CollapsibleTrigger />}
          tooltip={folder.name}
          aria-label={`${open ? "Recolher" : "Expandir"} ${folder.name}`}
        >
          {open ? <ChevronDown /> : <ChevronRight />}
          {open ? <FolderOpen /> : <FolderIcon />}
          <span>{folder.name}</span>
        </SidebarMenuButton>
        {mode === "active" ? (
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
        ) : (
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
        )}
        {hasChildren ? (
          <CollapsibleContent>
            <SidebarMenuSub>
              <FolderTreeItems
                nodes={folder.children}
                notes={notes}
                parentId={folder.id}
                selectedNoteId={selectedNoteId}
                mode={mode}
                folderIds={folderIds}
                onRestoreFolder={onRestoreFolder}
                onSelectNote={onSelectNote}
                onTrashFolder={onTrashFolder}
              />
            </SidebarMenuSub>
          </CollapsibleContent>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  );
}

function FolderTreeItems({
  nodes,
  notes,
  parentId,
  folderIds,
  selectedNoteId,
  mode,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: FolderTreeItemsProps) {
  const items: TreeItem[] = [
    ...nodes.map((folder) => ({ kind: "folder" as const, value: folder })),
    ...notes
      .filter((note) => note.folderId === parentId || (parentId === null && !folderIds.has(note.folderId ?? -1)))
      .map((note) => ({ kind: "note" as const, value: note })),
  ].sort(compareItems);

  return (
    <SidebarMenu>
      {items.map((item) => (
        item.kind === "folder" ? (
          <FolderTreeItem
            key={`folder-${item.value.id}`}
            folder={item.value}
            nodes={nodes}
            notes={notes}
            parentId={parentId}
            selectedNoteId={selectedNoteId}
            mode={mode}
            folderIds={folderIds}
            onRestoreFolder={onRestoreFolder}
            onSelectNote={onSelectNote}
            onTrashFolder={onTrashFolder}
          />
        ) : (
          <NoteTreeItem
            key={`note-${item.value.id}`}
            note={item.value}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        )
      ))}
    </SidebarMenu>
  );
}

export function FolderTree({
  nodes,
  notes,
  selectedNoteId,
  mode,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: FolderTreeProps) {
  const folderIds = useMemo(() => collectFolderIds(nodes), [nodes]);

  return (
    <FolderTreeItems
      nodes={nodes}
      notes={notes}
      parentId={null}
      selectedNoteId={selectedNoteId}
      mode={mode}
      folderIds={folderIds}
      onRestoreFolder={onRestoreFolder}
      onSelectNote={onSelectNote}
      onTrashFolder={onTrashFolder}
    />
  );
}
