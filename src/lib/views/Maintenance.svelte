<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../db/database';
  
  onMount(async () => {
    // Load maintenance reminders
  });
</script>

<div class="maintenance">
  <h1>Maintenance</h1>
  <p>Maintenance reminders coming soon...</p>
</div>

<style>
  .maintenance {
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