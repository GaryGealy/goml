<script lang="ts">
	import {
		changedValues,
		currentValue,
		defaultValue,
		resetTuning,
		saveTuning,
		setValue,
		TUNING_SPECS,
		type TuningId
	} from './tuning';

	interface Props {
		storage: Storage | undefined;
	}
	let { storage }: Props = $props();

	let open = $state(false);
	let copied = $state(false);
	const read = () =>
		Object.fromEntries(TUNING_SPECS.map((s) => [s.id, currentValue(s.id)])) as Record<
			TuningId,
			number
		>;
	let values = $state(read());

	const groups = [...new Set(TUNING_SPECS.map((s) => s.group))].map((name) => ({
		name,
		specs: TUNING_SPECS.filter((s) => s.group === name)
	}));
	let changedCount = $derived(
		TUNING_SPECS.filter((s) => values[s.id] !== defaultValue(s.id)).length
	);

	function set(id: TuningId, raw: string) {
		const n = Number(raw);
		if (raw === '' || !Number.isFinite(n)) return;
		setValue(id, n);
		values[id] = currentValue(id);
		saveTuning(storage);
	}

	function resetOne(id: TuningId) {
		setValue(id, defaultValue(id));
		values[id] = currentValue(id);
		saveTuning(storage);
	}

	function resetAll() {
		resetTuning();
		values = read();
		saveTuning(storage);
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(JSON.stringify(changedValues(), null, '\t'));
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard can be blocked; nothing else to do.
		}
	}
</script>

<button class="toggle" onclick={() => (open = !open)} aria-expanded={open}>
	Tuning{changedCount ? ` (${changedCount})` : ''}
</button>

{#if open}
	<aside class="drawer" aria-label="Tuning">
		<header>
			<h2>Tuning</h2>
			<button onclick={() => (open = false)} aria-label="Close tuning">✕</button>
		</header>
		<p class="note">
			Changes apply immediately, even mid-wave, and are saved in this browser. Copy JSON gives only
			the values that differ from the defaults.
		</p>
		<div class="actions">
			<button onclick={copy}>{copied ? 'Copied' : 'Copy JSON'}</button>
			<button onclick={resetAll} disabled={!changedCount}>Reset all</button>
		</div>
		{#each groups as group (group.name)}
			<details open>
				<summary>{group.name}</summary>
				{#each group.specs as spec (spec.id)}
					{@const changed = values[spec.id] !== defaultValue(spec.id)}
					<div class="row" class:changed>
						<label for={`t-${spec.id}`}>{spec.label}</label>
						<input
							type="number"
							id={`t-${spec.id}`}
							min={spec.min}
							max={spec.max}
							step={spec.step}
							value={values[spec.id]}
							onchange={(e) => set(spec.id, e.currentTarget.value)}
						/>
						<input
							type="range"
							aria-label={spec.label}
							min={spec.min}
							max={spec.max}
							step={spec.step}
							value={values[spec.id]}
							oninput={(e) => set(spec.id, e.currentTarget.value)}
						/>
						<button
							class="reset"
							title={`Reset to ${defaultValue(spec.id)}`}
							aria-label={`Reset ${spec.label}`}
							disabled={!changed}
							onclick={() => resetOne(spec.id)}>↺</button
						>
					</div>
				{/each}
			</details>
		{/each}
	</aside>
{/if}

<style>
	.toggle {
		position: fixed;
		right: 16px;
		bottom: 16px;
		z-index: 10;
		padding: 8px 14px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--panel);
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.15);
	}
	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		width: min(380px, 100vw);
		overflow-y: auto;
		padding: 16px;
		background: var(--panel);
		border-left: 1px solid var(--line);
		box-shadow: -4px 0 16px rgb(0 0 0 / 0.12);
		font-size: 13px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
	}
	header button {
		border: 0;
		background: none;
		font-size: 16px;
		cursor: pointer;
	}
	.note {
		margin: 8px 0;
		color: var(--muted);
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-bottom: 8px;
	}
	.actions button {
		flex: 1;
		padding: 6px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: #fff;
		font: inherit;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	details {
		border-top: 1px solid var(--line);
		padding: 6px 0;
	}
	summary {
		font-weight: 700;
		cursor: pointer;
		padding: 4px 0;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 64px 24px;
		grid-template-areas: 'label num reset' 'range range range';
		align-items: center;
		gap: 2px 6px;
		padding: 4px 6px;
		border-radius: 4px;
	}
	.row.changed {
		background: #fff3c4;
	}
	.row label {
		grid-area: label;
	}
	.row input[type='number'] {
		grid-area: num;
		width: 100%;
		padding: 2px 4px;
		border: 1px solid var(--line);
		border-radius: 4px;
		font: inherit;
		font-variant-numeric: tabular-nums;
	}
	.row input[type='range'] {
		grid-area: range;
		width: 100%;
		accent-color: var(--accent);
	}
	.reset {
		grid-area: reset;
		border: 0;
		background: none;
		cursor: pointer;
		font-size: 14px;
	}
</style>
