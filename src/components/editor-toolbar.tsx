import { SidebarTrigger } from "@/components/ui/sidebar";

type EditorToolbarProps = {
  heading: string;
};

export function EditorToolbar({ heading }: EditorToolbarProps) {
  return (
    <header className="editor-toolbar">
      <div className="editor-toolbar-title">
        <SidebarTrigger aria-label="Alternar sidebar" />
        <div>
          <p className="eyebrow">Seu espaço</p>
          <h1>{heading}</h1>
        </div>
      </div>
    </header>
  );
}
