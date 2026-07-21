import { useMemo, useState } from "react";
import {
  DragDropProvider,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
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

type DraggedTreeItem =
  | { kind: "folder"; id: number }
  | { kind: "note"; id: number };

type DropTarget = { folderId: number | null };

type FolderTreeProps = {
  nodes: FolderTreeNode[];
  notes: Note[];
  selectedNoteId: number | null;
  mode: FolderTreeMode;
  onMoveFolder: (folderId: number, parentId: number | null) => void;
  onMoveNote: (noteId: number, folderId: number | null) => void;
  onRestoreFolder: (folder: FolderTreeNode) => void;
  onSelectNote: (noteId: number) => void;
  onTrashFolder: (folder: FolderTreeNode) => void;
};

type FolderTreeItemsProps = FolderTreeProps & {
  parentId: number | null;
  folderIds: ReadonlySet<number>;
  draggedItem: DraggedTreeItem | null;
};

type TreeItem =
  | { kind: "folder"; value: FolderTreeNode }
  | { kind: "note"; value: Note };

const ROOT_DROP_ID = "drop:root";
const sensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })],
  }),
  KeyboardSensor,
];

function draggableId(item: DraggedTreeItem) {
  return `drag:${item.kind}:${item.id}`;
}

function folderDropId(folderId: number) {
  return `drop:folder:${folderId}`;
}

function parseDraggedItem(id: string | number | undefined): DraggedTreeItem | null {
  if (typeof id !== "string") return null;

  const [prefix, kind, rawId] = id.split(":");
  const parsedId = Number(rawId);
  if (prefix !== "drag" || (kind !== "folder" && kind !== "note") || !Number.isInteger(parsedId)) {
    return null;
  }

  return { kind, id: parsedId };
}

function parseDropTarget(id: string | number | undefined): DropTarget | null {
  if (id === ROOT_DROP_ID) return { folderId: null };
  if (typeof id !== "string") return null;

  const [prefix, kind, rawId] = id.split(":");
  const parsedId = Number(rawId);
  if (prefix !== "drop" || kind !== "folder" || !Number.isInteger(parsedId)) return null;

  return { folderId: parsedId };
}

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
  mode,
  selectedNoteId,
  onSelectNote,
}: Pick<FolderTreeProps, "mode" | "selectedNoteId" | "onSelectNote"> & { note: Note }) {
  const { ref, handleRef, isDragSource } = useDraggable({
    id: draggableId({ kind: "note", id: note.id }),
    disabled: mode !== "active",
  });

  return (
    <SidebarMenuItem
      ref={ref}
      className={mode === "active" ? "sidebar-tree-item sidebar-tree-item--draggable" : "sidebar-tree-item"}
      data-dragging={isDragSource || undefined}
    >
      <SidebarMenuButton
        ref={handleRef}
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
  draggedItem,
  onMoveFolder,
  onMoveNote,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: FolderTreeItemsProps & { folder: FolderTreeNode }) {
  const [open, setOpen] = useState(true);
  const draggable = useDraggable({
    id: draggableId({ kind: "folder", id: folder.id }),
    disabled: mode !== "active",
  });
  const droppable = useDroppable({
    id: folderDropId(folder.id),
    disabled: mode !== "active" || (draggedItem?.kind === "folder" && draggedItem.id === folder.id),
  });
  const hasChildren = folder.children.length > 0 || notes.some((note) => note.folderId === folder.id);
  const isDropTarget = droppable.isDropTarget && !draggable.isDragSource;

  function setFolderButtonRef(element: HTMLButtonElement | null) {
    draggable.handleRef(element);
    droppable.ref(element);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem
        ref={draggable.ref}
        className={mode === "active" ? "sidebar-tree-item sidebar-tree-item--draggable" : "sidebar-tree-item"}
        data-dragging={draggable.isDragSource || undefined}
      >
        <SidebarMenuButton
          ref={setFolderButtonRef}
          render={<CollapsibleTrigger />}
          className={isDropTarget ? "sidebar-tree-folder--drop-target" : undefined}
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
                draggedItem={draggedItem}
                onMoveFolder={onMoveFolder}
                onMoveNote={onMoveNote}
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
  draggedItem,
  onMoveFolder,
  onMoveNote,
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
            draggedItem={draggedItem}
            onMoveFolder={onMoveFolder}
            onMoveNote={onMoveNote}
            onRestoreFolder={onRestoreFolder}
            onSelectNote={onSelectNote}
            onTrashFolder={onTrashFolder}
          />
        ) : (
          <NoteTreeItem
            key={`note-${item.value.id}`}
            note={item.value}
            mode={mode}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        )
      ))}
    </SidebarMenu>
  );
}

type FolderTreeContentsProps = FolderTreeProps & {
  folderIds: ReadonlySet<number>;
  draggedItem: DraggedTreeItem | null;
};

function FolderTreeContents({
  nodes,
  notes,
  selectedNoteId,
  mode,
  folderIds,
  draggedItem,
  onMoveFolder,
  onMoveNote,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: FolderTreeContentsProps) {
  const isDragging = draggedItem !== null;
  const rootDrop = useDroppable({
    id: ROOT_DROP_ID,
    disabled: mode !== "active",
  });

  return (
    <div className="sidebar-tree-root">
      <FolderTreeItems
        nodes={nodes}
        notes={notes}
        parentId={null}
        selectedNoteId={selectedNoteId}
        mode={mode}
        folderIds={folderIds}
        draggedItem={draggedItem}
        onMoveFolder={onMoveFolder}
        onMoveNote={onMoveNote}
        onRestoreFolder={onRestoreFolder}
        onSelectNote={onSelectNote}
        onTrashFolder={onTrashFolder}
      />
      <div
        ref={rootDrop.ref}
        className={[
          "sidebar-tree-root-dropzone",
          isDragging ? "sidebar-tree-root-dropzone--visible" : "",
          rootDrop.isDropTarget ? "sidebar-tree-root-dropzone--target" : "",
        ].filter(Boolean).join(" ")}
        aria-hidden={!isDragging}
      >
        {isDragging ? "Solte aqui para mover para a raiz" : null}
      </div>
    </div>
  );
}

export function FolderTree({
  nodes,
  notes,
  selectedNoteId,
  mode,
  onMoveFolder,
  onMoveNote,
  onRestoreFolder,
  onSelectNote,
  onTrashFolder,
}: FolderTreeProps) {
  const [draggedItem, setDraggedItem] = useState<DraggedTreeItem | null>(null);
  const folderIds = useMemo(() => collectFolderIds(nodes), [nodes]);

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={(event) => setDraggedItem(parseDraggedItem(event.operation.source?.id))}
      onDragEnd={(event) => {
        setDraggedItem(null);
        if (event.canceled) return;

        const item = parseDraggedItem(event.operation.source?.id);
        if (!item) return;
        const target = parseDropTarget(event.operation.target?.id);
        if (!target) return;
        if (item.kind === "folder") {
          if (item.id !== target.folderId) onMoveFolder(item.id, target.folderId);
        } else {
          onMoveNote(item.id, target.folderId);
        }
      }}
    >
      <FolderTreeContents
        nodes={nodes}
        notes={notes}
        selectedNoteId={selectedNoteId}
        mode={mode}
        folderIds={folderIds}
        draggedItem={draggedItem}
        onMoveFolder={onMoveFolder}
        onMoveNote={onMoveNote}
        onRestoreFolder={onRestoreFolder}
        onSelectNote={onSelectNote}
        onTrashFolder={onTrashFolder}
      />
    </DragDropProvider>
  );
}
