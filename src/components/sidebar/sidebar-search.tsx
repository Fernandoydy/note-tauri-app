import type { RefObject } from "react";
import { Search, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

type SidebarSearchProps = {
  search: string;
  searchRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
};

export function SidebarSearch({
  search,
  searchRef,
  onSearchChange,
  onClearSearch,
}: SidebarSearchProps) {
  return (
    <InputGroup className="sidebar-search group-data-[collapsible=icon]:hidden">
      <InputGroupInput
        ref={searchRef}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar nas notas"
        aria-label="Buscar nas notas"
      />
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        {search ? (
          <InputGroupButton size="icon-xs" onClick={onClearSearch} aria-label="Limpar busca">
            <X data-icon="inline-end" />
          </InputGroupButton>
        ) : (
          <Kbd>⌘ K</Kbd>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
