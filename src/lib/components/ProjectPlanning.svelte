<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../db/database';
  import type { Project, ProjectPhase, Task, Resource } from '../db/database';
  import GanttChart from './GanttChart.svelte';
  import CriticalPath from './CriticalPath.svelte';
  import ResourceAllocation from './ResourceAllocation.svelte';
  
  export let projectId: number;
  
  let project: Project | null = null;
  let phases: ProjectPhase[] = [];
  let tasks: Task[] = [];
  let resources: Resource[] = [];
  let activeTab: 'phases' | 'tasks' | 'gantt' | 'resources' | 'critical-path' = 'phases';
  
  let showPhaseForm = false;
  let showTaskForm = false;
  let editingPhase: ProjectPhase | null = null;
  let editingTask: Task | null = null;
  let selectedPhase: number | null = null;
  let selectedParentTask: number | null = null;
  
  let newPhase = {
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  };
  
  let newTask = {
    title: '',
    description: '',
    phaseId: null as number | null,
    parentTaskId: null as number | null,
    priority: 'medium' as 'low' | 'medium' | 'high',
    startDate: '',
    dueDate: '',
    estimatedHours: 0,
    assignedTo: '',
    milestone: false,
    deliverables: [] as string[],
    risks: [] as string[],
    dependencies: [] as number[]
  };
  
  onMount(async () => {
    await loadProjectData();
  });
  
  async function loadProjectData() {
    project = await db.projects.get(projectId);
    phases = await db.projectPhases
      .where('projectId')
      .equals(projectId)
      .sortBy('order');
    tasks = await db.tasks
      .where('projectId')
      .equals(projectId)
      .toArray();
    resources = await db.resources.toArray();
    
    // Build task hierarchy
    tasks = buildTaskHierarchy(tasks);
    
    // Calculate critical path
    calculateCriticalPath();
    
    // Update project completion
    updateProjectCompletion();
  }
  
  function buildTaskHierarchy(flatTasks: Task[]): Task[] {
    const taskMap = new Map<number, Task>();
    const rootTasks: Task[] = [];
    
    // First pass: create map
    flatTasks.forEach(task => {
      if (task.id) taskMap.set(task.id, { ...task, depth: 0 });
    });
    
    // Second pass: build hierarchy
    flatTasks.forEach(task => {
      if (task.parentTaskId && task.id) {
        const parent = taskMap.get(task.parentTaskId);
        if (parent) {
          const current = taskMap.get(task.id)!;
          current.depth = (parent.depth || 0) + 1;
        }
      } else {
        rootTasks.push(taskMap.get(task.id!)!);
      }
    });
    
    return Array.from(taskMap.values()).sort((a, b) => {
      if (a.phaseId !== b.phaseId) {
        return (a.phaseId || 0) - (b.phaseId || 0);
      }
      return a.order - b.order;
    });
  }
  
  function calculateCriticalPath() {
    // Implementation of CPM algorithm
    const taskMap = new Map(tasks.map(t => [t.id!, t]));
    
    // Forward pass - calculate early start/finish
    tasks.forEach(task => {
      if (!task.predecessors || task.predecessors.length === 0) {
        task.earlyStart = 0;
      } else {
        let maxEarlyFinish = 0;
        task.predecessors.forEach(predId => {
          const pred = taskMap.get(predId);
          if (pred && pred.earlyFinish) {
            maxEarlyFinish = Math.max(maxEarlyFinish, pred.earlyFinish);
          }
        });
        task.earlyStart = maxEarlyFinish;
      }
      task.earlyFinish = task.earlyStart + (task.estimatedHours || 0);
    });
    
    // Backward pass - calculate late start/finish
    const projectEnd = Math.max(...tasks.map(t => t.earlyFinish || 0));
    
    [...tasks].reverse().forEach(task => {
      if (!task.successors || task.successors.length === 0) {
        task.lateFinish = projectEnd;
      } else {
        let minLateStart = projectEnd;
        task.successors.forEach(succId => {
          const succ = taskMap.get(succId);
          if (succ && succ.lateStart !== undefined) {
            minLateStart = Math.min(minLateStart, succ.lateStart);
          }
        });
        task.lateFinish = minLateStart;
      }
      task.lateStart = task.lateFinish - (task.estimatedHours || 0);
      
      // Mark critical path
      task.criticalPath = task.earlyStart === task.lateStart;
    });
  }
  
  async function updateProjectCompletion() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    const criticalTasks = tasks.filter(t => t.criticalPath);
    const criticalPathLength = criticalTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    
    await db.projects.update(projectId, {
      completionPercentage,
      criticalPathLength,
      milestones: tasks.filter(t => t.milestone).length
    });
  }
  
  async function addPhase() {
    const order = phases.length;
    await db.projectPhases.add({
      projectId,
      name: newPhase.name,
      description: newPhase.description,
      order,
      startDate: new Date(newPhase.startDate),
      endDate: new Date(newPhase.endDate),
      status: 'pending',
      percentComplete: 0
    });
    
    newPhase = { name: '', description: '', startDate: '', endDate: '' };
    showPhaseForm = false;
    await loadProjectData();
  }
  
  async function addTask() {
    const order = tasks.filter(t => t.phaseId === newTask.phaseId).length;
    const depth = newTask.parentTaskId ? 
      (tasks.find(t => t.id === newTask.parentTaskId)?.depth || 0) + 1 : 0;
    
    await db.tasks.add({
      projectId,
      phaseId: newTask.phaseId || undefined,
      parentTaskId: newTask.parentTaskId || undefined,
      title: newTask.title,
      description: newTask.description,
      status: 'pending',
      priority: newTask.priority,
      startDate: newTask.startDate ? new Date(newTask.startDate) : undefined,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      estimatedHours: newTask.estimatedHours,
      assignedTo: newTask.assignedTo || undefined,
      percentComplete: 0,
      milestone: newTask.milestone,
      deliverables: newTask.deliverables.filter(d => d.trim()),
      risks: newTask.risks.filter(r => r.trim()),
      dependencies: newTask.dependencies,
      order,
      depth,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    resetTaskForm();
    await loadProjectData();
  }
  
  function resetTaskForm() {
    newTask = {
      title: '',
      description: '',
      phaseId: null,
      parentTaskId: null,
      priority: 'medium',
      startDate: '',
      dueDate: '',
      estimatedHours: 0,
      assignedTo: '',
      milestone: false,
      deliverables: [],
      risks: [],
      dependencies: []
    };
    showTaskForm = false;
  }
  
  async function updateTaskProgress(task: Task, progress: number) {
    await db.tasks.update(task.id!, {
      percentComplete: progress,
      status: progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending',
      completedAt: progress === 100 ? new Date() : undefined,
      updatedAt: new Date()
    });
    
    // Update phase progress
    if (task.phaseId) {
      const phaseTasks = tasks.filter(t => t.phaseId === task.phaseId);
      const phaseProgress = phaseTasks.reduce((sum, t) => sum + t.percentComplete, 0) / phaseTasks.length;
      await db.projectPhases.update(task.phaseId, {
        percentComplete: phaseProgress,
        status: phaseProgress === 100 ? 'completed' : phaseProgress > 0 ? 'active' : 'pending'
      });
    }
    
    await loadProjectData();
  }
  
  function addDeliverable() {
    newTask.deliverables = [...newTask.deliverables, ''];
  }
  
  function removeDeliverable(index: number) {
    newTask.deliverables = newTask.deliverables.filter((_, i) => i !== index);
  }
  
  function addRisk() {
    newTask.risks = [...newTask.risks, ''];
  }
  
  function removeRisk(index: number) {
    newTask.risks = newTask.risks.filter((_, i) => i !== index);
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  function getPhaseColor(phase: ProjectPhase): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[phase.order % colors.length];
  }
  
  function getTaskStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'blocked': return '🚫';
      default: return '⏳';
    }
  }
  
  $: phaseOptions = phases.map(p => ({ id: p.id!, name: p.name }));
  $: parentTaskOptions = tasks
    .filter(t => t.id !== editingTask?.id)
    .map(t => ({ 
      id: t.id!, 
      title: `${'  '.repeat(t.depth)}${t.title}` 
    }));
  $: availableDependencies = tasks
    .filter(t => t.id !== editingTask?.id && t.phaseId === newTask.phaseId)
    .map(t => ({ id: t.id!, title: t.title }));
