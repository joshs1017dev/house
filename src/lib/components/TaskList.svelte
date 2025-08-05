<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { tasks } from '../stores';
  import type { Task } from '../db/database';
  import Sortable from 'sortablejs';
  
  export let projectId: number;
  
  let projectTasks: Task[] = [];
  let showNewTaskForm = false;
  let editingTaskId: number | null = null;
  let taskListElement: HTMLElement;
  let sortable: Sortable;
  
  let newTask = {
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as Task['status'],
    dueDate: '',
    estimatedHours: 0,
    assignedTo: ''
  };
  
  let editTask = { ...newTask };
  
  const statusColumns = [
    { id: 'pending', label: 'To Do', color: '#6b7280' },
    { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
    { id: 'completed', label: 'Completed', color: '#10b981' },
    { id: 'blocked', label: 'Blocked', color: '#ef4444' }
  ];
  
  tasks.subscribe(t => {
    projectTasks = t
      .filter(task => task.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  });
  
  onMount(() => {
    initializeDragAndDrop();
  });
  
  onDestroy(() => {
    if (sortable) sortable.destroy();
  });
  
  function initializeDragAndDrop() {
    const containers = document.querySelectorAll('.task-column-content');
    containers.forEach(container => {
      new Sortable(container as HTMLElement, {
        group: 'tasks',
        animation: 150,
        ghostClass: 'task-ghost',
        dragClass: 'task-drag',
        onEnd: handleDragEnd
      });
    });
  }
  
  async function handleDragEnd(event: any) {
    const taskId = parseInt(event.item.dataset.taskId);
    const newStatus = event.to.dataset.status;
    const newIndex = event.newIndex;
    
    // Update task status and order
    await tasks.update(taskId, {
      status: newStatus as Task['status'],
      order: newIndex
    });
    
    // Reload tasks to update the view
    await tasks.load(projectId);
  }
  
  async function addTask() {
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }
    
    await tasks.add({
      projectId,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: newTask.status,
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      estimatedHours: newTask.estimatedHours || undefined,
      assignedTo: newTask.assignedTo.trim() || undefined,
      order: projectTasks.length
    });
    
    // Reset form
    newTask = {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dueDate: '',
      estimatedHours: 0,
      assignedTo: ''
    };
    showNewTaskForm = false;
    
    await tasks.load(projectId);
    // Reinitialize drag and drop for new tasks
    setTimeout(initializeDragAndDrop, 100);
  }
  
  async function startEditTask(task: Task) {
    editingTaskId = task.id || 0;
    editTask = {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? formatDateForInput(task.dueDate) : '',
      estimatedHours: task.estimatedHours || 0,
      assignedTo: task.assignedTo || ''
    };
  }
  
  async function saveEditTask() {
    if (!editTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }
    
    await tasks.update(editingTaskId || 0, {
      title: editTask.title.trim(),
      description: editTask.description.trim() || undefined,
      priority: editTask.priority,
      status: editTask.status,
      dueDate: editTask.dueDate ? new Date(editTask.dueDate) : undefined,
      estimatedHours: editTask.estimatedHours || undefined,
      assignedTo: editTask.assignedTo.trim() || undefined
    });
    
    editingTaskId = null;
    await tasks.load(projectId);
  }
  
  async function deleteTask(taskId: number) {
    if (confirm('Are you sure you want to delete this task?')) {
      await tasks.delete(taskId);
      await tasks.load(projectId);
    }
  }
  
  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
  
  function getTasksByStatus(status: string): Task[] {
    return projectTasks.filter(task => task.status === status);
  }
  
  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#6b7280';
      default: return '#9ca3af';
    }
  }
</script>

