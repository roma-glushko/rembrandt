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

<div class="panels">
  <section class="panel">
    <h2>Original</h2>
    <div class="canvas-wrap">
      <Magnifier canvas={originalCanvas}>
        <canvas bind:this={originalCanvas}></canvas>
      </Magnifier>
    </div>

    <div class="controls">
      <label class="file-upload">
        <span class="file-upload-label">Choose image</span>
        <input type="file" accept="image/*" onchange={handleFileUpload} />
      </label>

      <div class="effect-selector">
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

      {#if selectedEffect.params.length > 0}
        <div class="params">
          {#each selectedEffect.params as paramDef (paramDef.name)}
            <label class="param">
              <span>{paramDef.label}</span>
              <input
                type="number"
                min={paramDef.min}
                max={paramDef.max}
                value={params[paramDef.name]}
                oninput={(e) => {
                  params[paramDef.name] = Number((e.target as HTMLInputElement).value);
                }}
              />
            </label>
          {/each}
        </div>
      {/if}

      <button class="apply-btn" onclick={handleApply}>
        Apply Effect
      </button>
    </div>
  </section>

  <section class="panel">
    <h2>Result</h2>
    <div class="canvas-wrap">
      <Magnifier canvas={processedCanvas}>
        <canvas bind:this={processedCanvas}></canvas>
      </Magnifier>
    </div>
  </section>
</div>

<style>
  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  @media (max-width: 800px) {
    .panels {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
  }

  h2 {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .canvas-wrap {
    position: relative;
    background: var(--canvas-bg);
    border-radius: 6px;
    overflow: hidden;
    line-height: 0;
  }

  .canvas-wrap canvas {
    width: 100%;
    height: auto;
    display: block;
  }

  .controls {
    margin-top: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .file-upload {
    position: relative;
    cursor: pointer;
  }

  .file-upload input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .file-upload-label {
    display: block;
    padding: 0.6rem 1rem;
    border: 1px dashed var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: center;
    transition: border-color 0.2s, color 0.2s;
  }

  .file-upload:hover .file-upload-label {
    border-color: var(--accent);
    color: var(--text);
  }

  .effect-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .effect-btn {
    padding: 0.4rem 0.75rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }

  .effect-btn:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .effect-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }

  .params {
    display: flex;
    gap: 0.75rem;
  }

  .param {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .param span {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .param input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    color: var(--text);
    font-size: 0.9rem;
    font-family: inherit;
    width: 100%;
    transition: border-color 0.2s;
  }

  .param input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .apply-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.7rem 1.5rem;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .apply-btn:hover {
    background: var(--accent-hover);
  }
</style>