</script>

<div class="project-planning">
  <div class="planning-header">
    <h2>📊 Project Planning</h2>
    <div class="header-stats">
      <div class="stat">
        <span class="label">Phases</span>
        <span class="value">{phases.length}</span>
      </div>
      <div class="stat">
        <span class="label">Tasks</span>
        <span class="value">{tasks.length}</span>
      </div>
      <div class="stat">
        <span class="label">Milestones</span>
        <span class="value">{tasks.filter(t => t.milestone).length}</span>
      </div>
      <div class="stat">
        <span class="label">Completion</span>
        <span class="value">{project?.completionPercentage.toFixed(0)}%</span>
      </div>
    </div>
  </div>
  
  <div class="planning-tabs">
    <button
      class="tab"
      class:active={activeTab === 'phases'}
      on:click={() => activeTab = 'phases'}
    >
      📅 Phases
    </button>
    <button
      class="tab"
      class:active={activeTab === 'tasks'}
      on:click={() => activeTab = 'tasks'}
    >
      📋 Tasks & Milestones
    </button>
    <button
      class="tab"
      class:active={activeTab === 'gantt'}
      on:click={() => activeTab = 'gantt'}
    >
      📊 Gantt Chart
    </button>
    <button
      class="tab"
      class:active={activeTab === 'resources'}
      on:click={() => activeTab = 'resources'}
    >
      👥 Resources
    </button>
    <button
      class="tab"
      class:active={activeTab === 'critical-path'}
      on:click={() => activeTab = 'critical-path'}
    >
      🎯 Critical Path
    </button>
  </div>
  
  <div class="planning-content">
    {#if activeTab === 'phases'}
      <div class="phases-section">
        <div class="section-header">
          <h3>Project Phases</h3>
          <button class="btn-primary" on:click={() => showPhaseForm = true}>
            + Add Phase
          </button>
        </div>
        
        {#if showPhaseForm}
          <div class="phase-form card">
            <h4>New Phase</h4>
            <form on:submit|preventDefault={addPhase}>
              <div class="form-group">
                <label for="phase-name">Phase Name</label>
                <input
                  id="phase-name"
                  type="text"
                  bind:value={newPhase.name}
                  placeholder="e.g., Planning & Design"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="phase-description">Description</label>
                <textarea
                  id="phase-description"
                  bind:value={newPhase.description}
                  rows="2"
                  placeholder="Phase objectives and deliverables"
                ></textarea>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="phase-start">Start Date</label>
                  <input
                    id="phase-start"
                    type="date"
                    bind:value={newPhase.startDate}
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="phase-end">End Date</label>
                  <input
                    id="phase-end"
                    type="date"
                    bind:value={newPhase.endDate}
                    required
                  />
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn-secondary" on:click={() => showPhaseForm = false}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary">
                  Add Phase
                </button>
              </div>
            </form>
          </div>
        {/if}
        
        <div class="phases-timeline">
          {#each phases as phase}
            <div 
              class="phase-card"
              style="border-left-color: {getPhaseColor(phase)}"
            >
              <div class="phase-header">
                <h4>{phase.name}</h4>
                <span class="phase-status status-{phase.status}">{phase.status}</span>
              </div>
              
              {#if phase.description}
                <p class="phase-description">{phase.description}</p>
              {/if}
              
              <div class="phase-dates">
                <span>{formatDate(phase.startDate)} - {formatDate(phase.endDate)}</span>
              </div>
              
              <div class="phase-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill"
                    style="width: {phase.percentComplete}%"
                  ></div>
                </div>
                <span class="progress-text">{phase.percentComplete.toFixed(0)}%</span>
              </div>
              
              <div class="phase-stats">
                <span>{tasks.filter(t => t.phaseId === phase.id).length} tasks</span>
                <span>{tasks.filter(t => t.phaseId === phase.id && t.milestone).length} milestones</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if activeTab === 'tasks'}
      <div class="tasks-section">
        <div class="section-header">
          <h3>Tasks & Milestones</h3>
          <button class="btn-primary" on:click={() => showTaskForm = true}>
            + Add Task
          </button>
        </div>
        
        {#if showTaskForm}
          <div class="task-form card">
            <h4>{editingTask ? 'Edit' : 'New'} Task</h4>
            <form on:submit|preventDefault={addTask}>
              <div class="form-group">
                <label for="task-title">Task Title</label>
                <input
                  id="task-title"
                  type="text"
                  bind:value={newTask.title}
                  placeholder="e.g., Install kitchen cabinets"
                  required
                />
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="task-phase">Phase</label>
                  <select id="task-phase" bind:value={newTask.phaseId}>
                    <option value={null}>No phase</option>
                    {#each phaseOptions as phase}
                      <option value={phase.id}>{phase.name}</option>
                    {/each}
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="task-parent">Parent Task</label>
                  <select id="task-parent" bind:value={newTask.parentTaskId}>
                    <option value={null}>None (Top-level)</option>
                    {#each parentTaskOptions as task}
                      <option value={task.id}>{task.title}</option>
                    {/each}
                  </select>
                </div>
              </div>
              
              <div class="form-group">
                <label for="task-description">Description</label>
                <textarea
                  id="task-description"
                  bind:value={newTask.description}
                  rows="3"
                  placeholder="Detailed task description and requirements"
                ></textarea>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="task-priority">Priority</label>
                  <select id="task-priority" bind:value={newTask.priority}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="task-hours">Est. Hours</label>
                  <input
                    id="task-hours"
                    type="number"
                    bind:value={newTask.estimatedHours}
                    min="0"
                    step="0.5"
                  />
                </div>
                
                <div class="form-group">
                  <label for="task-assigned">Assigned To</label>
                  <input
                    id="task-assigned"
                    type="text"
                    bind:value={newTask.assignedTo}
                    placeholder="Person/contractor"
                  />
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="task-start">Start Date</label>
                  <input
                    id="task-start"
                    type="date"
                    bind:value={newTask.startDate}
                  />
                </div>
                
                <div class="form-group">
                  <label for="task-due">Due Date</label>
                  <input
                    id="task-due"
                    type="date"
                    bind:value={newTask.dueDate}
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    bind:checked={newTask.milestone}
                  />
                  This is a milestone
                </label>
              </div>
              
              <div class="form-group">
                <label>Dependencies</label>
                <select 
                  multiple 
                  bind:value={newTask.dependencies}
                  class="multi-select"
                >
                  {#each availableDependencies as dep}
                    <option value={dep.id}>{dep.title}</option>
                  {/each}
                </select>
                <small>Hold Ctrl/Cmd to select multiple</small>
              </div>
              
              <div class="form-group">
                <label>Deliverables</label>
                {#each newTask.deliverables as deliverable, i}
                  <div class="list-item">
                    <input
                      type="text"
                      bind:value={newTask.deliverables[i]}
                      placeholder="Deliverable {i + 1}"
                    />
                    <button type="button" class="btn-danger small" on:click={() => removeDeliverable(i)}>
                      Remove
                    </button>
                  </div>
                {/each}
                <button type="button" class="btn-secondary small" on:click={addDeliverable}>
                  + Add Deliverable
                </button>
              </div>
              
              <div class="form-group">
                <label>Risks</label>
                {#each newTask.risks as risk, i}
                  <div class="list-item">
                    <input
                      type="text"
                      bind:value={newTask.risks[i]}
                      placeholder="Risk {i + 1}"
                    />
                    <button type="button" class="btn-danger small" on:click={() => removeRisk(i)}>
                      Remove
                    </button>
                  </div>
                {/each}
                <button type="button" class="btn-secondary small" on:click={addRisk}>
                  + Add Risk
                </button>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn-secondary" on:click={resetTaskForm}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary">
                  {editingTask ? 'Update' : 'Add'} Task
                </button>
              </div>
            </form>
          </div>
        {/if}
        
        <div class="tasks-list">
          {#each phases as phase}
            <div class="phase-section">
              <h4 style="color: {getPhaseColor(phase)}">{phase.name}</h4>
              <div class="tasks-tree">
                {#each tasks.filter(t => t.phaseId === phase.id) as task}
                  <div 
                    class="task-item"
                    class:milestone={task.milestone}
                    class:critical={task.criticalPath}
                    style="margin-left: {task.depth * 2}rem"
                  >
                    <div class="task-header">
                      <div class="task-title">
                        <span class="task-icon">
                          {task.milestone ? '🎯' : getTaskStatusIcon(task.status)}
                        </span>
                        <h5>{task.title}</h5>
                        {#if task.criticalPath}
                          <span class="critical-badge">Critical Path</span>
                        {/if}
                      </div>
                      <div class="task-actions">
                        <input
                          type="number"
                          value={task.percentComplete}
                          on:change={(e) => updateTaskProgress(task, parseInt(e.currentTarget.value))}
                          min="0"
                          max="100"
                          step="10"
                          class="progress-input"
                        />
                        <span>%</span>
                      </div>
                    </div>
                    
                    {#if task.description}
                      <p class="task-description">{task.description}</p>
                    {/if}
                    
                    <div class="task-meta">
                      {#if task.assignedTo}
                        <span class="meta-item">👤 {task.assignedTo}</span>
                      {/if}
                      {#if task.estimatedHours}
                        <span class="meta-item">⏱️ {task.estimatedHours}h</span>
                      {/if}
                      {#if task.dueDate}
                        <span class="meta-item">📅 {formatDate(task.dueDate)}</span>
                      {/if}
                      <span class="meta-item priority-{task.priority}">
                        {task.priority} priority
                      </span>
                    </div>
                    
                    {#if task.deliverables && task.deliverables.length > 0}
                      <div class="task-deliverables">
                        <strong>Deliverables:</strong>
                        <ul>
                          {#each task.deliverables as deliverable}
                            <li>{deliverable}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                    
                    {#if task.risks && task.risks.length > 0}
                      <div class="task-risks">
                        <strong>Risks:</strong>
                        <ul>
                          {#each task.risks as risk}
                            <li class="risk-item">⚠️ {risk}</li>
                          {/each}
                        </ul>
                      </div>
                    {/if}
                    
                    <div class="task-progress">
                      <div class="progress-bar">
                        <div 
                          class="progress-fill"
                          style="width: {task.percentComplete}%"
                        ></div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
          
          {#if tasks.filter(t => !t.phaseId).length > 0}
            <div class="phase-section">
              <h4>Unassigned Tasks</h4>
              <div class="tasks-tree">
                {#each tasks.filter(t => !t.phaseId) as task}
                  <div 
                    class="task-item"
                    class:milestone={task.milestone}
                    style="margin-left: {task.depth * 2}rem"
                  >
                    <!-- Same task structure as above -->
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    {#if activeTab === 'gantt'}
      <GanttChart {phases} {tasks} />
    {/if}
    
    {#if activeTab === 'resources'}
      <ResourceAllocation {projectId} {tasks} {resources} />
    {/if}
    
    {#if activeTab === 'critical-path'}
      <CriticalPath {tasks} />
    {/if}
  </div>
</div>

<style>
  .project-planning {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .planning-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .header-stats {
    display: flex;
    gap: 2rem;
  }
  
  .stat {
    text-align: center;
  }
  
  .stat .label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .stat .value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
  }
  
  .planning-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--gray-200);
    overflow-x: auto;
  }
  
  .tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--gray-600);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .tab:hover {
    color: var(--primary);
    background: var(--gray-50);
  }
  
  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  
  .planning-content {
    background: white;
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow);
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .section-header h3 {
    margin: 0;
  }
  
  /* Phases Styles */
  .phases-timeline {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .phase-card {
    border: 1px solid var(--gray-200);
    border-left: 4px solid;
    border-radius: var(--radius);
    padding: 1.5rem;
    background: var(--gray-50);
  }
  
  .phase-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .phase-header h4 {
    margin: 0;
  }
  
  .phase-status {
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .phase-status.status-pending {
    background: var(--gray-200);
    color: var(--gray-700);
  }
  
  .phase-status.status-active {
    background: rgba(59, 130, 246, 0.1);
    color: var(--primary);
  }
  
  .phase-status.status-completed {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }
  
  .phase-description {
    color: var(--gray-600);
    margin: 0.5rem 0;
  }
  
  .phase-dates {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: 1rem;
  }
  
  .phase-progress {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .progress-bar {
    flex: 1;
    height: 8px;
    background: var(--gray-200);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s ease;
  }
  
  .progress-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
  }
  
  .phase-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  /* Tasks Styles */
  .phase-section {
    margin-bottom: 2rem;
  }
  
  .phase-section h4 {
    margin-bottom: 1rem;
  }
  
  .tasks-tree {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .task-item {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    padding: 1rem;
    background: white;
    transition: all 0.2s;
  }
  
  .task-item:hover {
    box-shadow: var(--shadow);
  }
  
  .task-item.milestone {
    border-color: var(--warning);
    background: rgba(245, 158, 11, 0.05);
  }
  
  .task-item.critical {
    border-color: var(--danger);
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .task-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .task-title h5 {
    margin: 0;
    font-size: 1rem;
  }
  
  .task-icon {
    font-size: 1.25rem;
  }
  
  .critical-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--danger);
    color: white;
    border-radius: 999px;
  }
  
  .task-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .progress-input {
    width: 60px;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .task-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0 0 0.75rem;
  }
  
  .task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }
  
  .meta-item {
    color: var(--gray-600);
  }
  
  .priority-high {
    color: var(--danger);
    font-weight: 600;
  }
  
  .priority-medium {
    color: var(--warning);
  }
  
  .priority-low {
    color: var(--gray-500);
  }
  
  .task-deliverables,
  .task-risks {
    margin: 0.75rem 0;
    font-size: 0.875rem;
  }
  
  .task-deliverables strong,
  .task-risks strong {
    color: var(--gray-700);
  }
  
  .task-deliverables ul,
  .task-risks ul {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }
  
  .risk-item {
    color: var(--warning);
  }
  
  .task-progress {
    margin-top: 0.75rem;
  }
  
  /* Form Styles */
  .phase-form,
  .task-form {
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
  .form-group textarea,
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
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }
  
  .multi-select {
    min-height: 100px;
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
    .planning-tabs {
      justify-content: flex-start;
    }
    
    .planning-content {
      padding: 1rem;
    }
    
    .task-item {
      margin-left: 0 !important;
    }
  }
</style>