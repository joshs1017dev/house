<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { projects } from '../stores/projects';
  import { tasks } from '../stores/tasks';
  import { db } from '../db/database';
  import type { Project, Task, Material, Photo, Expense } from '../db/database';
  import TaskManager from './TaskManager.svelte';
  import MaterialsList from './MaterialsList.svelte';
  import ExpenseTracker from './ExpenseTracker.svelte';
  import PhotoGallery from './PhotoGallery.svelte';
  import ProjectAI from './ProjectAI.svelte';
  import { format } from 'date-fns';
  
  export let projectId: number;
  
  const dispatch = createEventDispatcher();
  
  let project: Project | null = null;
  let activeTab: 'overview' | 'tasks' | 'materials' | 'expenses' | 'photos' | 'ai' = 'overview';
  let isEditing = false;
  let editForm: Partial<Project> = {};
  
  let projectStats = {
    totalTasks: 0,
    completedTasks: 0,
    totalExpenses: 0,
    materialsCost: 0,
    photosCount: 0
  };
  
  onMount(async () => {
    await loadProject();
    await loadProjectStats();
  });
  
  async function loadProject() {
    const p = await db.projects.get(projectId);
    if (p) {
      project = p;
      editForm = { ...p };
    }
  }
  
  async function loadProjectStats() {
    const allTasks = await db.tasks.where('projectId').equals(projectId).toArray();
    const expenses = await db.expenses.where('projectId').equals(projectId).toArray();
    const materials = await db.materials.where('projectId').equals(projectId).toArray();
    const photos = await db.photos.where('projectId').equals(projectId).toArray();
    
    projectStats = {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      materialsCost: materials.reduce((sum, m) => sum + (m.actualCost || m.estimatedCost), 0),
      photosCount: photos.length
    };
  }
  
  async function handleExpenseUpdate() {
    await loadProjectStats();
    if (project) {
      project.actualCost = projectStats.totalExpenses;
      await projects.update(projectId, { actualCost: projectStats.totalExpenses });
    }
  }
  
  function handleBack() {
    dispatch('back');
  }
  
  function startEdit() {
    isEditing = true;
    editForm = { ...project };
  }
  
  function cancelEdit() {
    isEditing = false;
    editForm = { ...project };
  }
  
  async function saveEdit() {
    if (!editForm.name?.trim()) {
      alert('Project name is required');
      return;
    }
    
    await projects.update(projectId, {
      name: editForm.name.trim(),
      description: editForm.description?.trim(),
      budget: editForm.budget,
      status: editForm.status,
      priority: editForm.priority,
      targetEndDate: editForm.targetEndDate
    });
    
    await loadProject();
    isEditing = false;
  }
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getProgressPercentage() {
    if (!project || project.budget === 0) return 0;
    return Math.min(100, (project.actualCost / project.budget) * 100);
  }
</script>

