<script lang="ts">
  import { onMount } from 'svelte';
  import { projects, rooms } from '../stores';
  import { createEventDispatcher } from 'svelte';
  import type { Project, Room } from '../db/database';
  
  const dispatch = createEventDispatcher();
  
  let allProjects: Project[] = [];
  let filteredProjects: Project[] = [];
  let allRooms: Room[] = [];
  let selectedStatus = 'all';
  let selectedRoom = 'all';
  let searchTerm = '';
  let sortBy = 'updated';
  
  onMount(async () => {
    await projects.load();
    await rooms.load();
  });
  
  projects.subscribe(p => {
    allProjects = p;
    filterProjects();
  });
  
  rooms.subscribe(r => {
    allRooms = r;
  });
  
  function filterProjects() {
    filteredProjects = allProjects.filter(project => {
      if (selectedStatus !== 'all' && project.status !== selectedStatus) return false;
      if (selectedRoom !== 'all' && project.roomId !== parseInt(selectedRoom)) return false;
      if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !project.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    
    // Sort projects
    filteredProjects.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'budget':
          return b.budget - a.budget;
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'updated':
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });
  }
  
  function handleProjectClick(project: Project) {
    dispatch('selectProject', project.id);
  }
  
  function handleProjectEdit(event: Event, project: Project) {
    event.stopPropagation();
    dispatch('editProject', project);
  }
  
  async function handleProjectDelete(event: Event, project: Project) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${project.name}"? This will also delete all related tasks, materials, and expenses.`)) {
      await projects.delete(project.id || 0);
    }
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
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
  
  function getProgressPercentage(project: Project): number {
    if (project.budget === 0) return 0;
    return Math.min(100, (project.actualCost / project.budget) * 100);
  }
  
  $: {
    selectedStatus;
    selectedRoom;
    searchTerm;
    sortBy;
    filterProjects();
  }
</script>

<div class="projects">
  <div class="projects-header">
    <h1>Projects</h1>
    <button class="btn-primary" on:click={() => dispatch('editProject', null)}>
      <span>➕</span>
      New Project
    </button>
  </div>
  
  <div class="filters">
    <div class="filter-group">
      <input
        type="text"
        placeholder="Search projects..."
        bind:value={searchTerm}
        class="search-input"
      />
    </div>
    
    <div class="filter-group">
      <select bind:value={selectedStatus}>
        <option value="all">All Status</option>
        <option value="planning">Planning</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </select>
    </div>
    
    <div class="filter-group">
      <select bind:value={selectedRoom}>
        <option value="all">All Rooms</option>
        {#each allRooms as room}
          <option value={room.id}>{room.icon} {room.name}</option>
        {/each}
      </select>
    </div>
    
    <div class="filter-group">
      <select bind:value={sortBy}>
        <option value="updated">Last Updated</option>
        <option value="created">Date Created</option>
        <option value="name">Name</option>
        <option value="budget">Budget</option>
      </select>
    </div>
  </div>
  
  {#if filteredProjects.length > 0}
    <div class="projects-grid">
      {#each filteredProjects as project}
        <div
          class="project-card card"
          on:click={() => handleProjectClick(project)}
          role="button"
          tabindex="0"
        >
          {#if project.coverPhoto}
            <div class="project-cover">
              <img src={project.coverPhoto} alt={project.name} />
            </div>
          {/if}
          
          <div class="project-content">
            <div class="project-header">
              <h3>{project.name}</h3>
              <div class="project-actions">
                <button
                  class="action-btn"
                  on:click={(e) => handleProjectEdit(e, project)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  class="action-btn"
                  on:click={(e) => handleProjectDelete(e, project)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <p class="project-description">{project.description}</p>
            
            <div class="project-meta">
              <span
                class="status-badge"
                style="background: {getStatusColor(project.status)}"
              >
                {project.status}
              </span>
              {#if project.priority === 'high'}
                <span class="priority-indicator high">⚡ High Priority</span>
              {:else if project.priority === 'medium'}
                <span class="priority-indicator medium">🔸 Medium Priority</span>
              {/if}
            </div>
            
            <div class="project-budget">
              <div class="budget-info">
                <span>Budget: {formatCurrency(project.budget)}</span>
                <span>Spent: {formatCurrency(project.actualCost)}</span>
              </div>
              <div class="budget-progress">
                <div
                  class="budget-bar"
                  style="width: {getProgressPercentage(project)}%; background: {getProgressPercentage(project) > 90 ? 'var(--danger)' : 'var(--primary)'}"
                ></div>
              </div>
            </div>
            
            {#if project.tags.length > 0}
              <div class="project-tags">
                {#each project.tags as tag}
                  <span class="tag">#{tag}</span>
                {/each}
              </div>
            {/if}
            
            <div class="project-dates">
              <span>Started: {formatDate(project.startDate)}</span>
              {#if project.targetEndDate}
                <span>Target: {formatDate(project.targetEndDate)}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <h2>No projects found</h2>
      <p>Try adjusting your filters or create a new project.</p>
      <button class="btn-primary" on:click={() => dispatch('editProject', null)}>
        Create First Project
      </button>
    </div>
  {/if}
</div>

<style>
  .projects {
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
  
  .projects-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .filter-group {
    flex: 1;
    min-width: 200px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .project-card {
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    overflow: hidden;
  }
  
  .project-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  
  .project-cover {
    margin: -1.5rem -1.5rem 1rem -1.5rem;
    height: 150px;
    overflow: hidden;
  }
  
  .project-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .project-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .project-header h3 {
    flex: 1;
    margin: 0;
    font-size: 1.25rem;
  }
  
  .project-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .action-btn {
    background: none;
    padding: 0.25rem;
    font-size: 1rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .action-btn:hover {
    opacity: 1;
    transform: none;
    box-shadow: none;
  }
  
  .project-description {
    color: var(--gray-600);
    font-size: 0.95rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .project-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .status-badge {
    font-size: 0.75rem;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .priority-indicator {
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .priority-indicator.high {
    color: var(--danger);
  }
  
  .priority-indicator.medium {
    color: var(--warning);
  }
  
  .project-budget {
    margin-top: 0.5rem;
  }
  
  .budget-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .budget-progress {
    height: 6px;
    background: var(--gray-200);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .budget-bar {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .project-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tag {
    font-size: 0.75rem;
    color: var(--primary);
    background: rgba(59, 130, 246, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }
  
  .project-dates {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--gray-500);
    padding-top: 0.5rem;
    border-top: 1px solid var(--gray-200);
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
  }
  
  .empty-state h2 {
    color: var(--gray-700);
    margin-bottom: 0.5rem;
  }
  
  .empty-state p {
    color: var(--gray-500);
    margin-bottom: 2rem;
  }
  
  @media (max-width: 768px) {
    .projects-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .filters {
      flex-direction: column;
    }
    
    .filter-group {
      width: 100%;
    }
    
    .projects-grid {
      grid-template-columns: 1fr;
    }
  }
</style>