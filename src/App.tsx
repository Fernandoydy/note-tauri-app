import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ChevronDown,
  Clock3,
  FileText,
  Hash,
  MoreHorizontal,
  PanelLeft,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import * as notesRepository from "@/lib/notes-repository";
import type { Note } from "@/lib/notes-repository";
import "./App.css";

type Collection =
  | "Todas as notas"
  | "Favoritas"
  | "Arquivadas"
  | "Lixeira";

type SaveStatus = "saved" | "saving" | "error";

const collections: { label: Collection; icon: typeof FileText }[] = [
  { label: "Todas as notas", icon: FileText },
  { label: "Favoritas", icon: Star },
  { label: "Arquivadas", icon: Archive },
  { label: "Lixeira", icon: Trash2 },
];

function previewFor(note: Note) {
  return note.body.replace(/\n/g, " ").trim() || "Comece a escrever...";
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));

  if (elapsedMinutes < 1) return "Agora";
  if (elapsedMinutes < 60) return `Há ${elapsedMinutes} min`;
  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  const seen = new Set<string>();

  return tags.filter((tag) => {
    const key = tag.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar a alteração.";
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCollection, setActiveCollection] = useState<Collection>("Todas as notas");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const saveTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedNotes = await notesRepository.listNotes();
      setNotes(loadedNotes);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const visibleNotes = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase("pt-BR");

    return notes.filter((note) => {
      const matchesCollection =
        (activeCollection === "Todas as notas" && !note.deletedAt && !note.isArchived) ||
        (activeCollection === "Favoritas" && !note.deletedAt && !note.isArchived && note.isPinned) ||
        (activeCollection === "Arquivadas" && !note.deletedAt && note.isArchived) ||
        (activeCollection === "Lixeira" && Boolean(note.deletedAt));
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      const matchesSearch =
        !normalizedQuery ||
        [note.title, note.body, ...note.tags]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);

      return matchesCollection && matchesTag && matchesSearch;
    });
  }, [activeCollection, activeTag, notes, search]);

  useEffect(() => {
    if (visibleNotes.some((note) => note.id === selectedId)) return;
    setSelectedId(visibleNotes[0]?.id ?? null);
  }, [selectedId, visibleNotes]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createNote();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const selectedNote = visibleNotes.find((note) => note.id === selectedId) ?? visibleNotes[0];
  const tags = useMemo(
    () =>
      [...new Set(notes.filter((note) => !note.deletedAt).flatMap((note) => note.tags))].sort(
        (left, right) => left.localeCompare(right, "pt-BR"),
      ),
    [notes],
  );
  const activeNotesCount = notes.filter((note) => !note.deletedAt && !note.isArchived).length;
  const trashCount = notes.filter((note) => note.deletedAt).length;

  function scheduleSave(note: Note) {
    const existingTimer = saveTimersRef.current.get(note.id);
    if (existingTimer) clearTimeout(existingTimer);

    setSaveStatus("saving");
    saveTimersRef.current.set(
      note.id,
      setTimeout(() => {
        saveTimersRef.current.delete(note.id);
        void notesRepository
          .saveNote(note)
          .then(() => {
            setSaveStatus("saved");
            setErrorMessage(null);
          })
          .catch((error) => {
            setSaveStatus("error");
            setErrorMessage(getErrorMessage(error));
          });
      }, 500),
    );
  }

  async function createNote() {
    setSaveStatus("saving");
    try {
      const newNote = await notesRepository.createNote();
      setNotes((current) => [newNote, ...current]);
      setSelectedId(newNote.id);
      setActiveCollection("Todas as notas");
      setActiveTag(null);
      setSearch("");
      setSidebarOpen(false);
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  function updateNote(field: "title" | "body", value: string) {
    if (!selectedNote) return;

    const updatedNote = {
      ...selectedNote,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    setNotes((current) =>
      current.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
    );
    scheduleSave(updatedNote);
  }

  function updateNoteProperties(
    properties: Pick<Note, "isPinned"> | Pick<Note, "isArchived">,
  ) {
    if (!selectedNote) return;

    const updatedNote = {
      ...selectedNote,
      ...properties,
      updatedAt: new Date().toISOString(),
    };
    setNotes((current) =>
      current.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
    );
    scheduleSave(updatedNote);
  }

  function saveTags(nextTags: string[]) {
    if (!selectedNote) return;

    const updatedNote = {
      ...selectedNote,
      tags: nextTags,
      updatedAt: new Date().toISOString(),
    };
    setNotes((current) =>
      current.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
    );
    scheduleSave(updatedNote);
    setSaveStatus("saving");
    void notesRepository
      .saveNoteTags(updatedNote.id, nextTags)
      .then(() => {
        setSaveStatus("saved");
        setErrorMessage(null);
      })
      .catch((error) => {
        setSaveStatus("error");
        setErrorMessage(getErrorMessage(error));
      });
  }

  function addTags(value: string) {
    if (!selectedNote) return;
    const nextTags = normalizeTags([...selectedNote.tags, ...normalizeTags(value)].join(","));
    if (nextTags.length === selectedNote.tags.length) return;
    saveTags(nextTags);
  }

  function removeTag(tagToRemove: string) {
    if (!selectedNote) return;
    saveTags(selectedNote.tags.filter((tag) => tag !== tagToRemove));
  }

  async function moveToTrash() {
    if (!selectedNote) return;

    setSaveStatus("saving");
    try {
      const deletedAt = await notesRepository.moveNoteToTrash(selectedNote.id);
      setNotes((current) =>
        current.map((note) =>
          note.id === selectedNote.id
            ? { ...note, deletedAt, updatedAt: deletedAt }
            : note,
        ),
      );
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function restoreSelectedNote() {
    if (!selectedNote) return;

    const updatedAt = new Date().toISOString();
    setSaveStatus("saving");
    try {
      await notesRepository.restoreNote(selectedNote.id);
      setNotes((current) =>
        current.map((note) =>
          note.id === selectedNote.id
            ? { ...note, deletedAt: null, updatedAt }
            : note,
        ),
      );
      setActiveCollection(selectedNote.isArchived ? "Arquivadas" : "Todas as notas");
      setSelectedId(selectedNote.id);
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function permanentlyDeleteSelectedNote() {
    if (!selectedNote) return;
    if (!window.confirm("Excluir esta nota permanentemente? Esta ação não pode ser desfeita.")) {
      return;
    }

    setSaveStatus("saving");
    try {
      await notesRepository.permanentlyDeleteNote(selectedNote.id);
      setNotes((current) => current.filter((note) => note.id !== selectedNote.id));
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  const statusText =
    saveStatus === "saving"
      ? "Salvando..."
      : saveStatus === "error"
        ? "Falha ao salvar"
        : "Salvo agora";

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="brand-row">
          <Button
            variant="ghost"
            className="brand"
            onClick={() => {
              setActiveCollection("Todas as notas");
              setActiveTag(null);
            }}
          >
            <span className="brand-mark">n</span>
            <span>notas</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="mobile-only"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X />
          </Button>
        </div>

        <Button className="new-note-button" onClick={() => void createNote()}>
          <Plus data-icon="inline-start" />
          Nova nota
          <kbd>⌘ N</kbd>
        </Button>

        <nav className="sidebar-navigation" aria-label="Coleções">
          <p className="eyebrow">Biblioteca</p>
          {collections.map(({ label, icon: Icon }) => (
            <Button
              variant="ghost"
              className={`nav-item ${activeCollection === label ? "nav-item--active" : ""}`}
              key={label}
              onClick={() => {
                setActiveCollection(label);
                setActiveTag(null);
                setSidebarOpen(false);
              }}
            >
              <Icon data-icon="inline-start" />
              <span>{label}</span>
              {label === "Todas as notas" && <em>{activeNotesCount}</em>}
              {label === "Lixeira" && trashCount > 0 && <em>{trashCount}</em>}
            </Button>
          ))}
        </nav>

        <section className="tag-section">
          <p className="eyebrow">Etiquetas</p>
          {tags.map((tag) => (
            <Button
              variant="ghost"
              className={`tag-link ${activeTag === tag ? "tag-link--active" : ""}`}
              key={tag}
              onClick={() => {
                setActiveCollection("Todas as notas");
                setActiveTag(activeTag === tag ? null : tag);
                setSidebarOpen(false);
              }}
            >
              <Hash data-icon="inline-start" />
              {tag}
            </Button>
          ))}
        </section>

        <div className="profile-card">
          <Avatar size="sm"><AvatarFallback>F</AvatarFallback></Avatar>
          <div>
            <strong>Você</strong>
            <span>Plano pessoal</span>
          </div>
          <ChevronDown />
        </div>
      </aside>

      {sidebarOpen && (
        <Button
          variant="ghost"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="note-list-panel">
        <header className="list-header">
          <div className="list-heading">
            <Button
              variant="ghost"
              size="icon"
              className="menu-trigger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <PanelLeft />
            </Button>
            <div>
              <p className="eyebrow">Seu espaço</p>
              <h1>{activeTag ? `#${activeTag}` : activeCollection}</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Mais opções"><MoreHorizontal /></Button>
        </header>

        <label className="search-field">
          <Search />
          <Input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar nas notas"
            aria-label="Buscar nas notas"
          />
          {search ? (
            <Button variant="ghost" size="icon-xs" onClick={() => setSearch("")} aria-label="Limpar busca"><X /></Button>
          ) : (
            <kbd>⌘ K</kbd>
          )}
        </label>

        {errorMessage && <p className="database-error" role="alert">{errorMessage}</p>}

        <ScrollArea className="notes-scroll-area">
          <p className="result-count">
            {isLoading ? "Carregando..." : `${visibleNotes.length} ${visibleNotes.length === 1 ? "nota" : "notas"}`}
          </p>
          <div className="note-list">
            {visibleNotes.map((note) => (
              <Button
                variant="ghost"
                className={`note-card note-card--${note.color} ${selectedNote?.id === note.id ? "note-card--selected" : ""}`}
                key={note.id}
                onClick={() => setSelectedId(note.id)}
              >
                <div className="note-card-topline">
                  <span>{formatUpdatedAt(note.updatedAt)}</span>
                  {note.isPinned && <Pin fill="currentColor" />}
                </div>
                <strong>{note.title || "Nota sem título"}</strong>
                <p>{previewFor(note)}</p>
                <div className="note-tags">
                  {note.tags.map((tag) => <Badge variant="outline" key={tag}>{tag}</Badge>)}
                </div>
              </Button>
            ))}
            {!isLoading && visibleNotes.length === 0 && (
              <Empty className="empty-search">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Search /></EmptyMedia>
                  <EmptyTitle>Nada por aqui</EmptyTitle>
                  <EmptyDescription>
                    {activeCollection === "Lixeira"
                      ? "Notas excluídas aparecem aqui."
                      : "Tente outra palavra ou crie uma nova nota."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </ScrollArea>
      </section>

      {selectedNote ? (
        <article className="editor-panel" key={selectedNote.id}>
          <header className="editor-header">
            <div className={`editor-status editor-status--${saveStatus}`}><span className="save-dot" />{statusText}</div>
            <div className="editor-actions">
              {selectedNote.deletedAt ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void restoreSelectedNote()}
                    aria-label="Restaurar nota"
                  >
                    <RotateCcw />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="danger-button"
                    onClick={() => void permanentlyDeleteSelectedNote()}
                    aria-label="Excluir permanentemente"
                  >
                    <Trash2 />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={selectedNote.isPinned ? "icon-button--active" : ""}
                    onClick={() => updateNoteProperties({ isPinned: !selectedNote.isPinned })}
                    aria-label={selectedNote.isPinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Pin fill={selectedNote.isPinned ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={selectedNote.isArchived ? "icon-button--active" : ""}
                    onClick={() => updateNoteProperties({ isArchived: !selectedNote.isArchived })}
                    aria-label={selectedNote.isArchived ? "Desarquivar nota" : "Arquivar nota"}
                  >
                    <Archive />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="danger-button"
                    onClick={() => void moveToTrash()}
                    aria-label="Mover para lixeira"
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="paper">
            <div className="paper-metadata">
              <span>{formatDateLabel(selectedNote.createdAt)}</span>
              <span className="metadata-separator">·</span>
              <span><Clock3 /> atualizado {formatUpdatedAt(selectedNote.updatedAt).toLocaleLowerCase("pt-BR")}</span>
            </div>
            <Input
              className="note-title-input"
              value={selectedNote.title}
              onChange={(event) => updateNote("title", event.target.value)}
              aria-label="Título da nota"
              disabled={Boolean(selectedNote.deletedAt)}
            />
            <Textarea
              className="note-body-input"
              value={selectedNote.body}
              onChange={(event) => updateNote("body", event.target.value)}
              placeholder="Comece a escrever..."
              aria-label="Conteúdo da nota"
              disabled={Boolean(selectedNote.deletedAt)}
            />
            <Separator />
            <footer className="paper-footer">
              <div className="editor-tags">
                {selectedNote.tags.map((tag) => (
                  <Badge variant="secondary" key={tag}>
                    #{tag}
                    {!selectedNote.deletedAt && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="tag-remove-button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remover etiqueta ${tag}`}
                      >
                        <X />
                      </Button>
                    )}
                  </Badge>
                ))}
                {!selectedNote.deletedAt && (
                  <Input
                    className="tag-input"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      addTags(tagInput);
                      setTagInput("");
                    }}
                    placeholder="+ etiqueta"
                    aria-label="Adicionar etiqueta"
                  />
                )}
              </div>
              <span>{selectedNote.body.trim() ? `${selectedNote.body.trim().split(/\s+/).length} palavras` : "0 palavras"}</span>
            </footer>
          </div>
        </article>
      ) : (
        <article className="editor-panel editor-panel--empty">
          <Empty className="empty-editor">
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText /></EmptyMedia>
              <EmptyTitle>{isLoading ? "Carregando notas" : "Selecione ou crie uma nota"}</EmptyTitle>
              <EmptyDescription>
                {isLoading ? "Abrindo seu banco de dados local." : "Tudo o que você escrever ficará salvo neste dispositivo."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </article>
      )}
    </main>
  );
}

export default App;
