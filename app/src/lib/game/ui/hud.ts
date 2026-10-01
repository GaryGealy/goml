import { HEAT_MAX, LAWN_MAX, WARY_HEAT } from '../core/constants';
import { CONTRAPTIONS } from '../core/contraptions';
import { available, type Game } from '../core/game';
import { INTRUDERS } from '../core/intruders';
import type { SlotPreview } from '../core/preview';
import type { ContraptionKind } from '../core/types';
import { CAMPAIGN_END_NOTE, WAVES } from '../core/waves';
import { CONTRAPTION_GLYPHS, OUTPUT_COLORS } from '../render/palette';
import type { Save } from './save';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const pct = (v: number, max: number) => `${Math.min(100, (v / max) * 100)}%`;

export function renderHud(g: Game): void {
  const wave = WAVES[Math.min(g.waveIndex, WAVES.length - 1)];
  $('wave').textContent = `Wave ${Math.min(g.waveIndex + 1, WAVES.length)}/${WAVES.length} — ${wave.name}`;
  $('score').textContent = `Score ${g.waveScore.total} / Par ${wave.par}`;
  $('lawn-intruders').style.width = pct(g.meters.lawnByIntruders, LAWN_MAX);
  $('lawn-self').style.width = pct(g.meters.lawnBySelf, LAWN_MAX);
  $('heat').style.width = pct(g.meters.heat, HEAT_MAX);
  $('wary-tick').style.left = pct(WARY_HEAT, HEAT_MAX);
  $('sign').textContent = wave.sign;
  $<HTMLButtonElement>('start').disabled = g.phase !== 'build';
}

export function renderPalette(g: Game, selected: ContraptionKind | null, onPick: (k: ContraptionKind) => void): void {
  const root = $('palette');
  root.replaceChildren(
    ...available(g).map((kind, i) => {
      const spec = CONTRAPTIONS[kind];
      const b = document.createElement('button');
      b.className = kind === selected ? 'selected' : '';
      b.innerHTML =
        `<span class="chip" style="background:${OUTPUT_COLORS[spec.output]}">${CONTRAPTION_GLYPHS[kind]}</span>` +
        `<span>${i + 1}. ${spec.name}</span><span class="type">${spec.output}</span>`;
      b.onclick = () => onPick(kind);
      return b;
    }),
  );
}

export function renderPreview(p: SlotPreview | null): void {
  const root = $('preview');
  if (!p || p.trace.stages.length === 0) {
    root.textContent = 'Hover a contraption to see where it sends people.';
    return;
  }
  const end = p.trace.outcome === 'deflected' ? 'off the property' : 'dumped on the lawn';
  const rows = p.perKind
    .map((k) => {
      const cls = k.score < 0 ? 'neg' : '';
      return `<div>${INTRUDERS[k.kind].name}: <b class="${cls}">${k.score >= 0 ? '+' : ''}${k.score}</b> score, +${k.heat} heat</div>`;
    })
    .join('');
  root.innerHTML = `<div><b>${p.trace.stages.length}-stage</b> chain, ends ${end}</div>${rows}`;
}

export function showOverlay(g: Game, save: Save, onNext: () => void): void {
  const body = $('overlay-body');
  const r = g.lastResult;
  if (g.phase === 'waveResult' && r) {
    body.innerHTML = `<h2>${r.cleared ? 'Wave cleared' : 'Below par'}</h2>
      <p>Score ${r.score.total} (chains ${r.score.chain}, mercy ${r.score.mercy}) against par ${r.par}.
      Longest chain: ${r.score.longestChain}. Heat cooled by ${Math.round(r.cooled)}.</p>
      ${r.cleared ? '' : '<p>The wave starts over. Your contraptions stay where they are.</p>'}`;
  } else if (g.phase === 'gameOver') {
    body.innerHTML = `<h2>The lawn is gone</h2><p>Reached wave ${g.waveIndex + 1}. Best campaign score: ${save.bestCampaignScore}.</p>`;
  } else if (g.phase === 'campaignEnd') {
    body.innerHTML = `<h2>Campaign complete</h2><p>Final score ${g.campaignScore}. Best: ${save.bestCampaignScore}.</p>
      <p class="sign">${CAMPAIGN_END_NOTE}</p>`;
  } else {
    return;
  }
  $('overlay').hidden = false;
  $('overlay-next').onclick = () => {
    $('overlay').hidden = true;
    onNext();
  };
}
