<script lang="ts">
  import { onMount } from 'svelte';
  import { projects } from '../stores';
  import { createEventDispatcher } from 'svelte';
  import type { Project } from '../db/database';
  
  const dispatch = createEventDispatcher();
  
  let allProjects: Project[] = [];
  let filteredProjects: Project[] = [];
  let selectedStatus = 'all';
  let selectedType = 'all';
  let searchTerm = '';
  let sortBy = 'updated';
  let viewMode: 'grid' | 'table' = 'grid';
  
  onMount(async () => {
    await projects.load();
  });
  
  projects.subscribe(p => {
    allProjects = p;
    filterProjects();
  });
  
  function filterProjects() {
    filteredProjects = allProjects.filter(project => {
      if (selectedStatus !== 'all' && project.status !== selectedStatus) return false;
      if (selectedType !== 'all' && project.type !== selectedType) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!project.name.toLowerCase().includes(search) &&
            !project.projectNumber?.toLowerCase().includes(search) &&
            !project.owner?.toLowerCase().includes(search) &&
            !project.city?.toLowerCase().includes(search)) return false;
      }
      return true;
    });
    
    // Sort projects
    filteredProjects.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'budget':
          return b.budget - a.budget;
        case 'start':
          return b.startDate.getTime() - a.startDate.getTime();
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
    if (confirm(`Are you sure you want to delete "${project.name}"? This will also delete all related data.`)) {
      await projects.delete(project.id || 0);
    }
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
  
  function getDaysRemaining(project: Project): number {
    if (!project.targetEndDate) return 0;
    const today = new Date();
    const target = new Date(project.targetEndDate);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  $: projectTypes = [...new Set(allProjects.map(p => p.type).filter(Boolean))];
  
  $: activeProjectsCount = allProjects.filter(p => p.status === 'active').length;
  $: totalContractValue = allProjects.reduce((sum, p) => sum + p.budget, 0);
  $: totalActualCost = allProjects.reduce((sum, p) => sum + p.actualCost, 0);
</script>

<div class="projects-view">
  <div class="view-header">
    <div class="filters">
      <input
        type="text"
        placeholder="Search projects, locations, owners..."
        bind:value={searchTerm}
        on:input={filterProjects}
        class="search-input"
      />
      
      <select bind:value={selectedStatus} on:change={filterProjects}>
        <option value="all">All Status</option>
        <option value="planning">Pre-Construction</option>
        <option value="active">Active</option>
        <option value="paused">On Hold</option>
        <option value="completed">Completed</option>
      </select>
      
      <select bind:value={selectedType} on:change={filterProjects}>
        <option value="all">All Types</option>
        {#each projectTypes as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
      
      <select bind:value={sortBy} on:change={filterProjects}>
        <option value="updated">Recently Updated</option>
        <option value="name">Name</option>
        <option value="budget">Contract Value</option>
        <option value="start">Start Date</option>
      </select>
    </div>
    
    <div class="view-controls">
      <button 
        class="view-toggle" 
        class:active={viewMode === 'grid'}
        on:click={() => viewMode = 'grid'}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="6" height="6" rx="1"/>
          <rect x="12" y="2" width="6" height="6" rx="1"/>
          <rect x="2" y="12" width="6" height="6" rx="1"/>
          <rect x="12" y="12" width="6" height="6" rx="1"/>
        </svg>
      </button>
      <button 
        class="view-toggle"
        class:active={viewMode === 'table'}
        on:click={() => viewMode = 'table'}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="4" width="16" height="2" rx="1"/>
          <rect x="2" y="9" width="16" height="2" rx="1"/>
          <rect x="2" y="14" width="16" height="2" rx="1"/>
        </svg>
      </button>
    </div>
  </div>
  
  <div class="projects-stats">
    <div class="stat-card">
      <div class="stat-icon">🏗️</div>
      <div class="stat-content">
        <div class="stat-label">Active Projects</div>
        <div class="stat-value">{activeProjectsCount}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-content">
        <div class="stat-label">Total Contract Value</div>
        <div class="stat-value">{formatCurrency(totalContractValue)}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-content">
        <div class="stat-label">Total Actual Cost</div>
        <div class="stat-value">{formatCurrency(totalActualCost)}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">📈</div>
      <div class="stat-content">
        <div class="stat-label">Cost Performance</div>
        <div class="stat-value">{totalContractValue ? Math.round((totalActualCost / totalContractValue) * 100) : 0}%</div>
      </div>
    </div>
  </div>
  
  {#if viewMode === 'grid'}
    <div class="projects-grid">
      {#each filteredProjects as project}
        <div
          class="project-card"
          on:click={() => handleProjectClick(project)}
          role="button"
          tabindex="0"
        >
          <div class="project-header">
            <div class="project-title">
              <h3>{project.name}</h3>
              <span class="project-number">#{project.projectNumber || 'N/A'}</span>
            </div>
            <div class="project-actions">
              <button on:click={e => handleProjectEdit(e, project)} title="Edit">
                ✏️
              </button>
              <button on:click={e => handleProjectDelete(e, project)} title="Delete">
                🗑️
              </button>
            </div>
          </div>
          
          <div class="project-info">
            <div class="info-row">
              <span class="label">Owner:</span>
              <span class="value">{project.owner || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Location:</span>
              <span class="value">{project.city ? `${project.city}, ${project.state}` : 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Type:</span>
              <span class="value">{project.type || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">PM:</span>
              <span class="value">{project.projectManager || 'N/A'}</span>
            </div>
          </div>
          
          <div class="project-metrics">
            <div class="metric">
              <span class="metric-label">Contract</span>
              <span class="metric-value">{formatCurrency(project.budget)}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Progress</span>
              <span class="metric-value">{project.completionPercentage || 0}%</span>
            </div>
            {#if project.targetEndDate}
              <div class="metric">
                <span class="metric-label">Days Left</span>
                <span class="metric-value" class:alert={getDaysRemaining(project) < 30}>
                  {getDaysRemaining(project)}
                </span>
              </div>
            {/if}
          </div>
          
          <div class="project-footer">
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
      {/each}
    </div>
  {:else}
    <div class="projects-table">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Location</th>
            <th>Owner</th>
            <th>Contract Value</th>
            <th>Progress</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredProjects as project}
            <tr on:click={() => handleProjectClick(project)}>
              <td>
                <div class="project-name">
                  <strong>{project.name}</strong>
                  <span class="project-number">#{project.projectNumber || 'N/A'}</span>
                </div>
              </td>
              <td>{project.city ? `${project.city}, ${project.state}` : 'N/A'}</td>
              <td>{project.owner || 'N/A'}</td>
              <td class="number">{formatCurrency(project.budget)}</td>
              <td>
                <div class="progress-cell">
                  <div class="progress-bar">
                    <div 
                      class="progress-fill"
                      style="width: {project.completionPercentage || 0}%"
                    ></div>
                  </div>
                  <span>{project.completionPercentage || 0}%</span>
                </div>
              </td>
              <td>
                <div class="schedule-info">
                  <span>{formatDate(project.startDate)}</span>
                  {#if project.targetEndDate}
                    <span>→ {formatDate(project.targetEndDate)}</span>
                  {/if}
                </div>
              </td>
              <td>
                <span 
                  class="status-badge"
                  style="background: {getStatusColor(project.status)}"
                >
                  {project.status}
                </span>
              </td>
              <td class="actions">
                <button on:click={e => handleProjectEdit(e, project)} title="Edit">
                  ✏️
                </button>
                <button on:click={e => handleProjectDelete(e, project)} title="Delete">
                  🗑️
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  
  {#if filteredProjects.length === 0}
    <div class="empty-state">
      <h3>No projects found</h3>
      <p>Try adjusting your filters or create a new project</p>
    </div>
  {/if}
</div>

<style>
  .projects-view {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .filters {
    display: flex;
    gap: 1rem;
    flex: 1;
  }
  
  .search-input {
    flex: 1;
    max-width: 400px;
  }
  
  .filters select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
  }
  
  .view-controls {
    display: flex;
    gap: 0.25rem;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.375rem;
  }
  
  .view-toggle {
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }
  
  .view-toggle:hover {
    background: #e5e7eb;
  }
  
  .view-toggle.active {
    background: white;
    color: #1f2937;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .projects-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .stat-icon {
    font-size: 2.5rem;
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 0.5rem;
  }
  
  .stat-content {
    flex: 1;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
  }
  
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .project-card {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .project-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  
  .project-title h3 {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
  }
  
  .project-number {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 600;
  }
  
  .project-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .project-actions button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.125rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  
  .project-actions button:hover {
    opacity: 1;
  }
  
  .project-info {
    margin-bottom: 1rem;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .info-row .label {
    color: #6b7280;
  }
  
  .info-row .value {
    color: #1f2937;
    font-weight: 500;
  }
  
  .project-metrics {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1rem;
  }
  
  .metric {
    text-align: center;
  }
  
  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }
  
  .metric-value {
    display: block;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }
  
  .metric-value.alert {
    color: #ef4444;
  }
  
  .project-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .status-badge {
    font-size: 0.75rem;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .priority-badge {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .priority-high {
    color: #ef4444;
  }
  
  .priority-medium {
    color: #f59e0b;
  }
  
  .priority-low {
    color: #6b7280;
  }
  
  .projects-table {
    background: white;
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }
  
  tbody tr {
    cursor: pointer;
    transition: background 0.2s;
  }
  
  tbody tr:hover {
    background: #f9fafb;
  }
  
  .project-name {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .number {
    text-align: right;
    font-weight: 600;
  }
  
  .progress-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .progress-bar {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s;
  }
  
  .schedule-info {
    display: flex;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .actions {
    text-align: right;
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #6b7280;
  }
  
  .empty-state h3 {
    margin-bottom: 0.5rem;
    color: #374151;
  }
  
  @media (max-width: 768px) {
    .view-header {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filters {
      flex-wrap: wrap;
    }
    
    .projects-grid {
      grid-template-columns: 1fr;
    }
    
    .projects-table {
      overflow-x: auto;
    }
  }
</style>