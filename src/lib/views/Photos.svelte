<script lang="ts">
  import { onMount } from 'svelte';
  import { photos, projects } from '../stores';
  
  onMount(async () => {
    await photos.load();
    await projects.load();
  });
</script>

<div class="photos">
  <h1>Photos</h1>
  <p>Photo gallery coming soon...</p>
</div>

<style>
  .photos {
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