<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { projects, tasks, materials, expenses, photos } from '../stores';
  import TaskList from '../components/TaskList.svelte';
  import MaterialsList from '../components/MaterialsList.svelte';
  import ExpensesList from '../components/ExpensesList.svelte';
  import PhotoGallery from '../components/PhotoGallery.svelte';
  import AIAssistant from '../components/AIAssistant.svelte';
  import type { Project } from '../db/database';
  
  export let projectId: number;
  
  const dispatch = createEventDispatcher();
  
  let project: Project | null = null;
  let activeTab = 'tasks';
  let showAIAssistant = false;
  
  onMount(async () => {
    await loadProjectData();
  });
  
  async function loadProjectData() {
    const allProjects = await projects.load();
    projects.subscribe(p => {
      project = p.find(proj => proj.id === projectId) || null;
    })();
    
    await tasks.load(projectId);
    await materials.load(projectId);
    await expenses.load(projectId);
    await photos.load(projectId);
  }
  
  function handleBack() {
    dispatch('back');
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getProgressPercentage(): number {
    if (!project || project.budget === 0) return 0;
    return Math.min(100, (project.actualCost / project.budget) * 100);
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'planning': return '#6b7280';
      default: return '#9ca3af';
    }
  }
</script>

{#if project}
  <div class="project-detail">
    <div class="detail-header">
      <button class="back-btn" on:click={handleBack}>
        ← Back
      </button>
      
      <div class="header-content">
        <div class="header-info">
          <h1>{project.name}</h1>
          <p class="project-description">{project.description}</p>
          <div class="project-meta">
            <span
              class="status-badge"
              style="background: {getStatusColor(project.status)}"
            >
              {project.status}
            </span>
            <span class="priority-badge priority-{project.priority}">
              {project.priority} priority
            </span>
          </div>
        </div>
        
        <div class="header-actions">
          <button
            class="btn-secondary"
            on:click={() => showAIAssistant = !showAIAssistant}
          >
            🤖 AI Assistant
          </button>
        </div>
      </div>
    </div>
    
    <div class="budget-overview card">
      <h3>Budget Overview</h3>
      <div class="budget-stats">
        <div class="budget-stat">
          <span class="label">Budget</span>
          <span class="value">{formatCurrency(project.budget)}</span>
        </div>
        <div class="budget-stat">
          <span class="label">Spent</span>
          <span class="value text-danger">{formatCurrency(project.actualCost)}</span>
        </div>
        <div class="budget-stat">
          <span class="label">Remaining</span>
          <span class="value text-success">{formatCurrency(project.budget - project.actualCost)}</span>
        </div>
      </div>
      <div class="budget-progress">
        <div
          class="budget-bar"
          style="width: {getProgressPercentage()}%; background: {getProgressPercentage() > 90 ? 'var(--danger)' : 'var(--primary)'}"
        ></div>
      </div>
    </div>
    
    {#if showAIAssistant}
      <div class="ai-assistant-container">
        <AIAssistant {project} on:close={() => showAIAssistant = false} />
      </div>
    {/if}
    
    <div class="tabs">
      <button
        class="tab"
        class:active={activeTab === 'tasks'}
        on:click={() => activeTab = 'tasks'}
      >
        📋 Tasks
      </button>
      <button
        class="tab"
        class:active={activeTab === 'materials'}
        on:click={() => activeTab = 'materials'}
      >
        🛠️ Materials
      </button>
      <button
        class="tab"
        class:active={activeTab === 'expenses'}
        on:click={() => activeTab = 'expenses'}
      >
        💰 Expenses
      </button>
      <button
        class="tab"
        class:active={activeTab === 'photos'}
        on:click={() => activeTab = 'photos'}
      >
        📸 Photos
      </button>
    </div>
    
    <div class="tab-content">
      {#if activeTab === 'tasks'}
        <TaskList projectId={project.id} />
      {:else if activeTab === 'materials'}
        <MaterialsList projectId={project.id} />
      {:else if activeTab === 'expenses'}
        <ExpensesList projectId={project.id} />
      {:else if activeTab === 'photos'}
        <PhotoGallery projectId={project.id} />
      {/if}
    </div>
  </div>
{:else}
  <div class="loading">
    <p>Loading project...</p>
  </div>
{/if}

<style>
  .project-detail {
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
  
  .detail-header {
    margin-bottom: 2rem;
  }
  
  .back-btn {
    background: none;
    color: var(--primary);
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }
  
  .back-btn:hover {
    background: var(--gray-100);
    transform: translateX(-2px);
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
  }
  
  .header-info {
    flex: 1;
  }
  
  .header-info h1 {
    margin-bottom: 0.5rem;
  }
  
  .project-description {
    color: var(--gray-600);
    margin-bottom: 1rem;
    line-height: 1.6;
  }
  
  .project-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .status-badge {
    font-size: 0.875rem;
    color: white;
    padding: 0.375rem 1rem;
    border-radius: 999px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .priority-badge {
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .priority-high {
    color: var(--danger);
  }
  
  .priority-medium {
    color: var(--warning);
  }
  
  .priority-low {
    color: var(--gray-600);
  }
  
  .budget-overview {
    margin-bottom: 2rem;
  }
  
  .budget-stats {
    display: flex;
    justify-content: space-between;
    margin: 1rem 0;
  }
  
  .budget-stat {
    text-align: center;
  }
  
  .budget-stat .label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .budget-stat .value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .text-danger {
    color: var(--danger);
  }
  
  .text-success {
    color: var(--secondary);
  }
  
  .budget-progress {
    height: 8px;
    background: var(--gray-200);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 1rem;
  }
  
  .budget-bar {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .ai-assistant-container {
    margin-bottom: 2rem;
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 2px solid var(--gray-200);
    margin-bottom: 2rem;
  }
  
  .tab {
    background: none;
    color: var(--gray-600);
    padding: 0.75rem 1.5rem;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
  }
  
  .tab:hover {
    color: var(--gray-900);
    transform: none;
    box-shadow: none;
  }
  
  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    font-weight: 500;
  }
  
  .tab-content {
    animation: fadeIn 0.2s ease-out;
  }
  
  .loading {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--gray-500);
  }
  
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
    }
    
    .budget-stats {
      flex-direction: column;
      gap: 1rem;
    }
    
    .tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .tab {
      white-space: nowrap;
      padding: 0.75rem 1rem;
    }
  }
</style>