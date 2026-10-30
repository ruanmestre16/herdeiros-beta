import { useEffect, useState } from 'react';
import { BookOpen, Compass } from 'lucide-react';
import { StoryBookPage } from './StoryBookPage';
import { AtlasPage, type AtlasRegionId } from './AtlasPage';
import './atlas-page.css';

type View = 'livro' | 'atlas';
const regions = new Set<AtlasRegionId>(['floresta','caixa','deserto','grande-fim']);
function readSelection(): {view: View; region: AtlasRegionId|null} {
  if (typeof window === 'undefined') return { view:'livro', region:null };
  const params = new URLSearchParams(window.location.search);
  const view:View = params.get('visao') === 'atlas' ? 'atlas' : 'livro';
  const candidate = params.get('regiao') as AtlasRegionId|null;
  return { view, region:view==='atlas' && candidate && regions.has(candidate) ? candidate : null };
}

export function HistoryAtlasPage({onHome}:{onHome:()=>void}) {
  const [view,setView] = useState<View>(()=>readSelection().view);
  const [region,setRegion] = useState<AtlasRegionId|null>(()=>readSelection().region);

  useEffect(()=>{
    const onPopState=()=>{const selection=readSelection();setView(selection.view);setRegion(selection.region);};
    window.addEventListener('popstate',onPopState);
    return ()=>window.removeEventListener('popstate',onPopState);
  },[]);

  // O leitor continua montado para preservar capítulo e modo de leitura.
  // Enquanto o Atlas está aberto, não permitir que as teclas de direção
  // acionem a navegação global do pergaminho que ficou oculto.
  useEffect(()=>{
    if(view!=='atlas')return;
    const preventHiddenBookNavigation=(event:KeyboardEvent)=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        const target=event.target;
        if(target instanceof HTMLElement && ['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown',preventHiddenBookNavigation,true);
    return ()=>window.removeEventListener('keydown',preventHiddenBookNavigation,true);
  },[view]);

  function update(nextView:View,nextRegion:AtlasRegionId|null) {
    setView(nextView);setRegion(nextView==='atlas'?nextRegion:null);
    const url=new URL(window.location.href);
    url.searchParams.set('area','historia');
    if(nextView==='atlas')url.searchParams.set('visao','atlas');else url.searchParams.delete('visao');
    if(nextView==='atlas'&&nextRegion)url.searchParams.set('regiao',nextRegion);else url.searchParams.delete('regiao');
    window.history.pushState({},'',url.pathname+url.search+url.hash);
    window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  return <div className="ha-history-root">
    <nav className="ha-primary-switch" aria-label="Seções da História de Arcádia">
      <span className="ha-primary-caption">EXPLORE ARCÁDIA</span>
      <div className="ha-primary-buttons" role="group" aria-label="Livro de História ou Atlas">
        <button type="button" className={view==='livro'?'active':''} aria-current={view==='livro'?'page':undefined} onClick={()=>update('livro',null)}><BookOpen size={18}/> Livro de História</button>
        <button type="button" className={view==='atlas'?'active':''} aria-current={view==='atlas'?'page':undefined} onClick={()=>update('atlas',null)}><Compass size={18}/> Atlas de Arcádia</button>
      </div>
    </nav>
    <div className="ha-book-viewport" hidden={view!=='livro'} aria-hidden={view!=='livro'}><StoryBookPage onHome={onHome}/></div>
    {view==='atlas' && <AtlasPage regionId={region} onSelectRegion={next=>update('atlas',next)}/>}
  </div>;
}
