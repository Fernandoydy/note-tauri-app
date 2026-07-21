CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_notes_folder_id ON notes(folder_id);
CREATE UNIQUE INDEX idx_folders_unique_root_name
  ON folders(name COLLATE NOCASE)
  WHERE parent_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_folders_unique_child_name
  ON folders(parent_id, name COLLATE NOCASE)
  WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
