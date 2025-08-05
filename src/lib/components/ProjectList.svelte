<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { projects } from '../stores/projects';
  import { format } from 'date-fns';
  import type { Project } from '../db/database';
  
  const dispatch = createEventDispatcher();
  
  let filterStatus: 'all' | Project['status'] = 'all';
  let sortBy: 'name' | 'date' | 'budget' | 'status' = 'date';
  let searchQuery = '';
  
  $: filteredProjects = $projects
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'budget':
          return b.budget - a.budget;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  
  function selectProject(projectId: number) {
    dispatch('selectProject', projectId);
  }
  
  function newProject() {
    dispatch('newProject');
  }
  
  async function deleteProject(project: Project) {
    if (confirm(`Are you sure you want to delete "${project.name}"? This will also delete all associated tasks, expenses, and photos.`)) {
      await projects.delete(project.id!);
    }
  }
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getStatusColor(status: Project['status']) {
    switch (status) {
      case 'planning': return 'primary';
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'gray';
      default: return 'gray';
    }
  }
  
  function getProgressPercentage(project: Project) {
    if (project.budget === 0) return 0;
    return Math.min(100, (project.actualCost / project.budget) * 100);
  }
</script>

<div class="project-list">
  <div class="container p-6">
    <div class="header">
      <h1>Projects</h1>
      <button class="primary" on:click={newProject}>
        ➕ New Project
      </button>
    </div>
    
    <div class="controls">
      <div class="search-box">
        <input
          type="text"
          placeholder="Search projects..."
          bind:value={searchQuery}
        />
      </div>
      
      <div class="filters">
        <select bind:value={filterStatus}>
          <option value="all">All Status</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
        
        <select bind:value={sortBy}>
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="budget">Sort by Budget</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>
    </div>
    
    {#if filteredProjects.length === 0}
      <div class="empty-state">
        <p>No projects found</p>
        <button on:click={newProject}>Create your first project</button>
      </div>
    {:else}
      <div class="projects-grid">
        {#each filteredProjects as project}
          <div class="project-card card">
            {#if project.coverPhoto}
              <div class="project-cover">
                <img src={project.coverPhoto} alt={project.name} />
              </div>
            {/if}
            
            <div class="project-content">
              <div class="project-header">
                <h3>{project.name}</h3>
                <span class="badge {getStatusColor(project.status)}">
                  {project.status}
                </span>
              </div>
              
              <p class="project-description">{project.description}</p>
              
              <div class="project-meta">
                <span class="meta-item">
                  📅 {format(project.startDate, 'MMM d, yyyy')}
                </span>
                <span class="meta-item">
                  🏷️ {project.priority} priority
                </span>
              </div>
              
              <div class="project-budget">
                <div class="budget-info">
                  <span class="budget-label">Budget Progress</span>
                  <span class="budget-amount">
                    {formatCurrency(project.actualCost)} / {formatCurrency(project.budget)}
                  </span>
                </div>
                <div class="progress-bar-container">
                  <div 
                    class="progress-bar"
                    style="width: {getProgressPercentage(project)}%"
                    class:warning={getProgressPercentage(project) > 90}
                  ></div>
                </div>
              </div>
              
              {#if project.tags.length > 0}
                <div class="project-tags">
                  {#each project.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              {/if}
              
              <div class="project-actions">
                <button on:click={() => selectProject(project.id!)}>
                  View Details
                </button>
                <button 
                  class="danger"
                  on:click={() => deleteProject(project)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .project-list {
    min-height: 100%;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .search-box {
    flex: 1;
    min-width: 250px;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .filters {
    display: flex;
    gap: 0.5rem;
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 0;
  }
  
  .empty-state p {
    font-size: 1.125rem;
    color: var(--gray-600);
    margin-bottom: 1rem;
  }
  
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .project-card {
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .project-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .project-cover {
    height: 150px;
    overflow: hidden;
  }
  
  .project-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .project-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
  }
  
  .project-header h3 {
    font-size: 1.25rem;
    margin: 0;
  }
  
  .project-description {
    color: var(--gray-600);
    font-size: 0.875rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .project-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .project-budget {
    background: var(--gray-50);
    padding: 0.75rem;
    border-radius: var(--radius-sm);
  }
  
  .budget-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .budget-label {
    font-size: 0.75rem;
    color: var(--gray-600);
  }
  
  .budget-amount {
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .progress-bar-container {
    height: 8px;
    background: var(--gray-200);
    border-radius: 4px;
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
  
  .project-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--gray-100);
    color: var(--gray-700);
    border-radius: var(--radius-sm);
  }
  
  .project-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
  }
  
  .project-actions button {
    flex: 1;
  }
  
  .badge.gray {
    background: var(--gray-100);
    color: var(--gray-700);
  }
</style>