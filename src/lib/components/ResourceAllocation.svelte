<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../db/database';
  import type { Task, Resource, TaskResource } from '../db/database';
  
  export let projectId: number;
  export let tasks: Task[];
  export let resources: Resource[];
  
  let taskResources: TaskResource[] = [];
  let showResourceForm = false;
  let selectedResource: Resource | null = null;
  let selectedTask: Task | null = null;
  let allocationView: 'timeline' | 'grid' | 'workload' = 'grid';
  
  let newResource = {
    name: '',
    type: 'person' as 'person' | 'equipment' | 'material',
    availability: 8,
    cost: 0,
    skills: [] as string[]
  };
  
  let newAllocation = {
    taskId: null as number | null,
    resourceId: null as number | null,
    hours: 0,
    startDate: '',
    endDate: ''
  };
  
  onMount(async () => {
    await loadResourceData();
  });
  
  async function loadResourceData() {
    resources = await db.resources.toArray();
    taskResources = await db.taskResources.toArray();
  }
  
  async function addResource() {
    await db.resources.add({
      name: newResource.name,
      type: newResource.type,
      availability: newResource.availability,
      cost: newResource.cost || undefined,
      skills: newResource.skills.filter(s => s.trim())
    });
    
    newResource = {
      name: '',
      type: 'person',
      availability: 8,
      cost: 0,
      skills: []
    };
    showResourceForm = false;
    await loadResourceData();
  }
  
  async function allocateResource() {
    if (!newAllocation.taskId || !newAllocation.resourceId) return;
    
    await db.taskResources.add({
      taskId: newAllocation.taskId,
      resourceId: newAllocation.resourceId,
      hours: newAllocation.hours,
      startDate: new Date(newAllocation.startDate),
      endDate: new Date(newAllocation.endDate)
    });
    
    newAllocation = {
      taskId: null,
      resourceId: null,
      hours: 0,
      startDate: '',
      endDate: ''
    };
    await loadResourceData();
  }
  
  function getTaskAllocations(taskId: number): (TaskResource & { resource: Resource })[] {
    return taskResources
      .filter(tr => tr.taskId === taskId)
      .map(tr => ({
        ...tr,
        resource: resources.find(r => r.id === tr.resourceId)!
      }))
      .filter(tr => tr.resource);
  }
  
  function getResourceWorkload(resourceId: number): number {
    const allocations = taskResources.filter(tr => tr.resourceId === resourceId);
    const totalHours = allocations.reduce((sum, tr) => sum + tr.hours, 0);
    const resource = resources.find(r => r.id === resourceId);
    return resource ? (totalHours / (resource.availability * 20)) * 100 : 0; // Assuming 20 work days
  }
  
  function getResourceUtilization(resourceId: number, date: Date): number {
    const dayAllocations = taskResources.filter(tr => {
      return tr.resourceId === resourceId &&
        date >= tr.startDate &&
        date <= tr.endDate;
    });
    
    const dailyHours = dayAllocations.reduce((sum, tr) => {
      const days = Math.ceil((tr.endDate.getTime() - tr.startDate.getTime()) / (24 * 60 * 60 * 1000));
      return sum + (tr.hours / days);
    }, 0);
    
    const resource = resources.find(r => r.id === resourceId);
    return resource ? (dailyHours / resource.availability) * 100 : 0;
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
      day: 'numeric'
    }).format(date);
  }
  
  function addSkill() {
    newResource.skills = [...newResource.skills, ''];
  }
  
  function removeSkill(index: number) {
    newResource.skills = newResource.skills.filter((_, i) => i !== index);
  }
  
  function getResourceIcon(type: string): string {
    switch (type) {
      case 'person': return '👤';
      case 'equipment': return '🔧';
      case 'material': return '📦';
      default: return '📌';
    }
  }
  
  $: totalResourceCost = resources.reduce((sum, r) => {
    const allocations = taskResources.filter(tr => tr.resourceId === r.id);
    const totalHours = allocations.reduce((s, tr) => s + tr.hours, 0);
    return sum + (totalHours * (r.cost || 0));
  }, 0);
  
  $: overallocatedResources = resources.filter(r => getResourceWorkload(r.id!) > 100);
</script>

