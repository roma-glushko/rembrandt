<script lang="ts">
  import { onMount } from "svelte";
  import Painter from "./Painter.svelte";

  let theme = $state<"dark" | "light">("dark");

  onMount(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      theme = "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }
</script>

<header>
  <div class="header-row">
    <div>
      <h1>Rembrandt</h1>
      <p>Image effect generator</p>
    </div>
    <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
      {#if theme === "dark"}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {/if}
    </button>
  </div>
</header>

<Painter />

<style>
  header {
    margin-bottom: 2.5rem;
  }

  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  h1 {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 2.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--accent);
  }

  p {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: 0.25rem;
  }

  .theme-toggle {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-top: 0.4rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }

  .theme-toggle:hover {
    border-color: var(--accent);
    color: var(--text);
  }
</style>
