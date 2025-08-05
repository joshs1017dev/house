<script lang="ts">
  import { onMount } from 'svelte';
  import { expenses, projects } from '../stores';
  
  onMount(async () => {
    await expenses.load();
    await projects.load();
  });
</script>

<div class="expenses">
  <h1>Expenses</h1>
  <p>Expense tracking coming soon...</p>
</div>

<style>
  .expenses {
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