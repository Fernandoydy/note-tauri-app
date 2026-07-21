import Database from "@tauri-apps/plugin-sql";

export type NoteColor = "sand" | "peach" | "blue";

export type Note = {
  id: number;
  folderId: number | null;
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

export type Folder = {
  id: number;
  parentId: number | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type FolderTreeNode = Folder & {
  children: FolderTreeNode[];
};

export type FolderItems = {
  folders: Folder[];
  notes: Note[];
};

type NoteRow = {
  id: number;
  folderId: number | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isPinned: number;
  isArchived: number;
  deletedAt: string | null;
};

type FolderRow = {
  id: number;
  parentId: number | null;
  name: string;
  createdAt: string;
  updatedAt: string;
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
    folderId: row.folderId,
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

function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

function normalizeFolderName(name: string): string {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("O nome da pasta não pode ficar vazio.");
  }

  return normalizedName;
}

async function listTagsByNoteId(database: Database): Promise<Map<number, string[]>> {
  const tagRows = await database.select<NoteTagRow[]>(`
    SELECT note_id AS noteId, name
    FROM note_tags
    INNER JOIN tags ON tags.id = note_tags.tag_id
    ORDER BY name COLLATE NOCASE
  `);
  const tagsByNoteId = new Map<number, string[]>();

  for (const tag of tagRows) {
    const tags = tagsByNoteId.get(tag.noteId) ?? [];
    tags.push(tag.name);
    tagsByNoteId.set(tag.noteId, tags);
  }

  return tagsByNoteId;
}

async function listNotesFromQuery(
  database: Database,
  query: string,
  values: unknown[] = [],
): Promise<Note[]> {
  const [noteRows, tagsByNoteId] = await Promise.all([
    database.select<NoteRow[]>(query, values),
    listTagsByNoteId(database),
  ]);

  return noteRows.map((row) => toNote(row, tagsByNoteId.get(row.id) ?? []));
}

async function getFolderRow(database: Database, id: number): Promise<FolderRow | undefined> {
  const rows = await database.select<FolderRow[]>(
    `SELECT
       id,
       parent_id AS parentId,
       name,
       created_at AS createdAt,
       updated_at AS updatedAt,
       deleted_at AS deletedAt
     FROM folders
     WHERE id = ?`,
    [id],
  );

  return rows[0];
}

async function assertActiveFolderOrRoot(
  database: Database,
  parentId: number | null,
): Promise<void> {
  if (parentId === null) {
    return;
  }

  const folder = await getFolderRow(database, parentId);
  if (!folder) {
    throw new Error("A pasta de destino não existe.");
  }
  if (folder.deletedAt !== null) {
    throw new Error("Não é possível usar uma pasta que está na lixeira.");
  }
}

async function assertFolderNameAvailable(
  database: Database,
  name: string,
  parentId: number | null,
  excludedFolderId?: number,
): Promise<void> {
  const rows = await database.select<{ id: number }[]>(
    `SELECT id
     FROM folders
     WHERE parent_id IS ?
       AND name = ? COLLATE NOCASE
       AND deleted_at IS NULL
       AND (? IS NULL OR id != ?)
     LIMIT 1`,
    [parentId, name, excludedFolderId ?? null, excludedFolderId ?? null],
  );

  if (rows.length > 0) {
    throw new Error("Já existe uma pasta com este nome neste local.");
  }
}

async function assertFolderCanBeMoved(
  database: Database,
  folderId: number,
  parentId: number | null,
): Promise<FolderRow> {
  const folder = await getFolderRow(database, folderId);
  if (!folder) {
    throw new Error("A pasta não existe.");
  }
  if (folder.deletedAt !== null) {
    throw new Error("Não é possível mover uma pasta que está na lixeira.");
  }

  await assertActiveFolderOrRoot(database, parentId);

  if (parentId === folderId) {
    throw new Error("Uma pasta não pode ser movida para ela mesma.");
  }

  if (parentId !== null) {
    const rows = await database.select<{ id: number }[]>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT id FROM folders WHERE id = ?
         UNION
         SELECT folders.id
         FROM folders
         INNER JOIN descendants ON folders.parent_id = descendants.id
       )
       SELECT id FROM descendants WHERE id = ? LIMIT 1`,
      [folderId, parentId],
    );

    if (rows.length > 0) {
      throw new Error("Não é possível mover uma pasta para dentro dela mesma.");
    }
  }

  return folder;
}

export async function listNotes(): Promise<Note[]> {
  const database = await getDatabase();

  return listNotesFromQuery(
    database,
    `SELECT
       id,
       folder_id AS folderId,
       title,
       body,
       created_at AS createdAt,
       updated_at AS updatedAt,
       is_pinned AS isPinned,
       is_archived AS isArchived,
       deleted_at AS deletedAt
     FROM notes
     ORDER BY is_pinned DESC, updated_at DESC`,
  );
}

export async function createNote(folderId: number | null = null): Promise<Note> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  await assertActiveFolderOrRoot(database, folderId);
  await database.execute(
    `INSERT INTO notes (folder_id, title, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [folderId, "Nota sem título", "", now, now],
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
    folderId,
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

export async function listFolders(includeDeleted = false): Promise<Folder[]> {
  const database = await getDatabase();
  const rows = await database.select<FolderRow[]>(
    `SELECT
       id,
       parent_id AS parentId,
       name,
       created_at AS createdAt,
       updated_at AS updatedAt,
       deleted_at AS deletedAt
     FROM folders
     WHERE (? = 1 OR deleted_at IS NULL)
     ORDER BY name COLLATE NOCASE`,
    [Number(includeDeleted)],
  );

  return rows.map(toFolder);
}

export async function listFolderTree(includeDeleted = false): Promise<FolderTreeNode[]> {
  const folders = await listFolders(includeDeleted);
  const nodesById = new Map<number, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    nodesById.set(folder.id, { ...folder, children: [] });
  }

  for (const folder of folders) {
    const node = nodesById.get(folder.id)!;
    const parent = folder.parentId === null ? undefined : nodesById.get(folder.parentId);

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function listFolderItems(
  parentId: number | null,
  includeDeleted = false,
): Promise<FolderItems> {
  const database = await getDatabase();
  const [folderRows, notes] = await Promise.all([
    database.select<FolderRow[]>(
      `SELECT
         id,
         parent_id AS parentId,
         name,
         created_at AS createdAt,
         updated_at AS updatedAt,
         deleted_at AS deletedAt
       FROM folders
       WHERE parent_id IS ?
         AND (? = 1 OR deleted_at IS NULL)
       ORDER BY name COLLATE NOCASE`,
      [parentId, Number(includeDeleted)],
    ),
    listNotesFromQuery(
      database,
      `SELECT
         id,
         folder_id AS folderId,
         title,
         body,
         created_at AS createdAt,
         updated_at AS updatedAt,
         is_pinned AS isPinned,
         is_archived AS isArchived,
         deleted_at AS deletedAt
       FROM notes
       WHERE folder_id IS ?
         AND (? = 1 OR deleted_at IS NULL)
       ORDER BY is_pinned DESC, updated_at DESC`,
      [parentId, Number(includeDeleted)],
    ),
  ]);

  return { folders: folderRows.map(toFolder), notes };
}

export async function createFolder(
  name: string,
  parentId: number | null = null,
): Promise<Folder> {
  const database = await getDatabase();
  const normalizedName = normalizeFolderName(name);
  const now = new Date().toISOString();

  await assertActiveFolderOrRoot(database, parentId);
  await assertFolderNameAvailable(database, normalizedName, parentId);
  const result = await database.execute(
    `INSERT INTO folders (parent_id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [parentId, normalizedName, now, now],
  );

  return {
    id: Number(result.lastInsertId),
    parentId,
    name: normalizedName,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export async function renameFolder(id: number, name: string): Promise<void> {
  const database = await getDatabase();
  const normalizedName = normalizeFolderName(name);
  const folder = await getFolderRow(database, id);

  if (!folder) {
    throw new Error("A pasta não existe.");
  }
  if (folder.deletedAt !== null) {
    throw new Error("Não é possível renomear uma pasta que está na lixeira.");
  }

  await assertFolderNameAvailable(database, normalizedName, folder.parentId, id);
  await database.execute(
    "UPDATE folders SET name = ?, updated_at = ? WHERE id = ?",
    [normalizedName, new Date().toISOString(), id],
  );
}

export async function moveFolder(
  id: number,
  parentId: number | null,
): Promise<void> {
  const database = await getDatabase();
  const folder = await assertFolderCanBeMoved(database, id, parentId);

  if (folder.parentId === parentId) {
    return;
  }

  await assertFolderNameAvailable(database, folder.name, parentId, id);
  await database.execute(
    "UPDATE folders SET parent_id = ?, updated_at = ? WHERE id = ?",
    [parentId, new Date().toISOString(), id],
  );
}

export async function moveNotesToFolder(
  noteIds: number[],
  folderId: number | null,
): Promise<void> {
  if (noteIds.length === 0) {
    return;
  }

  const database = await getDatabase();
  const uniqueNoteIds = [...new Set(noteIds)];
  const placeholders = uniqueNoteIds.map(() => "?").join(", ");

  await assertActiveFolderOrRoot(database, folderId);
  await database.execute(
    `UPDATE notes
     SET folder_id = ?, updated_at = ?
     WHERE id IN (${placeholders})
       AND deleted_at IS NULL`,
    [folderId, new Date().toISOString(), ...uniqueNoteIds],
  );
}

export async function moveFolderToTrash(id: number): Promise<string> {
  const database = await getDatabase();
  const folder = await getFolderRow(database, id);
  const deletedAt = new Date().toISOString();

  if (!folder) {
    throw new Error("A pasta não existe.");
  }
  if (folder.deletedAt !== null) {
    throw new Error("A pasta já está na lixeira.");
  }

  await database.execute(
    `WITH RECURSIVE folder_tree(id) AS (
       SELECT id FROM folders WHERE id = ?
       UNION
       SELECT folders.id
       FROM folders
       INNER JOIN folder_tree ON folders.parent_id = folder_tree.id
     )
     UPDATE folders
     SET deleted_at = ?, updated_at = ?
     WHERE id IN (SELECT id FROM folder_tree)`,
    [id, deletedAt, deletedAt],
  );
  await database.execute(
    `WITH RECURSIVE folder_tree(id) AS (
       SELECT id FROM folders WHERE id = ?
       UNION
       SELECT folders.id
       FROM folders
       INNER JOIN folder_tree ON folders.parent_id = folder_tree.id
     )
     UPDATE notes
     SET deleted_at = ?, updated_at = ?
     WHERE folder_id IN (SELECT id FROM folder_tree)`,
    [id, deletedAt, deletedAt],
  );

  return deletedAt;
}

export async function restoreFolder(id: number): Promise<void> {
  const database = await getDatabase();
  const folder = await getFolderRow(database, id);
  const restoredAt = new Date().toISOString();

  if (!folder) {
    throw new Error("A pasta não existe.");
  }
  if (folder.deletedAt === null) {
    throw new Error("A pasta não está na lixeira.");
  }

  await assertActiveFolderOrRoot(database, folder.parentId);
  await assertFolderNameAvailable(database, folder.name, folder.parentId, id);
  await database.execute(
    `WITH RECURSIVE folder_tree(id) AS (
       SELECT id FROM folders WHERE id = ?
       UNION
       SELECT folders.id
       FROM folders
       INNER JOIN folder_tree ON folders.parent_id = folder_tree.id
     )
     UPDATE folders
     SET deleted_at = NULL, updated_at = ?
     WHERE id IN (SELECT id FROM folder_tree)`,
    [id, restoredAt],
  );
  await database.execute(
    `WITH RECURSIVE folder_tree(id) AS (
       SELECT id FROM folders WHERE id = ?
       UNION
       SELECT folders.id
       FROM folders
       INNER JOIN folder_tree ON folders.parent_id = folder_tree.id
     )
     UPDATE notes
     SET deleted_at = NULL, updated_at = ?
     WHERE folder_id IN (SELECT id FROM folder_tree)`,
    [id, restoredAt],
  );
}