<div class="task-board">
  <div class="task-header">
    <h3>📋 Tasks</h3>
    <button class="btn-primary" on:click={() => showNewTaskForm = true}>
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
            <label>Status</label>
            <select bind:value={newTask.status}>
              <option value="pending">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
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
            />
          </div>
        </div>
        
        <div class="form-group">
          <label>Assigned To</label>
          <input
            type="text"
            bind:value={newTask.assignedTo}
            placeholder="Person responsible"
          />
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => showNewTaskForm = false}>
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Task
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  <div class="task-columns" bind:this={taskListElement}>
    {#each statusColumns as column}
      <div class="task-column">
        <div class="column-header" style="background: {column.color}">
          <h4>{column.label}</h4>
          <span class="task-count">{getTasksByStatus(column.id).length}</span>
        </div>
        
        <div class="task-column-content" data-status={column.id}>
          {#each getTasksByStatus(column.id) as task (task.id)}
            <div class="task-card" data-task-id={task.id}>
              {#if editingTaskId === task.id}
                <div class="edit-form">
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
                  </div>
                  <div class="edit-actions">
                    <button class="btn-secondary small" on:click={() => editingTaskId = null}>
                      Cancel
                    </button>
                    <button class="btn-primary small" on:click={saveEditTask}>
                      Save
                    </button>
                  </div>
                </div>
              {:else}
                <div class="task-content">
                  <div class="task-header">
                    <h5>{task.title}</h5>
                    <span 
                      class="priority-dot"
                      style="background: {getPriorityColor(task.priority)}"
                      title="{task.priority} priority"
                    ></span>
                  </div>
                  
                  {#if task.description}
                    <p class="task-description">{task.description}</p>
                  {/if}
                  
                  <div class="task-meta">
                    {#if task.dueDate}
                      <span class="meta-item">📅 {formatDate(task.dueDate)}</span>
                    {/if}
                    {#if task.assignedTo}
                      <span class="meta-item">👤 {task.assignedTo}</span>
                    {/if}
                    {#if task.estimatedHours}
                      <span class="meta-item">⏱️ {task.estimatedHours}h</span>
                    {/if}
                  </div>
                  
                  <div class="task-actions">
                    <button class="icon-btn" on:click={() => startEditTask(task)}>
                      ✏️
                    </button>
                    <button class="icon-btn danger" on:click={() => deleteTask(task.id || 0)}>
                      🗑️
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .task-board {
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
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
  }
  
  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  
  .task-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    height: calc(100vh - 300px);
    min-height: 400px;
  }
  
  .task-column {
    display: flex;
    flex-direction: column;
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  
  .column-header {
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .column-header h4 {
    margin: 0;
    font-size: 1rem;
  }
  
  .task-count {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    font-size: 0.875rem;
  }
  
  .task-column-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    min-height: 100px;
  }
  
  .task-card {
    background: white;
    border-radius: var(--radius);
    padding: 1rem;
    margin-bottom: 0.75rem;
    box-shadow: var(--shadow);
    cursor: move;
    transition: all 0.2s;
  }
  
  .task-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  
  .task-ghost {
    opacity: 0.4;
  }
  
  .task-drag {
    opacity: 0.9;
    transform: rotate(3deg);
  }
  
  .task-content {
    position: relative;
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
  }
  
  .task-header h5 {
    margin: 0;
    font-size: 1rem;
    flex: 1;
  }
  
  .priority-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .task-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0.5rem 0;
    line-height: 1.4;
  }
  
  .task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: var(--gray-500);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .task-actions {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .task-card:hover .task-actions {
    opacity: 1;
  }
  
  .icon-btn {
    background: none;
    padding: 0.25rem;
    font-size: 0.875rem;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  
  .icon-btn:hover {
    background: var(--gray-100);
    transform: none;
    box-shadow: none;
  }
  
  .icon-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .edit-form input,
  .edit-form textarea,
  .edit-form select {
    width: 100%;
    font-size: 0.875rem;
  }
  
  .edit-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
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
  
  @media (max-width: 768px) {
    .task-columns {
      grid-template-columns: 1fr;
      height: auto;
    }
    
    .task-column-content {
      min-height: 200px;
      max-height: 400px;
    }
  }
</style>