import { Archive, FileText, Hash, Star, Trash2 } from "lucide-react";
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

const collections: { label: Collection; icon: typeof FileText }[] = [
  { label: "Todas as notas", icon: FileText },
  { label: "Favoritas", icon: Star },
  { label: "Arquivadas", icon: Archive },
  { label: "Lixeira", icon: Trash2 },
];

type SidebarCollectionNavProps = {
  activeCollection: Collection;
  activeNotesCount: number;
  activeTag: string | null;
  tags: string[];
  trashCount: number;
  onSelectCollection: (collection: Collection) => void;
  onSelectTag: (tag: string) => void;
};

export function SidebarCollectionNav({
  activeCollection,
  activeNotesCount,
  activeTag,
  tags,
  trashCount,
  onSelectCollection,
  onSelectTag,
}: SidebarCollectionNavProps) {
  return (
    <>
      <SidebarGroup className="sidebar-filter-group">
        <SidebarGroupLabel>Biblioteca</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {collections.map(({ label, icon: Icon }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  isActive={activeCollection === label && activeTag === null}
                  tooltip={label}
                  onClick={() => onSelectCollection(label)}
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
                {label === "Todas as notas" ? (
                  <SidebarMenuBadge>{activeNotesCount}</SidebarMenuBadge>
                ) : label === "Lixeira" && trashCount > 0 ? (
                  <SidebarMenuBadge>{trashCount}</SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {tags.length > 0 ? (
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
      ) : null}
    </>
  );
}
