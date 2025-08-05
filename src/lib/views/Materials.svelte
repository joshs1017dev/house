<script lang="ts">
  import { onMount } from 'svelte';
  import { materials, projects } from '../stores';
  
  onMount(async () => {
    await materials.load();
    await projects.load();
  });
</script>

<div class="materials">
  <h1>Materials</h1>
  <p>Materials management coming soon...</p>
</div>

<style>
  .materials {
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>