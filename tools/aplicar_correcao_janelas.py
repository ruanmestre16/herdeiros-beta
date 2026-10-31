#!/usr/bin/env python3
"""Integra a correção de modais cortados sem substituir GameApp.tsx.

Execute na raiz do repositório: python tools/aplicar_correcao_janelas.py
Os componentes devem estar em src/components/game/ e o pacote deve trazer
viewport-overlays.css. Não depende de pacotes Python externos.
"""
from pathlib import Path
import shutil, sys
ROOT = Path.cwd()
GAME = ROOT / 'src' / 'components' / 'game'
if not (GAME/'GlobalSearch.tsx').exists() or not (GAME/'NotificationsCenter.tsx').exists():
    sys.exit('Erro: execute na raiz do repositório, com Etapas 6 e 7 já instaladas.')
if not (GAME/'viewport-overlays.css').exists():
    sys.exit('Erro: adicione primeiro viewport-overlays.css à pasta src/components/game/')

def apply(name, fixes):
    path=GAME/name
    old=path.read_text(encoding='utf8')
    new=old
    for old_part, new_part in fixes:
        if new_part in new: continue
        if old_part not in new:
            sys.exit(f'Não localizei o trecho em {name}. Arquivo preservado; peça ajuda para mesclar.')
        new=new.replace(old_part,new_part,1)
    if new != old:
        shutil.copy2(path, str(path)+'.bak')
        path.write_text(new,encoding='utf8')
        print('Atualizado:',path.relative_to(ROOT))
    else:
        print('Já atualizado:',path.relative_to(ROOT))

apply('GlobalSearch.tsx', [
("import { useEffect, useMemo, useRef, useState } from 'react';", "import { useEffect, useMemo, useRef, useState } from 'react';\nimport { createPortal } from 'react-dom';"),
("import './global-search.css';", "import './global-search.css';\nimport './viewport-overlays.css';"),
('{open && <div className="hg-search-backdrop"', '{open && createPortal(<div className="hg-search-backdrop"'),
('      </section>\n    </div>}\n  </>;', '      </section>\n    </div>, document.body)}\n  </>;'),
])
apply('NotificationsCenter.tsx', [
("import { useCallback, useEffect, useId, useRef, useState } from 'react';", "import { useCallback, useEffect, useId, useRef, useState } from 'react';\nimport { createPortal } from 'react-dom';"),
("import './notifications-center.css';", "import './notifications-center.css';\nimport './viewport-overlays.css';"),
('    {opened && <>\n      <div className="hn-backdrop"', '    {opened && createPortal(<><div className="hn-backdrop"'),
('      </section>\n    </>}\n  </div>;', '      </section>\n    </>, document.body)}\n  </div>;'),
])
css_search = r"""
/* 2026-10-31: layout de pesquisa na janela inteira (portal para document.body). */
.hg-search-backdrop {
  box-sizing: border-box;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  padding: max(12px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))
           max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.hg-search-dialog {
  box-sizing: border-box;
  flex: 0 1 750px;
  min-width: 0;
  min-height: 0;
  max-width: calc(100vw - 20px);
  max-height: calc(100dvh - 24px);
}
.hg-search-bar, .hg-search-filters, .hg-search-footer {flex-shrink: 0;}
.hg-search-list {min-height: 0; flex: 1 1 auto;}
.hg-search-result-body, .hg-search-footer {min-width: 0;}
@media (max-width: 620px) {
  .hg-search-backdrop {
    align-items: stretch;
    padding: max(6px, env(safe-area-inset-top)) max(6px, env(safe-area-inset-right))
             max(6px, env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left));
  }
  .hg-search-dialog {
    width: 100%;
    max-width: none;
    max-height: none;
    height: 100%;
    flex: 1 1 auto;
    border-radius: 12px;
  }
  .hg-search-footer {padding: 9px 12px;}
}
@media (max-height: 520px) and (min-width: 621px) {
  .hg-search-backdrop {align-items: stretch;}
  .hg-search-dialog {max-height: none; height: 100%; margin: 0 auto;}
}
"""
css_notify=r"""
/* 2026-10-31: painel renderizado fora do header, sem cortes no viewport. */
.hn-backdrop {z-index: 12990;}
.hn-panel {
  box-sizing: border-box;
  z-index: 12991;
  min-height: 0;
  max-width: calc(100vw - 20px);
  max-height: calc(100dvh - 88px - env(safe-area-inset-bottom));
}
.hn-heading, .hn-toolbar, .hn-footer {flex-shrink: 0;}
.hn-list {min-height: 0; flex: 1 1 auto;}
@media (max-width: 760px) {
  .hn-panel {
    top: max(8px, env(safe-area-inset-top));
    right: max(8px, env(safe-area-inset-right));
    bottom: max(8px, env(safe-area-inset-bottom));
    left: max(8px, env(safe-area-inset-left));
    width: auto;
    max-width: none;
    max-height: none;
    height: auto;
    border-radius: 14px;
  }
}
@media (max-height: 500px) and (min-width: 761px) {
  .hn-panel {
    top: 8px;
    bottom: 8px;
    height: auto;
    max-height: none;
  }
}
"""
for name, block in [('global-search.css',css_search),('notifications-center.css',css_notify)]:
    path=GAME/name
    original=path.read_text(encoding='utf8')
    marker='/* 2026-10-31:'
    if marker not in original:
        shutil.copy2(path,str(path)+'.bak')
        path.write_text(original.rstrip()+'\n'+block,encoding='utf8')
        print('CSS atualizado:',path.relative_to(ROOT))
    else:
        print('CSS já atualizado:',path.relative_to(ROOT))
print('Concluído. Nenhuma migração SQL ou GameApp.tsx foi alterado.')
