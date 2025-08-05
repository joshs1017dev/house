<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { tasks } from '../stores/tasks';
  import type { Task } from '../db/database';
  import Sortable from 'sortablejs';
  import { format, formatDistanceToNow } from 'date-fns';
  
  export let projectId: number;
  
  const dispatch = createEventDispatcher();
  
  let taskList: HTMLElement;
  let sortable: Sortable;
  let showNewTaskForm = false;
  let newTask = {
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    estimatedHours: 0
  };
  let editingTaskId: number | null = null;
  let editTask: Partial<Task> = {};
  
  $: pendingTasks = $tasks.filter(t => t.status === 'pending');
  $: inProgressTasks = $tasks.filter(t => t.status === 'in-progress');
  $: completedTasks = $tasks.filter(t => t.status === 'completed');
  $: blockedTasks = $tasks.filter(t => t.status === 'blocked');
  
  onMount(async () => {
    await tasks.loadByProject(projectId);
    
    if (taskList) {
      sortable = Sortable.create(taskList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: handleSort
      });
    }
  });
  
  onDestroy(() => {
    if (sortable) {
      sortable.destroy();
    }
  });
  
  async function handleSort(event: any) {
    const taskElements = event.to.children;
    const taskIds = Array.from(taskElements).map((el: any) => 
      parseInt(el.dataset.taskId)
    );
    await tasks.updateOrder(taskIds);
  }
  
  async function addTask() {
    if (!newTask.title.trim()) return;
    
    await tasks.add({
      projectId,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: 'pending',
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      estimatedHours: newTask.estimatedHours || undefined
    });
    
    newTask = {
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      estimatedHours: 0
    };
    showNewTaskForm = false;
    dispatch('update');
  }
  
  async function toggleTaskStatus(task: Task) {
    await tasks.toggleStatus(task.id!);
    dispatch('update');
  }
  
  async function updateTaskStatus(taskId: number, status: Task['status']) {
    await tasks.update(taskId, { status });
    dispatch('update');
  }
  
  async function deleteTask(taskId: number) {
    if (confirm('Are you sure you want to delete this task?')) {
      await tasks.delete(taskId);
      dispatch('update');
    }
  }
  
  function startEdit(task: Task) {
    editingTaskId = task.id!;
    editTask = { ...task };
  }
  
  function cancelEdit() {
    editingTaskId = null;
    editTask = {};
  }
  
  async function saveEdit() {
    if (!editTask.title?.trim()) return;
    
    await tasks.update(editingTaskId!, {
      title: editTask.title.trim(),
      description: editTask.description?.trim(),
      priority: editTask.priority,
      dueDate: editTask.dueDate,
      estimatedHours: editTask.estimatedHours
    });
    
    editingTaskId = null;
    editTask = {};
    dispatch('update');
  }
  
  function getPriorityColor(priority: Task['priority']) {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'primary';
    }
  }
  
  function getStatusIcon(status: Task['status']) {
    switch (status) {
      case 'pending': return '⏳';
      case 'in-progress': return '🔄';
      case 'completed': return '✅';
      case 'blocked': return '🚫';
    }
  }
</script>

