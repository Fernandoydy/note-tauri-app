import Database from "@tauri-apps/plugin-sql";

export type NoteColor = "sand" | "peach" | "blue";

export type Note = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isArchived: boolean;
  deletedAt: string | null;
  tags: string[];
  color: NoteColor;
};

type NoteRow = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isPinned: number;
  isArchived: number;
  deletedAt: string | null;
};

type NoteTagRow = {
  noteId: number;
  name: string;
};

const databaseUrl = "sqlite:notes.db";
let databasePromise: Promise<Database> | undefined;

function getDatabase() {
  databasePromise ??= Database.load(databaseUrl);
  return databasePromise;
}

function colorForNote(id: number): NoteColor {
  return ["sand", "peach", "blue"][id % 3] as NoteColor;
}

function toNote(row: NoteRow, tags: string[]): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isPinned: Boolean(row.isPinned),
    isArchived: Boolean(row.isArchived),
    deletedAt: row.deletedAt,
    tags,
    color: colorForNote(row.id),
  };
}

export async function listNotes(): Promise<Note[]> {
  const database = await getDatabase();
  const [noteRows, tagRows] = await Promise.all([
    database.select<NoteRow[]>(`
      SELECT
        id,
        title,
        body,
        created_at AS createdAt,
        updated_at AS updatedAt,
        is_pinned AS isPinned,
        is_archived AS isArchived,
        deleted_at AS deletedAt
      FROM notes
      ORDER BY is_pinned DESC, updated_at DESC
    `),
    database.select<NoteTagRow[]>(`
      SELECT note_id AS noteId, name
      FROM note_tags
      INNER JOIN tags ON tags.id = note_tags.tag_id
      ORDER BY name COLLATE NOCASE
    `),
  ]);

  const tagsByNoteId = new Map<number, string[]>();
  for (const tag of tagRows) {
    const tags = tagsByNoteId.get(tag.noteId) ?? [];
    tags.push(tag.name);
    tagsByNoteId.set(tag.noteId, tags);
  }

  return noteRows.map((row) => toNote(row, tagsByNoteId.get(row.id) ?? []));
}

export async function createNote(): Promise<Note> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.execute(
    `INSERT INTO notes (title, body, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    ["Nota sem título", "", now, now],
  );

  const rows = await database.select<{ id: number }[]>(
    "SELECT last_insert_rowid() AS id",
  );
  const id = rows[0]?.id;

  if (id === undefined) {
    throw new Error("Não foi possível criar a nota.");
  }

  return {
    id,
    title: "Nota sem título",
    body: "",
    createdAt: now,
    updatedAt: now,
    isPinned: false,
    isArchived: false,
    deletedAt: null,
    tags: [],
    color: colorForNote(id),
  };
}

export async function saveNote(note: Note): Promise<void> {
  const database = await getDatabase();

  await database.execute(
    `UPDATE notes
     SET title = ?, body = ?, is_pinned = ?, is_archived = ?, updated_at = ?
     WHERE id = ?`,
    [
      note.title,
      note.body,
      Number(note.isPinned),
      Number(note.isArchived),
      note.updatedAt,
      note.id,
    ],
  );
}

export async function saveNoteTags(noteId: number, tags: string[]): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.execute("DELETE FROM note_tags WHERE note_id = ?", [noteId]);

  for (const tag of tags) {
    await database.execute(
      "INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, ?)",
      [tag, now],
    );
    await database.execute(
      `INSERT INTO note_tags (note_id, tag_id)
       SELECT ?, id FROM tags WHERE name = ? COLLATE NOCASE`,
      [noteId, tag],
    );
  }

  await database.execute(
    `DELETE FROM tags
     WHERE NOT EXISTS (
       SELECT 1 FROM note_tags WHERE note_tags.tag_id = tags.id
     )`,
  );
}

export async function moveNoteToTrash(id: number): Promise<string> {
  const deletedAt = new Date().toISOString();
  const database = await getDatabase();

  await database.execute(
    "UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?",
    [deletedAt, deletedAt, id],
  );

  return deletedAt;
}

export async function restoreNote(id: number): Promise<void> {
  const database = await getDatabase();
  const updatedAt = new Date().toISOString();

  await database.execute(
    "UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?",
    [updatedAt, id],
  );
}

export async function permanentlyDeleteNote(id: number): Promise<void> {
  const database = await getDatabase();

  await database.execute("DELETE FROM note_tags WHERE note_id = ?", [id]);
  await database.execute("DELETE FROM notes WHERE id = ?", [id]);
  await database.execute(
    `DELETE FROM tags
     WHERE NOT EXISTS (
       SELECT 1 FROM note_tags WHERE note_tags.tag_id = tags.id
     )`,
  );
}
