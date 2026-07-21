import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type WorkspaceErrorAlertProps = {
  message: string;
};

export function WorkspaceErrorAlert({ message }: WorkspaceErrorAlertProps) {
  return (
    <Alert variant="destructive" className="database-error">
      <CircleAlert />
      <AlertTitle>Não foi possível concluir a operação</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
