import { useEffect, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NoteTagsProps = {
  noteId: number;
  tags: string[];
  readOnly: boolean;
  onAddTags: (value: string) => void;
  onRemoveTag: (tag: string) => void;
};

export function NoteTags({ noteId, tags, readOnly, onAddTags, onRemoveTag }: NoteTagsProps) {
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setTagInput("");
  }, [noteId]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    onAddTags(tagInput);
    setTagInput("");
  }

  return (
    <div className="editor-tags">
      {tags.map((tag) => (
        <Badge variant="secondary" key={tag}>
          #{tag}
          {readOnly ? null : (
            <Button
              variant="ghost"
              size="icon-xs"
              className="tag-remove-button"
              onClick={() => onRemoveTag(tag)}
              aria-label={`Remover etiqueta ${tag}`}
            >
              <X data-icon="inline-end" />
            </Button>
          )}
        </Badge>
      ))}
      {readOnly ? null : (
        <Input
          className="tag-input"
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="+ etiqueta"
          aria-label="Adicionar etiqueta"
        />
      )}
    </div>
  );
}
