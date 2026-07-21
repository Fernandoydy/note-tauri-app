import type { FolderTreeNode } from "@/lib/notes-repository";

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
