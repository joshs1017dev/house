<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { rooms } from '../stores';
  import type { Project, Room } from '../db/database';
  
  export let project: Project | null = null;
  
  const dispatch = createEventDispatcher();
  
  let allRooms: Room[] = [];
  let formData = {
    name: project?.name || '',
    description: project?.description || '',
    roomId: project?.roomId || undefined,
    status: project?.status || 'planning',
    priority: project?.priority || 'medium',
    budget: project?.budget || 0,
    startDate: project?.startDate ? formatDateForInput(project.startDate) : formatDateForInput(new Date()),
    targetEndDate: project?.targetEndDate ? formatDateForInput(project.targetEndDate) : '',
    tags: project?.tags?.join(', ') || ''
  };
  
  rooms.subscribe(r => {
    allRooms = r;
  });
  
  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  function handleSubmit(event: Event) {
    event.preventDefault();
    
    const projectData = {
      name: formData.name,
      description: formData.description,
      roomId: formData.roomId ? parseInt(formData.roomId.toString()) : undefined,
      status: formData.status,
      priority: formData.priority,
      budget: parseFloat(formData.budget.toString()) || 0,
      startDate: new Date(formData.startDate),
      targetEndDate: formData.targetEndDate ? new Date(formData.targetEndDate) : undefined,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    
    dispatch('save', projectData);
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<form on:submit={handleSubmit} class="project-form">
  <h2>{project ? 'Edit Project' : 'New Project'}</h2>
  
  <div class="form-group">
    <label for="name">Project Name *</label>
    <input
      id="name"
      type="text"
      bind:value={formData.name}
      required
      placeholder="e.g., Kitchen Renovation"
    />
  </div>
  
  <div class="form-group">
    <label for="description">Description</label>
    <textarea
      id="description"
      bind:value={formData.description}
      rows="3"
      placeholder="Describe your project..."
    ></textarea>
  </div>
  
  <div class="form-row">
    <div class="form-group">
      <label for="room">Room</label>
      <select id="room" bind:value={formData.roomId}>
        <option value="">Select a room...</option>
        {#each allRooms as room}
          <option value={room.id}>{room.icon} {room.name}</option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label for="status">Status</label>
      <select id="status" bind:value={formData.status}>
        <option value="planning">Planning</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  </div>
  
  <div class="form-row">
    <div class="form-group">
      <label for="priority">Priority</label>
      <select id="priority" bind:value={formData.priority}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="budget">Budget ($)</label>
      <input
        id="budget"
        type="number"
        bind:value={formData.budget}
        min="0"
        step="0.01"
        placeholder="0.00"
      />
    </div>
  </div>
  
  <div class="form-row">
    <div class="form-group">
      <label for="startDate">Start Date *</label>
      <input
        id="startDate"
        type="date"
        bind:value={formData.startDate}
        required
      />
    </div>
    
    <div class="form-group">
      <label for="targetEndDate">Target End Date</label>
      <input
        id="targetEndDate"
        type="date"
        bind:value={formData.targetEndDate}
        min={formData.startDate}
      />
    </div>
  </div>
  
  <div class="form-group">
    <label for="tags">Tags</label>
    <input
      id="tags"
      type="text"
      bind:value={formData.tags}
      placeholder="e.g., DIY, plumbing, electrical (comma separated)"
    />
  </div>
  
  <div class="form-actions">
    <button type="button" class="btn-secondary" on:click={handleCancel}>
      Cancel
    </button>
    <button type="submit" class="btn-primary">
      {project ? 'Update Project' : 'Create Project'}
    </button>
  </div>
</form>

<style>
  .project-form {
    padding: 2rem;
  }
  
  h2 {
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: var(--gray-700);
  }
  
  input,
  textarea,
  select {
    width: 100%;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--gray-200);
  }
  
  @media (max-width: 480px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column-reverse;
    }
    
    .form-actions button {
      width: 100%;
    }
  }
</style>