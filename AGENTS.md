# Stack do projeto

- **Desktop:** Tauri 2
- **Backend:** Rust (edition 2021), com `serde` e `serde_json`
- **Frontend:** React 19 + TypeScript + Vite 7
- **Estilos e UI:** Tailwind CSS 4, shadcn/ui (base-nova), Base UI e Lucide React
- **Gerenciador de pacotes:** pnpm

# Frontend
Prefira usar sempre componentes base do shadcn.

Se não tiver o que voce precisa, pergunte ao usuario se pode instalar e liste quais pretende usar.


# Backend

Esse é um projeto de estudo, o usuario está tentando aprender Tauri e Rust, com auxilio de IA, por isso é importante considerar uma resposta e pedir confirmação ao usuário, caso envolva escrever backend, e impedir que o usuario escreva código sem entender o que está fazendo.

## SQLite e migrations

- As migrations SQLite ficam em `src-tauri/migrations/`, com um arquivo SQL por migration e nomes sequenciais, como `0001_create_notes_table.sql`.
- `src-tauri/src/lib.rs` registra cada migration usando `include_str!`; adicionar um arquivo à pasta não o executa automaticamente.
- Depois que uma migration for distribuída, ela é imutável: não altere, remova, renumere ou reformate seu SQL. O plugin valida o checksum do conteúdo SQL já aplicado.
- Os arquivos de migration usam finais de linha `LF`, garantidos por `.gitattributes`, pois as quebras de linha também entram no checksum.
- Para evoluir o schema, crie uma nova migration com o próximo número e registre-a no `lib.rs`.
