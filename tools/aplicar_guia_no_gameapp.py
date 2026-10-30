#!/usr/bin/env python3
"""Acrescenta Guia de Iniciantes em GameApp.tsx mantendo as outras funcionalidades.
Uso: python tools/aplicar_guia_no_gameapp.py src/components/game/GameApp.tsx
Só escreve após validar TODAS as âncoras. Faz cópia .bak antes de editar.
"""
from pathlib import Path
import re
import sys

if len(sys.argv) != 2:
    print('Uso: python tools/aplicar_guia_no_gameapp.py src/components/game/GameApp.tsx')
    sys.exit(2)
file = Path(sys.argv[1])
if not file.is_file():
    print('Arquivo não encontrado:', file)
    sys.exit(2)
original = file.read_text(encoding='utf-8')
if 'BeginnerGuide' in original:
    if "area==='guia'" in original and "hg-guide-trigger" in original:
        print('Guia já integrado. Não foram feitas alterações.')
        sys.exit(0)
    print('Integração parcial do Guia detectada. Nenhuma alteração feita.')
    sys.exit(1)

text = original

def change_exact(anchor: str, replacement: str, name: str):
    global text
    if text.count(anchor) != 1:
        raise ValueError(f'Âncora incompatível ({name}); esperado 1, encontrado {text.count(anchor)}.')
    text = text.replace(anchor, replacement, 1)

try:
    import_anchor = "import { useGameData } from './useGameData';"
    change_exact(import_anchor, import_anchor + "\nimport { BeginnerGuide, type GuideDestination, type GuideAction } from './BeginnerGuide';", 'import')
    match = re.search(r'(?m)^type Area = ([^;\n]+);', text)
    if not match or "'inicio'" not in match.group(1):
        raise ValueError('Não foi possível identificar o tipo Area.')
    text = text[:match.start()] + "type Area = " + match.group(1) + "|'guia';" + text[match.end():]
    change_exact("next==='jogador'||next==='historia'", "next==='jogador'||next==='historia'||next==='guia'", 'rota de navegação')
    change_exact("if(view==='jogador'||view==='historia'||view==='inicio')", "if(view==='jogador'||view==='historia'||view==='inicio'||view==='guia')", 'recarregar URL')
    header_anchor = '<div className="topbar-actions">'
    header_button = '''<Button type="button" variant="outline" size="sm" className="hg-guide-trigger" aria-current={area==='guia'?'page':undefined} aria-label="Abrir Guia de Iniciantes" title="Guia de Iniciantes" onClick={()=>go('guia')}><BookOpen size={16}/><span className="hg-guide-trigger-label">Guia</span></Button>'''
    change_exact(header_anchor, header_anchor + header_button, 'botão no topo')
    main_anchor = '<main className="main-wrap">'
    page = '''\n   {area==='guia'&&<BeginnerGuide userId={data.userId} hasCharacter={data.characters.length>0} hasCampaign={data.campaigns.length>0} onLogin={()=>setAuthOpen(true)} onNavigate={(destination:GuideDestination,action?:GuideAction)=>{go(destination);if(action==='create'){setWizardLineage('Humano');setWizardOpen(true);}if(action==='npcs')setMasterTab('NPCs e inimigos');if(action==='combate')setMasterTab('Combate');if(action==='exploracao')setMasterTab('Exploração');if(action==='campanhas')setHubSection('campanhas');}}/>}\n'''
    change_exact(main_anchor, main_anchor + page, 'página do Guia')
    if 'CharacterBackup' in original and 'CharacterBackup' not in text:
        raise ValueError('Proteção de backup: componente existente foi removido.')
    if 'CampaignCenter' in original and 'CampaignCenter' not in text:
        raise ValueError('Proteção de campanhas: componente existente foi removido.')
    if 'BeginnerGuide' not in text or "area==='guia'" not in text:
        raise ValueError('Validação final falhou.')
except ValueError as exc:
    print('ERRO:', exc, '\nNenhum arquivo foi alterado.')
    sys.exit(1)

backup = file.with_suffix(file.suffix + '.bak')
if backup.exists():
    print('Já existe um backup:', backup, '\nMova-o para um lugar seguro antes de prosseguir. Nenhum arquivo alterado.')
    sys.exit(1)
backup.write_bytes(file.read_bytes())
file.write_text(text, encoding='utf-8')
print('Integração aplicada:', file)
print('Backup do GameApp original:', backup)
