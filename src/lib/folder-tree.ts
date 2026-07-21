import type { Folder, FolderTreeNode } from "@/lib/notes-repository";

export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const nodesById = new Map<number, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    nodesById.set(folder.id, { ...folder, children: [] });
  }

  for (const folder of folders) {
    const node = nodesById.get(folder.id)!;
    const parent = folder.parentId === null ? undefined : nodesById.get(folder.parentId);

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function findFolder(
  nodes: FolderTreeNode[],
  id: number | null,
): FolderTreeNode | undefined {
  if (id === null) return undefined;

  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findFolder(node.children, id);
    if (child) return child;
  }

  return undefined;
}