<div class="resource-allocation">
  <div class="allocation-header">
    <h3>👥 Resource Management</h3>
    <div class="header-actions">
      <button class="btn-secondary" on:click={() => showResourceForm = !showResourceForm}>
        + Add Resource
      </button>
    </div>
  </div>
  
  <div class="allocation-stats">
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-content">
        <div class="stat-label">Total Resources</div>
        <div class="stat-value">{resources.length}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-content">
        <div class="stat-label">Resource Cost</div>
        <div class="stat-value">{formatCurrency(totalResourceCost)}</div>
      </div>
    </div>
    
    <div class="stat-card {overallocatedResources.length > 0 ? 'alert' : ''}">
      <div class="stat-icon">⚠️</div>
      <div class="stat-content">
        <div class="stat-label">Overallocated</div>
        <div class="stat-value">{overallocatedResources.length}</div>
      </div>
    </div>
  </div>
  
  {#if showResourceForm}
    <div class="resource-form card">
      <h4>Add New Resource</h4>
      <form on:submit|preventDefault={addResource}>
        <div class="form-row">
          <div class="form-group">
            <label for="resource-name">Name</label>
            <input
              id="resource-name"
              type="text"
              bind:value={newResource.name}
              placeholder="e.g., John Smith, Excavator"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="resource-type">Type</label>
            <select id="resource-type" bind:value={newResource.type}>
              <option value="person">Person</option>
              <option value="equipment">Equipment</option>
              <option value="material">Material</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="resource-availability">Availability (hours/day)</label>
            <input
              id="resource-availability"
              type="number"
              bind:value={newResource.availability}
              min="1"
              max="24"
              step="0.5"
            />
          </div>
          
          <div class="form-group">
            <label for="resource-cost">Cost (per hour)</label>
            <input
              id="resource-cost"
              type="number"
              bind:value={newResource.cost}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        
        {#if newResource.type === 'person'}
          <div class="form-group">
            <label>Skills</label>
            {#each newResource.skills as skill, i}
              <div class="list-item">
                <input
                  type="text"
                  bind:value={newResource.skills[i]}
                  placeholder="Skill {i + 1}"
                />
                <button type="button" class="btn-danger small" on:click={() => removeSkill(i)}>
                  Remove
                </button>
              </div>
            {/each}
            <button type="button" class="btn-secondary small" on:click={addSkill}>
              + Add Skill
            </button>
          </div>
        {/if}
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => showResourceForm = false}>
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Resource
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  <div class="allocation-tabs">
    <button
      class="tab"
      class:active={allocationView === 'grid'}
      on:click={() => allocationView = 'grid'}
    >
      Grid View
    </button>
    <button
      class="tab"
      class:active={allocationView === 'timeline'}
      on:click={() => allocationView = 'timeline'}
    >
      Timeline
    </button>
    <button
      class="tab"
      class:active={allocationView === 'workload'}
      on:click={() => allocationView = 'workload'}
    >
      Workload
    </button>
  </div>
  
  <div class="allocation-content">
    {#if allocationView === 'grid'}
      <div class="allocation-grid">
        <h4>Task Assignments</h4>
        <div class="tasks-grid">
          {#each tasks as task}
            {@const allocations = getTaskAllocations(task.id || 0)}
            <div class="task-allocation-card">
              <div class="task-header">
                <h5>{task.title}</h5>
                {#if task.estimatedHours}
                  <span class="hours-badge">{task.estimatedHours}h</span>
                {/if}
              </div>
              
              {#if allocations.length > 0}
                <div class="allocations-list">
                  {#each allocations as allocation}
                    <div class="allocation-item">
                      <span class="resource-name">
                        {getResourceIcon(allocation.resource.type)} {allocation.resource.name}
                      </span>
                      <span class="allocation-hours">{allocation.hours}h</span>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="no-allocation">No resources assigned</p>
              {/if}
              
              <button class="btn-secondary small" on:click={() => selectedTask = task}>
                Assign Resource
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if allocationView === 'workload'}
      <div class="workload-view">
        <h4>Resource Workload</h4>
        <div class="resources-list">
          {#each resources as resource}
            {@const workload = getResourceWorkload(resource.id || 0)}
            <div class="resource-card">
              <div class="resource-header">
                <div class="resource-info">
                  <span class="resource-icon">{getResourceIcon(resource.type)}</span>
                  <div>
                    <h5>{resource.name}</h5>
                    <span class="resource-meta">
                      {resource.availability}h/day • {resource.cost ? formatCurrency(resource.cost) + '/h' : 'No cost'}
                    </span>
                  </div>
                </div>
                <div class="workload-indicator" class:overloaded={workload > 100}>
                  {workload.toFixed(0)}%
                </div>
              </div>
              
              {#if resource.skills && resource.skills.length > 0}
                <div class="skills-list">
                  {#each resource.skills as skill}
                    <span class="skill-badge">{skill}</span>
                  {/each}
                </div>
              {/if}
              
              <div class="workload-bar">
                <div 
                  class="workload-fill"
                  class:warning={workload > 80}
                  class:danger={workload > 100}
                  style="width: {Math.min(100, workload)}%"
                ></div>
              </div>
              
              <div class="resource-tasks">
                <h6>Assigned Tasks:</h6>
                {#each taskResources.filter(tr => tr.resourceId === resource.id) as tr}
                  {@const task = tasks.find(t => t.id === tr.taskId)}
                  {#if task}
                    <div class="assigned-task">
                      <span>{task.title}</span>
                      <span class="task-hours">{tr.hours}h</span>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  
  {#if selectedTask}
    <div class="modal-overlay" on:click={() => selectedTask = null}>
      <div class="modal-content" on:click|stopPropagation>
        <h3>Assign Resource to: {selectedTask.title}</h3>
        <form on:submit|preventDefault={allocateResource}>
          <div class="form-group">
            <label for="allocation-resource">Resource</label>
            <select 
              id="allocation-resource" 
              bind:value={newAllocation.resourceId}
              required
            >
              <option value={null}>Select a resource</option>
              {#each resources as resource}
                <option value={resource.id}>
                  {getResourceIcon(resource.type)} {resource.name}
                </option>
              {/each}
            </select>
          </div>
          
          <div class="form-group">
            <label for="allocation-hours">Hours</label>
            <input
              id="allocation-hours"
              type="number"
              bind:value={newAllocation.hours}
              min="1"
              max={selectedTask.estimatedHours || 100}
              required
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="allocation-start">Start Date</label>
              <input
                id="allocation-start"
                type="date"
                bind:value={newAllocation.startDate}
                required
              />
            </div>
            
            <div class="form-group">
              <label for="allocation-end">End Date</label>
              <input
                id="allocation-end"
                type="date"
                bind:value={newAllocation.endDate}
                required
              />
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" on:click={() => selectedTask = null}>
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .resource-allocation {
    padding: 1rem;
  }
  
  .allocation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .allocation-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .stat-card.alert {
    border: 2px solid var(--danger);
  }
  
  .stat-icon {
    font-size: 2.5rem;
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-100);
    border-radius: var(--radius);
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
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--gray-900);
  }
  
  .resource-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--gray-700);
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    font-size: 1rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .list-item {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .list-item input {
    flex: 1;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  .allocation-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }
  
  .tab {
    padding: 0.5rem 1rem;
    background: var(--gray-100);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tab:hover {
    background: var(--gray-200);
  }
  
  .tab.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
  
  .allocation-content {
    background: white;
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow);
  }
  
  .tasks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }
  
  .task-allocation-card {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    padding: 1rem;
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .task-header h5 {
    margin: 0;
    font-size: 1rem;
  }
  
  .hours-badge {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    background: var(--gray-100);
    border-radius: var(--radius-sm);
  }
  
  .allocations-list {
    margin-bottom: 1rem;
  }
  
  .allocation-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--gray-100);
  }
  
  .resource-name {
    font-size: 0.875rem;
  }
  
  .allocation-hours {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
  }
  
  .no-allocation {
    font-size: 0.875rem;
    color: var(--gray-500);
    text-align: center;
    margin: 1rem 0;
  }
  
  .resources-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }
  
  .resource-card {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    padding: 1.5rem;
  }
  
  .resource-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .resource-info {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .resource-icon {
    font-size: 2rem;
  }
  
  .resource-info h5 {
    margin: 0;
  }
  
  .resource-meta {
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .workload-indicator {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--secondary);
  }
  
  .workload-indicator.overloaded {
    color: var(--danger);
  }
  
  .skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .skill-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--gray-100);
    border-radius: var(--radius-sm);
  }
  
  .workload-bar {
    height: 8px;
    background: var(--gray-200);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 1rem;
  }
  
  .workload-fill {
    height: 100%;
    background: var(--secondary);
    transition: width 0.3s ease;
  }
  
  .workload-fill.warning {
    background: var(--warning);
  }
  
  .workload-fill.danger {
    background: var(--danger);
  }
  
  .resource-tasks h6 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: var(--gray-700);
  }
  
  .assigned-task {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    padding: 0.25rem 0;
  }
  
  .task-hours {
    font-weight: 600;
    color: var(--gray-700);
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: var(--radius-lg);
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .btn-primary {
    background: var(--primary);
    color: white;
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary:hover {
    background: #2563eb;
  }
  
  .btn-secondary {
    background: var(--gray-100);
    color: var(--gray-700);
    padding: 0.5rem 1.25rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: var(--gray-200);
  }
  
  .btn-danger {
    background: var(--danger);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-danger:hover {
    background: #dc2626;
  }
  
  .btn-danger.small,
  .btn-secondary.small {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
  
  @media (max-width: 768px) {
    .allocation-stats {
      grid-template-columns: 1fr;
    }
    
    .tasks-grid,
    .resources-list {
      grid-template-columns: 1fr;
    }
  }
</style>