<div class="task-manager">
  <div class="task-header">
    <h3>Tasks</h3>
    <button on:click={() => showNewTaskForm = true}>
      ➕ Add Task
    </button>
  </div>
  
  {#if showNewTaskForm}
    <div class="new-task-form card">
      <h4>New Task</h4>
      <form on:submit|preventDefault={addTask}>
        <div class="form-group">
          <input
            type="text"
            bind:value={newTask.title}
            placeholder="Task title *"
            required
          />
        </div>
        
        <div class="form-group">
          <textarea
            bind:value={newTask.description}
            placeholder="Description (optional)"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Priority</label>
            <select bind:value={newTask.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Due Date</label>
            <input
              type="date"
              bind:value={newTask.dueDate}
            />
          </div>
          
          <div class="form-group">
            <label>Est. Hours</label>
            <input
              type="number"
              bind:value={newTask.estimatedHours}
              min="0"
              step="0.5"
              placeholder="0"
            />
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="secondary" on:click={() => showNewTaskForm = false}>
            Cancel
          </button>
          <button type="submit">
            Add Task
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  <div class="task-sections">
    <div class="task-section">
      <h4>
        <span>{getStatusIcon('pending')}</span>
        Pending ({pendingTasks.length})
      </h4>
      <div class="task-list" bind:this={taskList}>
        {#each pendingTasks as task (task.id)}
          <div class="task-item" data-task-id={task.id}>
            {#if editingTaskId === task.id}
              <div class="edit-task-form">
                <input
                  type="text"
                  bind:value={editTask.title}
                  placeholder="Task title"
                />
                <textarea
                  bind:value={editTask.description}
                  placeholder="Description"
                  rows="2"
                ></textarea>
                <div class="edit-row">
                  <select bind:value={editTask.priority}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="date"
                    bind:value={editTask.dueDate}
                  />
                  <input
                    type="number"
                    bind:value={editTask.estimatedHours}
                    min="0"
                    step="0.5"
                    placeholder="Hours"
                  />
                </div>
                <div class="edit-actions">
                  <button class="secondary small" on:click={cancelEdit}>Cancel</button>
                  <button class="small" on:click={saveEdit}>Save</button>
                </div>
              </div>
            {:else}
              <div class="drag-handle">⋮⋮</div>
              <div class="task-content">
                <div class="task-title">{task.title}</div>
                {#if task.description}
                  <div class="task-description">{task.description}</div>
                {/if}
                <div class="task-meta">
                  <span class="badge {getPriorityColor(task.priority)}">{task.priority}</span>
                  {#if task.dueDate}
                    <span class="due-date">📅 {format(task.dueDate, 'MMM d')}</span>
                  {/if}
                  {#if task.estimatedHours}
                    <span class="hours">⏱️ {task.estimatedHours}h</span>
                  {/if}
                </div>
              </div>
              <div class="task-actions">
                <button class="icon-btn" on:click={() => updateTaskStatus(task.id!, 'in-progress')} title="Start">
                  ▶️
                </button>
                <button class="icon-btn" on:click={() => toggleTaskStatus(task)} title="Complete">
                  ✓
                </button>
                <button class="icon-btn" on:click={() => startEdit(task)} title="Edit">
                  ✏️
                </button>
                <button class="icon-btn danger" on:click={() => deleteTask(task.id!)} title="Delete">
                  🗑️
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="task-section">
      <h4>
        <span>{getStatusIcon('in-progress')}</span>
        In Progress ({inProgressTasks.length})
      </h4>
      <div class="task-list">
        {#each inProgressTasks as task}
          <div class="task-item in-progress">
            <div class="task-content">
              <div class="task-title">{task.title}</div>
              {#if task.description}
                <div class="task-description">{task.description}</div>
              {/if}
              <div class="task-meta">
                <span class="badge {getPriorityColor(task.priority)}">{task.priority}</span>
                {#if task.dueDate}
                  <span class="due-date">📅 {format(task.dueDate, 'MMM d')}</span>
                {/if}
              </div>
            </div>
            <div class="task-actions">
              <button class="icon-btn" on:click={() => updateTaskStatus(task.id!, 'pending')} title="Back to Pending">
                ◀️
              </button>
              <button class="icon-btn" on:click={() => toggleTaskStatus(task)} title="Complete">
                ✓
              </button>
              <button class="icon-btn warning" on:click={() => updateTaskStatus(task.id!, 'blocked')} title="Block">
                🚫
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <div class="task-section">
      <h4>
        <span>{getStatusIcon('blocked')}</span>
        Blocked ({blockedTasks.length})
      </h4>
      <div class="task-list">
        {#each blockedTasks as task}
          <div class="task-item blocked">
            <div class="task-content">
              <div class="task-title">{task.title}</div>
              {#if task.description}
                <div class="task-description">{task.description}</div>
              {/if}
            </div>
            <div class="task-actions">
              <button class="icon-btn" on:click={() => updateTaskStatus(task.id!, 'pending')} title="Unblock">
                🔓
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <div class="task-section">
      <h4>
        <span>{getStatusIcon('completed')}</span>
        Completed ({completedTasks.length})
      </h4>
      <div class="task-list">
        {#each completedTasks as task}
          <div class="task-item completed">
            <div class="task-content">
              <div class="task-title">{task.title}</div>
              {#if task.completedAt}
                <div class="completed-date">
                  Completed {formatDistanceToNow(task.completedAt, { addSuffix: true })}
                </div>
              {/if}
            </div>
            <div class="task-actions">
              <button class="icon-btn" on:click={() => toggleTaskStatus(task)} title="Reopen">
                ↩️
              </button>
              <button class="icon-btn danger" on:click={() => deleteTask(task.id!)} title="Delete">
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .task-manager {
    height: 100%;
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .task-header h3 {
    margin: 0;
  }
  
  .new-task-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .new-task-form h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }
  
  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  
  .task-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .task-section {
    background: var(--gray-50);
    padding: 1rem;
    border-radius: var(--radius);
  }
  
  .task-section h4 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 1rem;
  }
  
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 100px;
  }
  
  .task-item {
    background: white;
    padding: 1rem;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    display: flex;
    gap: 0.75rem;
    align-items: start;
    transition: all 0.2s;
  }
  
  .task-item:hover {
    box-shadow: var(--shadow);
  }
  
  .task-item.in-progress {
    border-left: 3px solid var(--secondary);
  }
  
  .task-item.blocked {
    border-left: 3px solid var(--danger);
    opacity: 0.7;
  }
  
  .task-item.completed {
    opacity: 0.6;
  }
  
  .task-item.completed .task-title {
    text-decoration: line-through;
  }
  
  .drag-handle {
    cursor: grab;
    color: var(--gray-400);
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.25rem 0;
  }
  
  .drag-handle:hover {
    color: var(--gray-600);
  }
  
  .task-content {
    flex: 1;
  }
  
  .task-title {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .task-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.5rem;
  }
  
  .task-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .due-date,
  .hours {
    font-size: 0.75rem;
    color: var(--gray-600);
  }
  
  .completed-date {
    font-size: 0.75rem;
    color: var(--gray-500);
  }
  
  .task-actions {
    display: flex;
    gap: 0.25rem;
  }
  
  .icon-btn {
    background: none;
    padding: 0.25rem;
    font-size: 1rem;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  
  .icon-btn:hover {
    background: var(--gray-100);
    transform: none;
    box-shadow: none;
  }
  
  .icon-btn.danger:hover {
    background: rgb(239 68 68 / 0.1);
  }
  
  .icon-btn.warning:hover {
    background: rgb(245 158 11 / 0.1);
  }
  
  .edit-task-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .edit-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
  }
  
  .edit-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  
  button.small {
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
  }
  
  .sortable-ghost {
    opacity: 0.4;
  }
  
  .sortable-drag {
    opacity: 0.9;
    cursor: grabbing !important;
  }
  
  @media (max-width: 768px) {
    .task-sections {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .edit-row {
      grid-template-columns: 1fr;
    }
  }
</style>