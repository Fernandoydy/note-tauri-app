import { useEffect, useMemo, useRef, useState } from "react";
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
import "./App.css";

type Note = {
  id: number;
  title: string;
  preview: string;
  body: string;
  updatedAt: string;
  dateLabel: string;
  tags: string[];
  color: "sand" | "peach" | "blue";
  pinned?: boolean;
};

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Ideias para a nova casa",
    preview: "Luz natural, livros à vista e uma mesa que seja grande o bastante para domingos lentos.",
    body: "Luz natural, livros à vista e uma mesa que seja grande o bastante para domingos lentos.\n\nCoisas que quero sentir quando entrar:\n\n• calma, mesmo nos dias corridos\n• espaço para receber quem eu amo\n• plantas em todos os cantos que recebem sol\n\nProcurar uma luminária de leitura e medir a parede da sala antes de comprar a estante.",
    updatedAt: "Há 18 min",
    dateLabel: "23 de abril de 2024",
    tags: ["pessoal", "casa"],
    color: "sand",
    pinned: true,
  },
  {
    id: 2,
    title: "O que fazer quando a ideia não vem",
    preview: "Começar pelo detalhe que já está claro. Não esperar a frase perfeita para abrir o documento.",
    body: "Começar pelo detalhe que já está claro. Não esperar a frase perfeita para abrir o documento.\n\nA primeira versão só precisa existir. O trabalho de verdade começa depois, quando há algo concreto para conversar.",
    updatedAt: "Ontem",
    dateLabel: "22 de abril de 2024",
    tags: ["escrita"],
    color: "peach",
  },
  {
    id: 3,
    title: "Leituras de abril",
    preview: "Terminar o ensaio da Ursula K. Le Guin. Recomeçar O Avesso da Pele, sem pressa.",
    body: "Terminar o ensaio da Ursula K. Le Guin.\n\nRecomeçar O Avesso da Pele, sem pressa.\n\nAnotar passagens que fiquem comigo — não para transformar a leitura em tarefa, mas para poder voltar nelas depois.",
    updatedAt: "Seg, 15:42",
    dateLabel: "18 de abril de 2024",
    tags: ["livros"],
    color: "blue",
  },
  {
    id: 4,
    title: "Perguntas para a reunião",
    preview: "Qual é a menor versão desse projeto que ainda nos deixa aprender algo relevante?",
    body: "Qual é a menor versão desse projeto que ainda nos deixa aprender algo relevante?\n\nQuem precisa estar na decisão?\n\nO que pode dar errado e como saberemos cedo?",
    updatedAt: "12 de abr",
    dateLabel: "12 de abril de 2024",
    tags: ["trabalho"],
    color: "blue",
  },
];

const collections = [
  { label: "Todas as notas", icon: FileText },
  { label: "Favoritas", icon: Star },
  { label: "Arquivadas", icon: Archive },
];

