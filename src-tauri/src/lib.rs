use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_notes_table",
            sql: include_str!("../migrations/0001_create_notes_table.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_tags_table",
            sql: include_str!("../migrations/0002_create_tags_table.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_note_tags_table",
            sql: include_str!("../migrations/0003_create_note_tags_table.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "index_notes_by_last_update",
            sql: include_str!("../migrations/0004_index_notes_by_last_update.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "index_notes_by_trash_status",
            sql: include_str!("../migrations/0005_index_notes_by_trash_status.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:notes.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
