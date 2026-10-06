<script lang="ts">
	import { onMount } from 'svelte';
	import { startGame } from '$lib/game/start';
	import { loadTuning } from '$lib/game/tuning';
	import TuningPanel from '$lib/game/TuningPanel.svelte';
	import '$lib/game/game.css';

	// Storage can be missing or throw (private windows, blocked site data).
	const storage = (() => {
		try {
			return window.localStorage;
		} catch {
			return undefined;
		}
	})();
	// Apply saved tuning before the game or the panel reads any values.
	loadTuning(storage);

	onMount(() => startGame());
</script>

<svelte:head>
	<title>Get Off My Lawn</title>
</svelte:head>

<div class="gomy">
	<header class="hud">
		<h1>Get Off My Lawn</h1>
		<div id="wave" class="stat"></div>
		<div id="score" class="stat"></div>
		<div class="meter" title="Lawn damage: dark = intruders, red = you">
			<span class="label">Lawn</span>
			<div class="bar">
				<div id="lawn-intruders" class="fill intruders"></div>
				<div id="lawn-self" class="fill self"></div>
			</div>
		</div>
		<div class="meter" title="Heat: past the tick, intruders steer around your contraptions">
			<span class="label">Heat</span>
			<div class="bar">
				<div id="heat" class="fill heat"></div>
				<div id="wary-tick" class="tick"></div>
			</div>
		</div>
	</header>
	<main>
		<canvas id="board"></canvas>
		<aside class="panel">
			<p id="sign" class="sign"></p>
			<div id="palette" class="palette"></div>
			<button id="start" class="primary">Start wave (Space)</button>
			<div id="preview" class="preview"></div>
			<p class="help">
				Click a slot to place the selected contraption. Click a contraption to rotate it (also
				during a wave). Right-click removes (build only). Hover to preview the chain. Keys: 1–5
				select, R rotates.
			</p>
			<p class="help">
				Before a wave, dotted lines show where each intruder will walk (labels: order · seconds in).
				A ring marks the contraption that grabs them; a yellow dot marks a motion sensor they trip.
				Once shoved, they re-route from wherever they land.
			</p>
		</aside>
	</main>
	<TuningPanel {storage} />
	<div id="overlay" class="overlay" hidden>
		<div class="card">
			<div id="overlay-body"></div>
			<button id="overlay-next" class="primary">Continue</button>
		</div>
	</div>
</div>
