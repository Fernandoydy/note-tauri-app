import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Clock3,
  FileText,
  Folder as FolderIcon,
  Pin,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, AppSidebarProvider, type Collection } from "@/components/app-sidebar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import * as notesRepository from "@/lib/notes-repository";
import type { Folder, FolderTreeNode, Note } from "@/lib/notes-repository";
import "./App.css";

type SaveStatus = "saved" | "saving" | "error";

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

function findFolder(nodes: FolderTreeNode[], id: number | null): FolderTreeNode | undefined {
  if (id === null) return undefined;

  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findFolder(node.children, id);
    if (child) return child;
  }

  return undefined;
}



function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<Folder[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCollection, setActiveCollection] = useState<Collection>("Todas as notas");
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [folderDraft, setFolderDraft] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const saveTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedNotes, loadedFolderTree, allFolders] = await Promise.all([
        notesRepository.listNotes(),
        notesRepository.listFolderTree(),
        notesRepository.listFolders(true),
      ]);
      const deletedFolderIds = new Set(
        allFolders
          .filter((folder) => folder.deletedAt !== null)
          .map((folder) => folder.id),
      );
      setNotes(loadedNotes);
      setFolderTree(loadedFolderTree);
      setTrashedFolders(
        allFolders.filter(
          (folder) =>
            folder.deletedAt !== null &&
            (folder.parentId === null || !deletedFolderIds.has(folder.parentId)),
        ),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const activeFolder = useMemo(
    () => findFolder(folderTree, activeFolderId),
    [activeFolderId, folderTree],
  );

  const visibleNotes = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase("pt-BR");

    return notes.filter((note) => {
      const matchesCollection =
        (activeCollection === "Todas as notas" && !note.deletedAt && !note.isArchived) ||
        (activeCollection === "Favoritas" && !note.deletedAt && !note.isArchived && note.isPinned) ||
        (activeCollection === "Arquivadas" && !note.deletedAt && note.isArchived) ||
        (activeCollection === "Lixeira" && Boolean(note.deletedAt));
      const matchesFolder = activeFolderId === null || note.folderId === activeFolderId;
      const matchesTag = !activeTag || note.tags.includes(activeTag);
      const matchesSearch =
        !normalizedQuery ||
        [note.title, note.body, ...note.tags]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);

      return matchesCollection && matchesFolder && matchesTag && matchesSearch;
    });
  }, [activeCollection, activeFolderId, activeTag, notes, search]);

  useEffect(() => {
    if (visibleNotes.some((note) => note.id === selectedId)) return;
    setSelectedId(visibleNotes[0]?.id ?? null);
  }, [selectedId, visibleNotes]);

  const createNote = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const newNote = await notesRepository.createNote(activeFolderId);
      setNotes((current) => [newNote, ...current]);
      setSelectedId(newNote.id);
      setActiveCollection("Todas as notas");
      setActiveTag(null);
      setSearch("");
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }, [activeFolderId]);

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
  }, [createNote]);

  const selectedNote = visibleNotes.find((note) => note.id === selectedId) ?? visibleNotes[0];
  const tags = useMemo(
    () =>
      [...new Set(notes.filter((note) => !note.deletedAt).flatMap((note) => note.tags))].sort(
        (left, right) => left.localeCompare(right, "pt-BR"),
      ),
    [notes],
  );
  const activeNotesCount = notes.filter((note) => !note.deletedAt && !note.isArchived).length;
  const trashCount = notes.filter((note) => note.deletedAt).length + trashedFolders.length;
  const selectedNoteFolder = useMemo(
    () => findFolder(folderTree, selectedNote?.folderId ?? null),
    [folderTree, selectedNote?.folderId],
  );

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

  function updateNote(field: "title" | "body", value: string) {
    if (!selectedNote) return;

    const updatedNote = { ...selectedNote, [field]: value, updatedAt: new Date().toISOString() };
    setNotes((current) => current.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
    scheduleSave(updatedNote);
  }

  function updateNoteProperties(properties: Pick<Note, "isPinned"> | Pick<Note, "isArchived">) {
    if (!selectedNote) return;

    const updatedNote = { ...selectedNote, ...properties, updatedAt: new Date().toISOString() };
    setNotes((current) => current.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
    scheduleSave(updatedNote);
  }

  function saveTags(nextTags: string[]) {
    if (!selectedNote) return;

    const updatedNote = { ...selectedNote, tags: nextTags, updatedAt: new Date().toISOString() };
    setNotes((current) => current.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
    scheduleSave(updatedNote);
    void notesRepository.saveNoteTags(updatedNote.id, nextTags).catch((error) => {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    });
  }

  function addTags(value: string) {
    if (!selectedNote) return;
    const nextTags = normalizeTags([...selectedNote.tags, ...normalizeTags(value)].join(","));
    if (nextTags.length > selectedNote.tags.length) saveTags(nextTags);
  }

  async function createFolder() {
    try {
      await notesRepository.createFolder(folderDraft, activeFolderId);
      setFolderDraft("");
      setIsCreatingFolder(false);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function trashFolder(folder: FolderTreeNode) {
    if (!window.confirm(`Mover “${folder.name}” e todo o conteúdo para a lixeira?`)) return;

    try {
      await notesRepository.moveFolderToTrash(folder.id);
      setActiveFolderId(null);
      setSelectedId(null);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function restoreFolder(folder: Folder) {
    try {
      await notesRepository.restoreFolder(folder.id);
      setActiveCollection("Todas as notas");
      setActiveFolderId(folder.id);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function moveToTrash() {
    if (!selectedNote) return;

    setSaveStatus("saving");
    try {
      const deletedAt = await notesRepository.moveNoteToTrash(selectedNote.id);
      setNotes((current) => current.map((note) => (
        note.id === selectedNote.id ? { ...note, deletedAt, updatedAt: deletedAt } : note
      )));
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
      setNotes((current) => current.map((note) => (
        note.id === selectedNote.id ? { ...note, deletedAt: null, updatedAt } : note
      )));
      setActiveCollection(selectedNote.isArchived ? "Arquivadas" : "Todas as notas");
      setActiveFolderId(selectedNote.folderId);
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
    if (!window.confirm("Excluir esta nota permanentemente? Esta ação não pode ser desfeita.")) return;

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

  const statusText = saveStatus === "saving" ? "Salvando..." : saveStatus === "error" ? "Falha ao salvar" : "Salvo agora";
  const heading = activeTag ? `#${activeTag}` : activeFolder?.name ?? activeCollection;

  return (
    <AppSidebarProvider>
      <AppSidebar
        activeCollection={activeCollection}
        activeFolderId={activeFolderId}
        activeNotesCount={activeNotesCount}
        activeTag={activeTag}
        folderDraft={folderDraft}
        folderTree={folderTree}
        isCreatingFolder={isCreatingFolder}
        isLoading={isLoading}
        selectedNoteId={selectedNote?.id ?? null}
        tags={tags}
        trashedFolders={trashedFolders}
        trashCount={trashCount}
        visibleNotes={visibleNotes}
        onBeginFolderCreation={() => {
          setFolderDraft("");
          setIsCreatingFolder(true);
        }}
        onBrandClick={() => {
          setActiveCollection("Todas as notas");
          setActiveFolderId(null);
          setActiveTag(null);
        }}
        onCancelFolderCreation={() => {
          setFolderDraft("");
          setIsCreatingFolder(false);
        }}
        onCreateFolder={() => void createFolder()}
        onCreateNote={() => void createNote()}
        onFolderDraftChange={setFolderDraft}
        onRestoreFolder={(folder) => void restoreFolder(folder)}
        onSelectCollection={(collection) => {
          setActiveCollection(collection);
          setActiveFolderId(null);
          setActiveTag(null);
        }}
        onSelectFolder={(folder) => {
          setActiveCollection("Todas as notas");
          setActiveTag(null);
          setActiveFolderId(folder.id);
          setSearch("");
        }}
        onSelectNote={setSelectedId}
        onSelectTag={(tag) => {
          setActiveCollection("Todas as notas");
          setActiveFolderId(null);
          setActiveTag(activeTag === tag ? null : tag);
        }}
        onTrashFolder={(folder) => void trashFolder(folder)}
      />

      <SidebarInset className="editor-inset">
        <header className="editor-toolbar">
          <div className="editor-toolbar-title">
            <SidebarTrigger aria-label="Alternar sidebar" />
            <div>
              <p className="eyebrow">Seu espaço</p>
              <h1>{heading}</h1>
            </div>
          </div>
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
        </header>

        {errorMessage && <p className="database-error" role="alert">{errorMessage}</p>}

        {selectedNote ? (
          <article className="editor-panel" key={selectedNote.id}>
            <header className="editor-header">
              <div className={`editor-status editor-status--${saveStatus}`}><span className="save-dot" />{statusText}</div>
              <div className="editor-actions">
                {selectedNote.deletedAt ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => void restoreSelectedNote()} aria-label="Restaurar nota"><RotateCcw /></Button>
                    <Button variant="ghost" size="icon" className="danger-button" onClick={() => void permanentlyDeleteSelectedNote()} aria-label="Excluir permanentemente"><Trash2 /></Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className={cn(selectedNote.isPinned && "icon-button--active")} onClick={() => updateNoteProperties({ isPinned: !selectedNote.isPinned })} aria-label={selectedNote.isPinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Pin fill={selectedNote.isPinned ? "currentColor" : "none"} /></Button>
                    <Button variant="ghost" size="icon" className={cn(selectedNote.isArchived && "icon-button--active")} onClick={() => updateNoteProperties({ isArchived: !selectedNote.isArchived })} aria-label={selectedNote.isArchived ? "Desarquivar nota" : "Arquivar nota"}><Archive /></Button>
                    <Button variant="ghost" size="icon" className="danger-button" onClick={() => void moveToTrash()} aria-label="Mover para lixeira"><Trash2 /></Button>
                  </>
                )}
              </div>
            </header>

            <div className="paper">
              <div className="paper-metadata">
                <span>{formatDateLabel(selectedNote.createdAt)}</span>
                {selectedNoteFolder && <><span className="metadata-separator">·</span><span><FolderIcon /> {selectedNoteFolder.name}</span></>}
                <span className="metadata-separator">·</span>
                <span><Clock3 /> atualizado {formatUpdatedAt(selectedNote.updatedAt).toLocaleLowerCase("pt-BR")}</span>
              </div>
              <Input className="note-title-input" value={selectedNote.title} onChange={(event) => updateNote("title", event.target.value)} aria-label="Título da nota" disabled={Boolean(selectedNote.deletedAt)} />
              <Textarea className="note-body-input" value={selectedNote.body} onChange={(event) => updateNote("body", event.target.value)} placeholder="Comece a escrever..." aria-label="Conteúdo da nota" disabled={Boolean(selectedNote.deletedAt)} />
              <Separator />
              <footer className="paper-footer">
                <div className="editor-tags">
                  {selectedNote.tags.map((tag) => (
                    <Badge variant="secondary" key={tag}>
                      #{tag}
                      {!selectedNote.deletedAt && <Button variant="ghost" size="icon-xs" className="tag-remove-button" onClick={() => saveTags(selectedNote.tags.filter((item) => item !== tag))} aria-label={`Remover etiqueta ${tag}`}><X /></Button>}
                    </Badge>
                  ))}
                  {!selectedNote.deletedAt && <Input className="tag-input" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTags(tagInput); setTagInput(""); } }} placeholder="+ etiqueta" aria-label="Adicionar etiqueta" />}
                </div>
                <span>{selectedNote.body.trim() ? `${selectedNote.body.trim().split(/\s+/).length} palavras` : "0 palavras"}</span>
              </footer>
            </div>
          </article>
        ) : (
          <main className="editor-empty-state">
            <Empty className="empty-editor">
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileText /></EmptyMedia>
                <EmptyTitle>{isLoading ? "Carregando notas" : "Selecione ou crie uma nota"}</EmptyTitle>
                <EmptyDescription>{isLoading ? "Abrindo seu banco de dados local." : "Tudo o que você escrever ficará salvo neste dispositivo."}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </main>
        )}
      </SidebarInset>
    </AppSidebarProvider>
  );
}

export default App;
