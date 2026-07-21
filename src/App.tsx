import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, AppSidebarProvider, type Collection } from "@/components/app-sidebar";
import { DestructiveConfirmationDialog } from "@/components/destructive-confirmation-dialog";
import { EditorEmptyState } from "@/components/editor-empty-state";
import { EditorToolbar } from "@/components/editor-toolbar";
import { NoteEditor, type SaveStatus } from "@/components/note-editor";
import { WorkspaceErrorAlert } from "@/components/workspace-error-alert";
import { buildFolderTree, findFolder } from "@/lib/folder-tree";
import { getErrorMessage } from "@/lib/error-message";
import { normalizeTags } from "@/lib/note-tags";
import * as notesRepository from "@/lib/notes-repository";
import type { Folder, FolderTreeNode, Note } from "@/lib/notes-repository";
import "./App.css";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "notes-theme";

function getInitialTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [trashedFolderTree, setTrashedFolderTree] = useState<FolderTreeNode[]>([]);
  const [trashFolderCount, setTrashFolderCount] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCollection, setActiveCollection] = useState<Collection>("Todas as notas");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [folderPendingTrash, setFolderPendingTrash] = useState<FolderTreeNode | null>(null);
  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const saveTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedNotes, allFolders] = await Promise.all([
        notesRepository.listNotes(),
        notesRepository.listFolders(true),
      ]);
      const activeFolders = allFolders.filter((folder) => folder.deletedAt === null);
      const trashedFolders = allFolders.filter((folder) => folder.deletedAt !== null);
      setNotes(loadedNotes);
      setFolderTree(buildFolderTree(activeFolders));
      setTrashedFolderTree(buildFolderTree(trashedFolders));
      setTrashFolderCount(trashedFolders.length);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
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

  const createNote = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const newNote = await notesRepository.createNote();
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
  }, []);

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
  const trashCount = notes.filter((note) => note.deletedAt).length + trashFolderCount;
  const selectedNoteFolder = useMemo(
    () => findFolder([...folderTree, ...trashedFolderTree], selectedNote?.folderId ?? null),
    [folderTree, selectedNote?.folderId, trashedFolderTree],
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
      await notesRepository.createFolder(folderDraft);
      setFolderDraft("");
      setIsCreatingFolder(false);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function moveFolder(folderId: number, parentId: number | null) {
    try {
      await notesRepository.moveFolder(folderId, parentId);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function moveNoteToFolder(noteId: number, folderId: number | null) {
    try {
      await notesRepository.moveNotesToFolder([noteId], folderId);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function confirmTrashFolder() {
    if (!folderPendingTrash) return;

    try {
      await notesRepository.moveFolderToTrash(folderPendingTrash.id);
      setSelectedId(null);
      setFolderPendingTrash(null);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function restoreFolder(folder: Folder) {
    try {
      await notesRepository.restoreFolder(folder.id);
      setActiveCollection("Todas as notas");
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

    setSaveStatus("saving");
    try {
      await notesRepository.permanentlyDeleteNote(selectedNote.id);
      setNotes((current) => current.filter((note) => note.id !== selectedNote.id));
      setIsPermanentDeleteDialogOpen(false);
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(getErrorMessage(error));
    }
  }

  const heading = activeTag ? `#${activeTag}` : activeCollection;

  return (
    <AppSidebarProvider>
      <AppSidebar
        activeCollection={activeCollection}
        activeNotesCount={activeNotesCount}
        activeTag={activeTag}
        folderDraft={folderDraft}
        folderTree={folderTree}
        isCreatingFolder={isCreatingFolder}
        isLoading={isLoading}
        selectedNoteId={selectedNote?.id ?? null}
        search={search}
        searchRef={searchRef}
        tags={tags}
        trashedFolderTree={trashedFolderTree}
        trashCount={trashCount}
        visibleNotes={visibleNotes}
        theme={theme}
        onToggleTheme={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
        onBeginFolderCreation={() => {
          setFolderDraft("");
          setIsCreatingFolder(true);
        }}
        onBrandClick={() => {
          setActiveCollection("Todas as notas");
          setActiveTag(null);
        }}
        onCancelFolderCreation={() => {
          setFolderDraft("");
          setIsCreatingFolder(false);
        }}
        onCreateFolder={() => void createFolder()}
        onCreateNote={() => void createNote()}
        onFolderDraftChange={setFolderDraft}
        onMoveFolder={(folderId, parentId) => void moveFolder(folderId, parentId)}
        onMoveNote={(noteId, folderId) => void moveNoteToFolder(noteId, folderId)}
        onRestoreFolder={(folder) => void restoreFolder(folder)}
        onSearchChange={setSearch}
        onClearSearch={() => setSearch("")}
        onSelectCollection={(collection) => {
          setActiveCollection(collection);
          setActiveTag(null);
        }}
        onSelectNote={setSelectedId}
        onSelectTag={(tag) => {
          setActiveCollection("Todas as notas");
          setActiveTag(activeTag === tag ? null : tag);
        }}
        onTrashFolder={setFolderPendingTrash}
      />

      <SidebarInset className="editor-inset">
        <EditorToolbar heading={heading} />

        {errorMessage ? <WorkspaceErrorAlert message={errorMessage} /> : null}

        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            folder={selectedNoteFolder}
            saveStatus={saveStatus}
            onAddTags={addTags}
            onBodyChange={(body) => updateNote("body", body)}
            onMoveToTrash={() => void moveToTrash()}
            onPermanentlyDelete={() => setIsPermanentDeleteDialogOpen(true)}
            onRestore={() => void restoreSelectedNote()}
            onSaveTags={saveTags}
            onTitleChange={(title) => updateNote("title", title)}
            onToggleArchived={() => updateNoteProperties({ isArchived: !selectedNote.isArchived })}
            onTogglePinned={() => updateNoteProperties({ isPinned: !selectedNote.isPinned })}
          />
        ) : (
          <EditorEmptyState isLoading={isLoading} />
        )}
      </SidebarInset>

      <DestructiveConfirmationDialog
        open={Boolean(folderPendingTrash)}
        title="Mover pasta para a lixeira?"
        description={`Mover “${folderPendingTrash?.name ?? "esta pasta"}” e todo o conteúdo para a lixeira?`}
        confirmLabel="Mover para a lixeira"
        onOpenChange={(open) => {
          if (!open) setFolderPendingTrash(null);
        }}
        onConfirm={() => void confirmTrashFolder()}
      />
      <DestructiveConfirmationDialog
        open={isPermanentDeleteDialogOpen}
        title="Excluir nota permanentemente?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir permanentemente"
        onOpenChange={setIsPermanentDeleteDialogOpen}
        onConfirm={() => void permanentlyDeleteSelectedNote()}
      />
    </AppSidebarProvider>
  );
}

export default App;
