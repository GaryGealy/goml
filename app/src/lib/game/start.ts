import { SIM_DT } from './core/constants';
import { INTRUDERS } from './core/intruders';
import {
	available,
	continueAfterResult,
	newGame,
	placeContraption,
	removeContraption,
	rotateContraption,
	startWave,
	tick,
	type Game
} from './core/game';
import { slotAt } from './core/lawn';
import { previewSlot } from './core/preview';
import { armedness, chainScore, mercyScore } from './core/scoring';
import type { ContraptionKind, SimEvent } from './core/types';
import { drawFrame, type View } from './render/draw';
import { fitLayout, pixelToCell, type Layout } from './render/layout';
import { PayoffCamera } from './render/payoffCamera';
import { renderHud, renderPalette, renderPreview, showOverlay } from './ui/hud';
import { loadSave, recordRun, writeSave } from './ui/save';

/**
 * Mount the game onto the elements rendered by the /play page (ids: board, start, palette, ...).
 * Returns a cleanup that stops the loop and removes every listener, for SPA navigation.
 */
export function startGame(): () => void {
	const cleanups: Array<() => void> = [];
	function on<K extends keyof HTMLElementEventMap>(
		target: HTMLElement | Window,
		type: K,
		handler: (e: HTMLElementEventMap[K]) => void
	): void {
		target.addEventListener(type, handler as EventListener);
		cleanups.push(() => target.removeEventListener(type, handler as EventListener));
	}

	const canvas = document.getElementById('board') as HTMLCanvasElement;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	const storage = (() => {
		try {
			return window.localStorage;
		} catch {
			return undefined;
		}
	})();

	let game: Game = newGame();
	let save = loadSave(storage);
	let selected: ContraptionKind | null = available(game)[0];
	let layout: Layout = fitLayout(1, 1, 1, 1);
	let overlayShown = false;
	const camera = new PayoffCamera();
	const view: View = { hoverSlot: -1, trace: null, floaters: [] };

	function resize(): void {
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = Math.round(rect.width * dpr);
		canvas.height = Math.round(rect.height * dpr);
		layout = fitLayout(canvas.width, canvas.height, game.sim.lawn.width, game.sim.lawn.height);
	}

	function slotUnderPointer(e: MouseEvent): number {
		const rect = canvas.getBoundingClientRect();
		const dpr = canvas.width / rect.width;
		const cell = pixelToCell(
			layout,
			(e.clientX - rect.left) * dpr,
			(e.clientY - rect.top) * dpr,
			game.sim.lawn.width,
			game.sim.lawn.height
		);
		return cell ? slotAt(game.sim.lawn, cell) : -1;
	}

	function refreshPanel(): void {
		renderPalette(game, selected, (k) => {
			selected = k;
			refreshPanel();
		});
		refreshPreview();
	}

	function refreshPreview(): void {
		const p =
			view.hoverSlot >= 0 && game.sim.placed[view.hoverSlot]
				? previewSlot(game, view.hoverSlot)
				: null;
		view.trace = p?.trace ?? null;
		renderPreview(p);
	}

	on(canvas, 'mousemove', (e) => {
		const slot = slotUnderPointer(e);
		if (slot !== view.hoverSlot) {
			view.hoverSlot = slot;
			refreshPreview();
		}
	});
	on(canvas, 'mouseleave', () => {
		view.hoverSlot = -1;
		refreshPreview();
	});
	on(canvas, 'click', (e) => {
		const slot = slotUnderPointer(e);
		if (slot < 0) return;
		if (game.sim.placed[slot]) rotateContraption(game, slot);
		else if (selected) placeContraption(game, slot, selected);
		refreshPreview();
	});
	on(canvas, 'contextmenu', (e) => {
		e.preventDefault();
		if (removeContraption(game, slotUnderPointer(e))) refreshPreview();
	});
	on(window, 'keydown', (e) => {
		// Typing into a form field (the tuning panel) is not a game command.
		if ((e.target as HTMLElement | null)?.closest?.('input, select, textarea')) return;
		const n = Number(e.key);
		const kinds = available(game);
		if (n >= 1 && n <= kinds.length) {
			selected = kinds[n - 1];
			refreshPanel();
		} else if (e.key === 'r' || e.key === 'R') {
			if (view.hoverSlot >= 0 && rotateContraption(game, view.hoverSlot)) refreshPreview();
		} else if (e.key === ' ') {
			e.preventDefault();
			if (overlayShown) (document.getElementById('overlay-next') as HTMLButtonElement).click();
			else startWave(game);
		}
	});
	on(document.getElementById('start')!, 'click', () => startWave(game));
	on(window, 'resize', resize);

	/** Turn scoring events into floating text where they happened. */
	function floatersFor(events: SimEvent[], now: number): void {
		const armed = armedness(game.sim.placed.filter(Boolean).length);
		for (const e of events) {
			if (e.type === 'stageStarted') camera.onStage(e.chainLength, now);
			if (e.type !== 'chainCompleted' && e.type !== 'deflected') continue;
			const it = game.sim.intruders.find((i) => i.id === e.intruderId);
			if (!it) continue;
			const s = INTRUDERS[e.kind].sympathy;
			const pts = e.type === 'chainCompleted' ? chainScore(e.length, s) : mercyScore(s, armed);
			const label =
				e.type === 'chainCompleted'
					? `${e.length}× chain ${pts >= 0 ? '+' : ''}${pts}`
					: `deflected +${pts}`;
			view.floaters.push({
				text: label,
				cell: { ...it.cell },
				born: now,
				color: pts >= 0 ? '#ffe678' : '#ff9aa2'
			});
		}
	}

	function onPhaseChange(): void {
		if (game.phase === 'waveResult' || game.phase === 'gameOver' || game.phase === 'campaignEnd') {
			if (game.phase !== 'waveResult') {
				save = recordRun(save, game.campaignScore, game.waveIndex + 1);
				writeSave(storage, save);
			}
			overlayShown = true;
			showOverlay(game, save, () => {
				overlayShown = false;
				if (game.phase === 'waveResult') continueAfterResult(game);
				else game = newGame();
				if (game.phase === 'campaignEnd') onPhaseChange();
				if (!available(game).includes(selected as ContraptionKind)) selected = available(game)[0];
				refreshPanel();
			});
		}
	}

	let last = performance.now() / 1000;
	let accumulator = 0;
	function frame(): void {
		const now = performance.now() / 1000;
		const realDt = Math.min(0.25, now - last);
		last = now;
		if (game.phase === 'wave') {
			accumulator += realDt * camera.timeScale(now);
			while (accumulator >= SIM_DT && game.phase === 'wave') {
				floatersFor(tick(game, SIM_DT), now);
				accumulator -= SIM_DT;
			}
			if (game.phase !== 'wave') {
				accumulator = 0;
				onPhaseChange();
			}
		}
		renderHud(game);
		drawFrame(ctx, game, layout, view, now);
		rafId = requestAnimationFrame(frame);
	}

	resize();
	refreshPanel();
	let rafId = requestAnimationFrame(frame);

	return () => {
		cancelAnimationFrame(rafId);
		for (const off of cleanups) off();
	};
}
