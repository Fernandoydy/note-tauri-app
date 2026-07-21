import { FileText } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type EditorEmptyStateProps = {
  isLoading: boolean;
};

export function EditorEmptyState({ isLoading }: EditorEmptyStateProps) {
  const title = isLoading ? "Carregando notas" : "Selecione ou crie uma nota";
  const description = isLoading
    ? "Abrindo seu banco de dados local."
    : "Tudo o que você escrever ficará salvo neste dispositivo.";

  return (
    <main className="editor-empty-state">
      <Empty className="empty-editor">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
