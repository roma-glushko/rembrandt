<script lang="ts">
  import type { Snippet } from "svelte";

  const LOUPE_SIZE = 180;
  const ZOOM = 3;

  let { canvas, children }: { canvas: HTMLCanvasElement | undefined; children: Snippet } = $props();

  let wrap = $state<HTMLDivElement>(undefined!);
  let loupe = $state<HTMLCanvasElement>(undefined!);

  let visible = $state(false);
  let loupeX = $state(0);
  let loupeY = $state(0);

  function handleMove(e: MouseEvent) {
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    loupeX = mx;
    loupeY = my;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const srcX = mx * scaleX;
    const srcY = my * scaleY;

    const ctx = loupe.getContext("2d")!;
    const srcRadius = (LOUPE_SIZE / 2 / ZOOM) * scaleX;

    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(LOUPE_SIZE / 2, LOUPE_SIZE / 2, LOUPE_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      canvas,
      srcX - srcRadius,
      srcY - srcRadius,
      srcRadius * 2,
      srcRadius * 2,
      0,
      0,
      LOUPE_SIZE,
      LOUPE_SIZE,
    );
    ctx.restore();
  }

  function handleEnter() {
    if (canvas && canvas.width > 0) visible = true;
  }

  function handleLeave() {
    visible = false;
  }
</script>

<div
  class="magnifier-wrap"
  bind:this={wrap}
  onmousemove={handleMove}
  onmouseenter={handleEnter}
  onmouseleave={handleLeave}
  role="img"
>
  {@render children()}

  {#if visible}
    <canvas
      bind:this={loupe}
      class="loupe"
      width={LOUPE_SIZE}
      height={LOUPE_SIZE}
      style="left: {loupeX}px; top: {loupeY}px; width: {LOUPE_SIZE}px; height: {LOUPE_SIZE}px;"
    ></canvas>
  {/if}
</div>

<style>
  .magnifier-wrap {
    position: relative;
    cursor: crosshair;
  }

  .loupe {
    position: absolute;
    pointer-events: none;
    z-index: 10;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 2px solid var(--accent);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 0 12px rgba(0, 0, 0, 0.4),
      inset 0 0 20px rgba(0, 0, 0, 0.15);
    image-rendering: pixelated;
    backdrop-filter: none;
  }
</style>
