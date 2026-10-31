#!/usr/bin/env python3
"""Integra Central de Notificações no GameApp.tsx sem remover outras melhorias.
Uso (no computador): python tools/aplicar_notificacoes_no_gameapp.py src/components/game/GameApp.tsx
Apenas muda o arquivo se todas as âncoras necessárias forem encontradas.
"""
from pathlib import Path
import sys

if len(sys.argv) != 2:
    sys.exit('Uso: python tools/aplicar_notificacoes_no_gameapp.py src/components/game/GameApp.tsx')
path = Path(sys.argv[1]); original = path.read_text(encoding='utf-8')

if 'NotificationsCenter' in original:
    if '<NotificationsCenter ' in original:
        print('Central já integrada; nenhuma alteração feita.')
        sys.exit(0)
    sys.exit('Integração incompleta detectada; nenhuma alteração feita.')

imports_anchor = "import { useGameData } from './useGameData';"
header_anchor = '<div className="topbar-actions">'
if original.count(imports_anchor) != 1 or original.count(header_anchor) != 1:
    sys.exit('GameApp com estrutura diferente. Nenhum arquivo alterado. Envie sua versão atual para mesclagem.')

component = '''<NotificationsCenter userId={data.userId} onLogin={()=>setAuthOpen(true)} onNavigate={(destination,notificationCampaignId)=>{if(notificationCampaignId&&data.campaigns.some(c=>c.id===notificationCampaignId))setCampaignId(notificationCampaignId);if(destination==='campanhas'||destination==='biblioteca'){go('mestre');setHubSection('campanhas');return;}if(destination==='mestre'){go('mestre');return;}go('mesa');}}/>'''
if 'setHubSection' not in original:
    sys.exit('Central de Campanhas não foi identificada no GameApp. Sem alterações; envie arquivo atual.')

result = original.replace(imports_anchor,
    imports_anchor+"\nimport { NotificationsCenter } from './NotificationsCenter';",1)
result = result.replace(header_anchor,header_anchor+component,1)

if result.count('<NotificationsCenter ') != 1 or result.count("from './NotificationsCenter'") != 1:
    sys.exit('Falha na validação do patch; nenhuma alteração feita.')
backup = path.with_name(path.name+'.antes_notificacoes.bak')
backup.write_text(original,encoding='utf-8')
path.write_text(result,encoding='utf-8')
print('Central de Notificações integrada com sucesso. Backup em', backup)
