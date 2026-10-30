#!/usr/bin/env python3
"""Insere a interface de backup no GameApp.tsx do usuário sem sobrescrever o resto.
Uso: python aplicar_no_gameapp.py caminho/para/src/components/game/GameApp.tsx
Cria .bak ao lado antes de alterar, recusa se a âncora for diferente.
"""
from pathlib import Path
import sys

if len(sys.argv) != 2:
    print("Uso: python aplicar_no_gameapp.py caminho/para/GameApp.tsx")
    sys.exit(2)

path = Path(sys.argv[1])
if not path.is_file():
    print("Arquivo não encontrado:", path)
    sys.exit(2)
text = path.read_text(encoding="utf-8")
import_line = "import { CharacterBackup } from './CharacterBackup';"
button = "<Button onClick={()=>setWizardOpen(true)}><Plus/> Criar nova ficha</Button>"
added_button = "<CharacterBackup characters={data.characters} selected={character} onImport={data.addCharacter}/>\n      " + button

if text.count(import_line) == 1 and text.count(added_button) == 1:
    print("Integração já presente. Nenhuma alteração.")
    sys.exit(0)

if text.count(button) != 1 or "function GameApp" not in text:
    print("Ponto de integração não encontrado exatamente. Nenhum arquivo alterado.")
    sys.exit(1)
if text.count(import_line) == 0:
    anchor = "import { useGameData } from './useGameData';"
    if text.count(anchor) != 1:
        print("Ponto de import não encontrado. Nenhum arquivo alterado.")
        sys.exit(1)
    text = text.replace(anchor, anchor + "\n" + import_line)
elif text.count(import_line) != 1:
    print("Import de backup duplicado. Nenhum arquivo alterado.")
    sys.exit(1)

if text.count(added_button) == 0:
    text = text.replace(button, added_button)

backup = path.with_suffix(path.suffix + ".bak")
if backup.exists():
    print("Já existe arquivo de segurança:", backup, ". Faça backup dele antes de tentar novamente.")
    sys.exit(1)
backup.write_bytes(path.read_bytes())
path.write_text(text, encoding="utf-8")
print("Atualizado:", path, "\nCópia do original:", backup)
