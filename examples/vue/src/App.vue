<script setup>
function toggleTheme() {
  const root = document.documentElement;
  root.dataset.brand = root.dataset.brand === "acme" ? "nova" : "acme";
  root.dataset.mode = root.dataset.mode === "light" ? "dark" : "light";
}
</script>

<template>
  <main class="shell">
    <h1>Vue + PrismForge</h1>
    <p>This Vue app is runnable and uses generated PrismForge tokens.</p>
    <div class="actions">
      <button class="btn">Deploy</button>
      <button class="btn subtle" @click="toggleTheme">Toggle Brand/Mode</button>
    </div>
  </main>
</template>

<style scoped>
.shell {
  max-width: 760px;
  margin: 3rem auto;
  padding: 2rem;
  background: var(--dk-color-surface-default-base);
  color: var(--dk-color-text-default-base);
  border: 1px solid var(--dk-color-border-subtle-base);
  border-radius: var(--dk-radius-control-default-base);
  box-shadow: var(--dk-shadow-control-default-base);
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  background: var(--dk-component-button-bg-primary-default);
  color: var(--dk-component-button-label-primary-default);
  border: 1px solid var(--dk-component-button-border-primary-default);
  border-radius: var(--dk-radius-control-default-base);
  padding: var(--dk-spacing-control-y-default-base) var(--dk-spacing-control-x-default-base);
  transition-duration: var(--dk-component-button-motion-primary-default);
}

.btn:hover {
  background: var(--dk-component-button-bg-primary-hover);
}

.subtle {
  background: transparent;
  color: var(--dk-color-text-default-base);
  border-color: var(--dk-color-border-subtle-base);
}
</style>