{#if project}
  <div class="project-detail">
    <div class="project-header">
      <div class="container">
        <button class="back-btn" on:click={handleBack}>
          ← Back to Projects
        </button>
        
        <div class="header-content">
          {#if isEditing}
            <div class="edit-form">
              <input
                type="text"
                bind:value={editForm.name}
                class="name-input"
                placeholder="Project name"
              />
              <textarea
                bind:value={editForm.description}
                class="description-input"
                placeholder="Description"
                rows="2"
              ></textarea>
              <div class="edit-row">
                <input
                  type="number"
                  bind:value={editForm.budget}
                  placeholder="Budget"
                  min="0"
                  step="0.01"
                />
                <select bind:value={editForm.status}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
                <select bind:value={editForm.priority}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div class="edit-actions">
                <button class="secondary" on:click={cancelEdit}>Cancel</button>
                <button on:click={saveEdit}>Save Changes</button>
              </div>
            </div>
          {:else}
            <div class="header-info">
              <h1>{project.name}</h1>
              <p class="description">{project.description}</p>
              <div class="project-meta">
                <span class="badge {project.status}">{project.status}</span>
                <span class="badge {project.priority}">{project.priority} priority</span>
                <span class="date">Started {format(project.startDate, 'MMM d, yyyy')}</span>
                {#if project.targetEndDate}
                  <span class="date">Target: {format(project.targetEndDate, 'MMM d, yyyy')}</span>
                {/if}
              </div>
            </div>
            <button class="edit-btn" on:click={startEdit}>
              Edit Project
            </button>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="container">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-label">Budget Progress</div>
            <div class="stat-value">{formatCurrency(project.actualCost)} / {formatCurrency(project.budget)}</div>
            <div class="progress-bar-container">
              <div 
                class="progress-bar"
                style="width: {getProgressPercentage()}%"
                class:warning={getProgressPercentage() > 90}
              ></div>
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-label">Tasks Progress</div>
            <div class="stat-value">{projectStats.completedTasks} / {projectStats.totalTasks}</div>
            <div class="stat-detail">
              {projectStats.totalTasks > 0 ? Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100) : 0}% complete
            </div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-content">
            <div class="stat-label">Materials Cost</div>
            <div class="stat-value">{formatCurrency(projectStats.materialsCost)}</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📸</div>
          <div class="stat-content">
            <div class="stat-label">Photos</div>
            <div class="stat-value">{projectStats.photosCount}</div>
          </div>
        </div>
      </div>
      
      <div class="tabs">
        <button 
          class="tab"
          class:active={activeTab === 'overview'}
          on:click={() => activeTab = 'overview'}
        >
          Overview
        </button>
        <button 
          class="tab"
          class:active={activeTab === 'tasks'}
          on:click={() => activeTab = 'tasks'}
        >
          Tasks
        </button>
        <button 
          class="tab"
          class:active={activeTab === 'materials'}
          on:click={() => activeTab = 'materials'}
        >
          Materials
        </button>
        <button 
          class="tab"
          class:active={activeTab === 'expenses'}
          on:click={() => activeTab = 'expenses'}
        >
          Expenses
        </button>
        <button 
          class="tab"
          class:active={activeTab === 'photos'}
          on:click={() => activeTab = 'photos'}
        >
          Photos
        </button>
        <button 
          class="tab ai-tab"
          class:active={activeTab === 'ai'}
          on:click={() => activeTab = 'ai'}
        >
          ✨ AI Assistant
        </button>
      </div>
      
      <div class="tab-content">
        {#if activeTab === 'overview'}
          <div class="overview">
            <div class="overview-section">
              <h3>Project Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="label">Status:</span>
                  <span class="value">{project.status}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Priority:</span>
                  <span class="value">{project.priority}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Budget:</span>
                  <span class="value">{formatCurrency(project.budget)}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Spent:</span>
                  <span class="value">{formatCurrency(project.actualCost)}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Start Date:</span>
                  <span class="value">{format(project.startDate, 'MMM d, yyyy')}</span>
                </div>
                {#if project.targetEndDate}
                  <div class="summary-item">
                    <span class="label">Target End:</span>
                    <span class="value">{format(project.targetEndDate, 'MMM d, yyyy')}</span>
                  </div>
                {/if}
              </div>
            </div>
            
            {#if project.tags.length > 0}
              <div class="overview-section">
                <h3>Tags</h3>
                <div class="tags">
                  {#each project.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else if activeTab === 'tasks'}
          <TaskManager {projectId} on:update={loadProjectStats} />
        {:else if activeTab === 'materials'}
          <MaterialsList {projectId} on:update={loadProjectStats} />
        {:else if activeTab === 'expenses'}
          <ExpenseTracker {projectId} on:update={handleExpenseUpdate} />
        {:else if activeTab === 'photos'}
          <PhotoGallery {projectId} on:update={loadProjectStats} />
        {:else if activeTab === 'ai'}
          <ProjectAI {project} />
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="loading">Loading project...</div>
{/if}

<style>
  .project-detail {
    min-height: 100vh;
    background: var(--gray-50);
  }
  
  .project-header {
    background: white;
    box-shadow: var(--shadow);
    padding: 2rem 0;
    margin-bottom: 2rem;
  }
  
  .back-btn {
    background: none;
    color: var(--gray-600);
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  
  .back-btn:hover {
    background: var(--gray-100);
    color: var(--gray-800);
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 2rem;
  }
  
  .header-info {
    flex: 1;
  }
  
  .header-info h1 {
    margin-bottom: 0.5rem;
  }
  
  .description {
    color: var(--gray-600);
    margin-bottom: 1rem;
  }
  
  .project-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  
  .date {
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .edit-btn {
    background: var(--gray-100);
    color: var(--gray-700);
  }
  
  .edit-btn:hover {
    background: var(--gray-200);
  }
  
  .edit-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .name-input {
    font-size: 1.875rem;
    font-weight: 600;
    border: 2px solid var(--gray-300);
    padding: 0.75rem;
  }
  
  .description-input {
    resize: vertical;
  }
  
  .edit-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }
  
  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .stat-icon {
    font-size: 2rem;
  }
  
  .stat-content {
    flex: 1;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .stat-detail {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 0.25rem;
  }
  
  .progress-bar-container {
    height: 6px;
    background: var(--gray-200);
    border-radius: 3px;
    margin-top: 0.5rem;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s;
  }
  
  .progress-bar.warning {
    background: var(--warning);
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--gray-200);
    overflow-x: auto;
  }
  
  .tab {
    background: none;
    color: var(--gray-600);
    padding: 0.75rem 1.5rem;
    border-radius: 0;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    white-space: nowrap;
  }
  
  .tab:hover {
    background: none;
    color: var(--gray-800);
    transform: none;
    box-shadow: none;
  }
  
  .tab.active {
    background: none;
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  
  .tab.ai-tab {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }
  
  .tab.ai-tab.active {
    color: white;
  }
  
  .tab-content {
    background: white;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    min-height: 400px;
  }
  
  .overview-section {
    margin-bottom: 2rem;
  }
  
  .overview-section:last-child {
    margin-bottom: 0;
  }
  
  .overview-section h3 {
    margin-bottom: 1rem;
    font-size: 1.125rem;
  }
  
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
  }
  
  .summary-item .label {
    font-weight: 500;
    color: var(--gray-600);
  }
  
  .summary-item .value {
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tag {
    padding: 0.5rem 1rem;
    background: var(--gray-100);
    color: var(--gray-700);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }
  
  .badge.planning { background: var(--gray-100); color: var(--gray-700); }
  .badge.active { background: rgb(16 185 129 / 0.1); color: var(--secondary); }
  .badge.paused { background: rgb(245 158 11 / 0.1); color: var(--warning); }
  .badge.completed { background: var(--gray-100); color: var(--gray-700); }
  
  .badge.low { background: rgb(59 130 246 / 0.1); color: #3b82f6; }
  .badge.medium { background: rgb(245 158 11 / 0.1); color: var(--warning); }
  .badge.high { background: rgb(239 68 68 / 0.1); color: var(--danger); }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: var(--gray-600);
  }
  
  @media (max-width: 768px) {
    .edit-row {
      grid-template-columns: 1fr;
    }
    
    .tabs {
      padding: 0 1rem;
    }
    
    .tab-content {
      padding: 1rem;
    }
  }
</style>