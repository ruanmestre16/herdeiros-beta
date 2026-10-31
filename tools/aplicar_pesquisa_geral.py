#!/usr/bin/env python3
"""Mescla Pesquisa Geral com arquivos React existentes sem substituí-los por versões antigas.
Uso: python tools/aplicar_pesquisa_geral.py .
Execute NA RAIZ da cópia local do GitHub, depois envie os arquivos alterados.
"""
from __future__ import annotations
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
SOURCE = Path(__file__).resolve().parents[1] / 'src' / 'components' / 'game'
DEST = ROOT / 'src' / 'components' / 'game'


def insert_at(text: str, anchor: str, addition: str, marker: str) -> str:
    if marker in text:
        return text
    if text.count(anchor) != 1:
        raise ValueError(f'Âncora não encontrada ou duplicada: {anchor[:72]!r}')
    return text.replace(anchor, anchor + addition, 1)


def segment(name: str, before: str, until: str) -> str:
    ref = (SOURCE / name).read_text(encoding='utf-8')
    if ref.count(before) != 1 or ref.count(until) < 1:
        raise ValueError(f'Pacote de referência inválido para {name}.')
    return ref.split(before, 1)[1].split(until, 1)[0]


def patch_game(text: str) -> str:
    imp = "import { GlobalSearch, type GlobalSearchResult } from './GlobalSearch';"
    if imp not in text:
        text = insert_at(text, "import { useEffect, useState } from 'react';", '\n' + imp, imp)
    renderer = '<GlobalSearch userId={data.userId} characters={data.characters} partyCharacters={data.partyCharacters} npcs={data.npcs} campaigns={data.campaigns} memberships={data.memberships} onOpen={openSearchResult}/>'
    if renderer not in text:
        text = insert_at(text, '<div className="topbar-actions">', renderer, renderer)
    method = segment('GameApp.tsx', ' function openSearchResult(result:GlobalSearchResult)', ' function go(next:Area)')
    signature = ' function openSearchResult(result:GlobalSearchResult)'
    if signature not in text:
        if text.count(' function go(next:Area)') != 1:
            raise ValueError('Não encontrei function go(next:Area) na versão atual do GameApp.')
        text = text.replace(' function go(next:Area)', signature + method + ' function go(next:Area)', 1)
    return text


def patch_rule(text: str) -> str:
    if 'herdeiros:global-search-focus' in text:
        return text
    if "import { useMemo, useState } from 'react';" in text:
        text = text.replace("import { useMemo, useState } from 'react';", "import { useEffect, useMemo, useState } from 'react';", 1)
    addition = segment('RulebookPage.tsx', " const [showExamples, setShowExamples] = useState(true);", ' const filtered =')
    return insert_at(text, " const [showExamples, setShowExamples] = useState(true);", addition, 'herdeiros:global-search-focus')


def patch_best(text: str) -> str:
    if 'herdeiros:global-search-focus' in text:
        return text
    addition = segment('BestiaryPage.tsx', '  const [page, setPage] = useState(1);', '  const filtered =')
    return insert_at(text, '  const [page, setPage] = useState(1);', addition, 'herdeiros:global-search-focus')


def patch_center(text: str) -> str:
    if 'herdeiros:global-search-focus' in text:
        return text
    anchor = "  const openObjectives = useMemo(() => objectives.filter(o => o.status === 'aberto').length, [objectives]);"
    addition = segment('CampaignCenter.tsx', anchor, '  const load =')
    return insert_at(text, anchor, addition, 'herdeiros:global-search-focus')


def patch_library(text: str) -> str:
    if 'herdeiros:global-search-focus' in text:
        return text
    anchor = "  const selected = items.find(item => item.campaign_id === campaignId && (isMaster || item.visibility === 'mesa') && item.id === selectedId) ?? null;"
    addition = segment('CampaignLibrary.tsx', anchor, '  const load =')
    return insert_at(text, anchor, addition, 'herdeiros:global-search-focus')


def main() -> int:
    if not (DEST / 'GameApp.tsx').is_file():
        print('ERRO: execute com o caminho da raiz do projeto (onde existe src/components/game/GameApp.tsx).')
        return 2
    changed: list[tuple[Path, str]] = []
    for name, func, optional in (
        ('GameApp.tsx', patch_game, False),
        ('RulebookPage.tsx', patch_rule, True),
        ('BestiaryPage.tsx', patch_best, True),
        ('CampaignCenter.tsx', patch_center, True),
        ('CampaignLibrary.tsx', patch_library, True),
    ):
        target = DEST / name
        if not target.exists():
            if not optional:
                print(f'ERRO: falta {target}')
                return 2
            print(f'Aviso: {name} não encontrado. Pulei o foco automático nessa seção.')
            continue
        original = target.read_text(encoding='utf-8')
        try:
            result = func(original)
        except ValueError as e:
            print(f'ERRO em {name}: {e}. Nenhum arquivo foi alterado.')
            return 2
        if result != original:
            changed.append((target, result))
    for target, result in changed:
        backup = target.with_name(target.name + '.antes_pesquisa.bak')
        if not backup.exists():
            backup.write_text(target.read_text(encoding='utf-8'), encoding='utf-8')
        target.write_text(result, encoding='utf-8')
        print('Integrado:', target.relative_to(ROOT))
    if not changed:
        print('Pesquisa já integrada — nenhuma alteração necessária.')
    print('Lembre-se: também envie GlobalSearch.tsx, global-search.css e herdeiros-search-rules.ts.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
