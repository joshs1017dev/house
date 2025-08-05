<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Project } from '../db/database';
  import { estimateCost, suggestMaterials, breakdownTasks } from '../services/ai';
  
  export let project: Project;
  
  const dispatch = createEventDispatcher();
  
  let aiMode: 'cost' | 'materials' | 'tasks' = 'cost';
  let loading = false;
  let response = '';
  let error = '';
  
  async function getAIHelp() {
    loading = true;
    error = '';
    response = '';
    
    try {
      let result;
      switch (aiMode) {
        case 'cost':
          result = await estimateCost(project.description);
          break;
        case 'materials':
          result = await suggestMaterials(project.description);
          break;
        case 'tasks':
          result = await breakdownTasks(project.description);
          break;
      }
      
      if (result.error) {
        error = result.error;
      } else {
        response = result.text;
      }
    } catch (e) {
      error = 'Failed to get AI response';
    } finally {
      loading = false;
    }
  }
</script>

<div class="ai-assistant card">
  <div class="ai-header">
    <h3>> AI Assistant</h3>
    <button class="close-btn" on:click={() => dispatch('close')}></button>
  </div>
  
  <div class="ai-modes">
    <button
      class="mode-btn"
      class:active={aiMode === 'cost'}
      on:click={() => aiMode = 'cost'}
    >
      =° Cost Estimate
    </button>
    <button
      class="mode-btn"
      class:active={aiMode === 'materials'}
      on:click={() => aiMode = 'materials'}
    >
      =à Suggest Materials
    </button>
    <button
      class="mode-btn"
      class:active={aiMode === 'tasks'}
      on:click={() => aiMode = 'tasks'}
    >
      =Ë Break Down Tasks
    </button>
  </div>
  
  <button
    class="btn-primary"
    on:click={getAIHelp}
    disabled={loading}
  >
    {loading ? 'Thinking...' : 'Get AI Suggestions'}
  </button>
  
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}
  
  {#if response}
    <div class="ai-response">
      <pre>{response}</pre>
    </div>
  {/if}
</div>

<style>
  .ai-assistant {
    margin-bottom: 2rem;
  }
  
  .ai-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .ai-header h3 {
    margin: 0;
  }
  
  .close-btn {
    background: none;
    color: var(--gray-600);
    font-size: 1.25rem;
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: var(--gray-100);
    transform: none;
  }
  
  .ai-modes {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .mode-btn {
    flex: 1;
    background: var(--gray-100);
    color: var(--gray-700);
    padding: 0.75rem;
    font-size: 0.875rem;
  }
  
  .mode-btn:hover {
    background: var(--gray-200);
    transform: none;
  }
  
  .mode-btn.active {
    background: var(--primary);
    color: white;
  }
  
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    margin-top: 1rem;
  }
  
  .ai-response {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
    max-height: 400px;
    overflow-y: auto;
  }
  
  .ai-response pre {
    white-space: pre-wrap;
    font-family: inherit;
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.6;
  }
</style>