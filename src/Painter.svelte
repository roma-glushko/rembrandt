<script lang="ts">
  import { onMount } from "svelte";
  import { effects, getDefaults, type Effect } from "./effects/index";
  import Magnifier from "./Magnifier.svelte";

  const DEFAULT_IMAGE =
    "https://images.pexels.com/photos/17619209/pexels-photo-17619209/free-photo-of-light-road-traffic-vacation.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2";

  let selectedEffect: Effect = $state(effects[0]);
  let params: Record<string, number> = $state(getDefaults(effects[0]));

  let originalCanvas = $state<HTMLCanvasElement>(undefined!);
  let processedCanvas = $state<HTMLCanvasElement>(undefined!);

  function selectEffect(effect: Effect) {
    selectedEffect = effect;
    params = getDefaults(effect);
  }

  function drawImageByUrl(url: string) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.addEventListener("load", function () {
      originalCanvas.width = this.width;
      originalCanvas.height = this.height;
      originalCanvas.getContext("2d")!.drawImage(this, 0, 0);
    });
    img.src = url;
  }

  function handleFileUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      drawImageByUrl(reader.result as string);
    });
    reader.readAsDataURL(file);
  }

  function handleApply() {
    selectedEffect.apply(originalCanvas, processedCanvas, params);
  }

  onMount(() => {
    drawImageByUrl(DEFAULT_IMAGE);
  });
</script>

<div class="layout">
  <aside class="sidebar">
    <div class="sidebar-section">
      <h3 class="section-label">Image</h3>
      <label class="file-upload">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Upload Image</span>
        <input type="file" accept="image/*" onchange={handleFileUpload} />
      </label>
    </div>

    <div class="sidebar-section">
      <h3 class="section-label">Effect</h3>
      <div class="effect-list">
        {#each effects as effect (effect.id)}
          <button
            class="effect-btn"
            class:active={selectedEffect.id === effect.id}
            onclick={() => selectEffect(effect)}
          >
            {effect.name}
          </button>
        {/each}
      </div>
    </div>

    {#if selectedEffect.params.length > 0}
      <div class="sidebar-section">
        <h3 class="section-label">Parameters</h3>
        <div class="params">
          {#each selectedEffect.params as paramDef (paramDef.name)}
            <label class="param">
              <div class="param-header">
                <span class="param-label">{paramDef.label}</span>
                <span class="param-value">{params[paramDef.name]}</span>
              </div>
              <input
                type="range"
                min={paramDef.min}
                max={paramDef.max}
                step="1"
                value={params[paramDef.name]}
                oninput={(e) => {
                  params[paramDef.name] = Number((e.target as HTMLInputElement).value);
                }}
              />
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <button class="apply-btn" onclick={handleApply}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Apply Effect
    </button>
  </aside>

  <main class="canvas-area">
    <div class="canvas-panel">
      <div class="panel-header">
        <span class="panel-label">Original</span>
      </div>
      <div class="canvas-wrap">
        <Magnifier canvas={originalCanvas}>
          <canvas bind:this={originalCanvas}></canvas>
        </Magnifier>
      </div>
    </div>

    <div class="canvas-panel">
      <div class="panel-header">
        <span class="panel-label">Result</span>
        <span class="panel-badge">{selectedEffect.name}</span>
      </div>
      <div class="canvas-wrap">
        <Magnifier canvas={processedCanvas}>
          <canvas bind:this={processedCanvas}></canvas>
        </Magnifier>
      </div>
    </div>
  </main>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  /* Sidebar */
  .sidebar {
    position: sticky;
    top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    box-shadow: var(--shadow);
  }

  @media (max-width: 900px) {
    .sidebar {
      position: static;
    }
  }

  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .section-label {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* File upload */
  .file-upload {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.75rem;
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.82rem;
    cursor: pointer;
    position: relative;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }

  .file-upload input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .file-upload:hover {
    border-color: var(--accent);
    color: var(--text);
    background: var(--accent-muted);
  }

  /* Effect list */
  .effect-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .effect-btn {
    padding: 0.45rem 0.65rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.82rem;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .effect-btn:hover {
    background: var(--accent-muted);
    color: var(--text);
  }

  .effect-btn.active {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 500;
  }

  /* Params */
  .params {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .param {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .param-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .param-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .param-value {
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
    color: var(--text-dim);
    min-width: 2ch;
    text-align: right;
  }

  .param input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .param input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: transform 0.15s;
  }

  .param input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }

  .param input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  /* Apply button */
  .apply-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.65rem 1rem;
    background: var(--accent);
    color: var(--accent-text);
    border: none;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
  }

  .apply-btn:hover {
    background: var(--accent-hover);
  }

  .apply-btn:active {
    transform: scale(0.98);
  }

  /* Canvas area */
  .canvas-area {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .canvas-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .panel-label {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .panel-badge {
    font-size: 0.68rem;
    padding: 0.15rem 0.5rem;
    background: var(--accent-muted);
    color: var(--accent);
    border-radius: 4px;
    font-weight: 500;
  }

  .canvas-wrap {
    position: relative;
    background: var(--canvas-bg);
    line-height: 0;
  }

  .canvas-wrap canvas {
    width: 100%;
    height: auto;
    display: block;
  }
</style>