function App() {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState(1);
  const [activeCollection, setActiveCollection] = useState("Todas as notas");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? notes[0];

  const visibleNotes = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase("pt-BR");

    return notes.filter((note) => {
      const matchesSearch =
        !normalizedQuery ||
        [note.title, note.preview, note.body, ...note.tags]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);
      const matchesCollection =
        activeCollection === "Todas as notas" ||
        (activeCollection === "Favoritas" && note.pinned);

      return matchesSearch && matchesCollection;
    });
  }, [activeCollection, notes, search]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNote();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  function createNote() {
    const newNote: Note = {
      id: Date.now(),
      title: "Nota sem título",
      preview: "Comece a escrever...",
      body: "",
      updatedAt: "Agora",
      dateLabel: "Hoje",
      tags: ["sem categoria"],
      color: "sand",
    };

    setNotes((current) => [newNote, ...current]);
    setSelectedId(newNote.id);
    setSearch("");
    setActiveCollection("Todas as notas");
    setSidebarOpen(false);
  }

  function updateNote(field: "title" | "body", value: string) {
    setNotes((current) =>
      current.map((note) => {
        if (note.id !== selectedNote.id) return note;
        const updated = { ...note, [field]: value, updatedAt: "Agora" };
        if (field === "body") {
          updated.preview = value.replace(/\n/g, " ").trim() || "Comece a escrever...";
        }
        return updated;
      }),
    );
  }

  function togglePin() {
    setNotes((current) =>
      current.map((note) =>
        note.id === selectedNote.id ? { ...note, pinned: !note.pinned } : note,
      ),
    );
  }

  function deleteNote() {
    if (notes.length === 1) return;
    const remainingNotes = notes.filter((note) => note.id !== selectedNote.id);
    setNotes(remainingNotes);
    setSelectedId(remainingNotes[0].id);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="brand-row">
          <Button variant="ghost" className="brand" onClick={() => setActiveCollection("Todas as notas")}>
            <span className="brand-mark">n</span>
            <span>notas</span>
          </Button>
          <Button variant="ghost" size="icon-sm" className="mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">
            <X />
          </Button>
        </div>

        <Button className="new-note-button" onClick={createNote}>
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
                setSidebarOpen(false);
              }}
            >
              <Icon data-icon="inline-start" />
              <span>{label}</span>
              {label === "Todas as notas" && <em>{notes.length}</em>}
            </Button>
          ))}
        </nav>

        <section className="tag-section">
          <p className="eyebrow">Etiquetas</p>
          {["pessoal", "trabalho", "livros", "escrita"].map((tag) => (
            <Button variant="ghost" className="tag-link" key={tag} onClick={() => setSearch(tag)}>
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

      {sidebarOpen && <Button variant="ghost" className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}

      <section className="note-list-panel">
        <header className="list-header">
          <div className="list-heading">
            <Button variant="ghost" size="icon" className="menu-trigger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
              <PanelLeft />
            </Button>
            <div>
              <p className="eyebrow">Seu espaço</p>
              <h1>{activeCollection}</h1>
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

        <ScrollArea className="notes-scroll-area">
          <p className="result-count">{visibleNotes.length} {visibleNotes.length === 1 ? "nota" : "notas"}</p>
          <div className="note-list">
            {visibleNotes.map((note) => (
              <Button
                variant="ghost"
                className={`note-card note-card--${note.color} ${selectedId === note.id ? "note-card--selected" : ""}`}
                key={note.id}
                onClick={() => setSelectedId(note.id)}
              >
                <div className="note-card-topline">
                  <span>{note.updatedAt}</span>
                  {note.pinned && <Pin fill="currentColor" />}
                </div>
                <strong>{note.title}</strong>
                <p>{note.preview}</p>
                <div className="note-tags">
                  {note.tags.map((tag) => <Badge variant="outline" key={tag}>{tag}</Badge>)}
                </div>
              </Button>
            ))}
            {visibleNotes.length === 0 && (
              <Empty className="empty-search">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Search /></EmptyMedia>
                  <EmptyTitle>Nada por aqui</EmptyTitle>
                  <EmptyDescription>Tente outra palavra ou crie uma nova nota.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </ScrollArea>
      </section>

      <article className="editor-panel" key={selectedNote.id}>
        <header className="editor-header">
          <div className="editor-status"><span className="save-dot" />Salvo agora</div>
          <div className="editor-actions">
            <Button
              variant="ghost"
              size="icon"
              className={selectedNote.pinned ? "icon-button--active" : ""}
              onClick={togglePin}
              aria-label={selectedNote.pinned ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Pin fill={selectedNote.pinned ? "currentColor" : "none"} />
            </Button>
            <Button variant="ghost" size="icon" className="danger-button" onClick={deleteNote} aria-label="Excluir nota">
              <Trash2 />
            </Button>
          </div>
        </header>

        <div className="paper">
          <div className="paper-metadata">
            <span>{selectedNote.dateLabel}</span>
            <span className="metadata-separator">·</span>
            <span><Clock3 /> atualizado {selectedNote.updatedAt.toLowerCase()}</span>
          </div>
          <Input
            className="note-title-input"
            value={selectedNote.title}
            onChange={(event) => updateNote("title", event.target.value)}
            aria-label="Título da nota"
          />
          <Textarea
            className="note-body-input"
            value={selectedNote.body}
            onChange={(event) => updateNote("body", event.target.value)}
            placeholder="Comece a escrever..."
            aria-label="Conteúdo da nota"
          />
          <Separator />
          <footer className="paper-footer">
            <div className="editor-tags">
              {selectedNote.tags.map((tag) => <Badge variant="secondary" key={tag}>#{tag}</Badge>)}
            </div>
            <span>{selectedNote.body.trim() ? `${selectedNote.body.trim().split(/\s+/).length} palavras` : "0 palavras"}</span>
          </footer>
        </div>
      </article>
    </main>
  );
}

export default App;
