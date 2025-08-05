<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { projects } from '../stores/projects';
  import { db } from '../db/database';
  import type { Project, Room } from '../db/database';
  
  const dispatch = createEventDispatcher();
  
  let name = '';
  let description = '';
  let roomId: number | undefined;
  let startDate = new Date().toISOString().split('T')[0];
  let targetEndDate = '';
  let status: Project['status'] = 'planning';
  let priority: Project['priority'] = 'medium';
  let budget = 0;
  let tags = '';
  let rooms: Room[] = [];
  let isSubmitting = false;
  
  // Load rooms
  db.rooms.toArray().then(r => rooms = r);
  
  async function handleSubmit() {
    if (!name.trim()) {
      alert('Please enter a project name');
      return;
    }
    
    isSubmitting = true;
    
    try {
      await projects.add({
        name: name.trim(),
        description: description.trim(),
        roomId: roomId || undefined,
        startDate: new Date(startDate),
        targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
        status,
        priority,
        budget,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        actualCost: 0
      });
      
      dispatch('close');
    } catch (error) {
      alert('Error creating project: ' + error);
    } finally {
      isSubmitting = false;
    }
  }
  
  function handleCancel() {
    dispatch('close');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-backdrop" on:click={handleCancel}>
  <div class="modal" on:click|stopPropagation>
    <div class="modal-header">
      <h2>New Project</h2>
      <button class="close-btn" on:click={handleCancel}>✕</button>
    </div>
    
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="name">Project Name *</label>
        <input
          id="name"
          type="text"
          bind:value={name}
          placeholder="e.g., Kitchen Renovation"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          bind:value={description}
          placeholder="Describe your project..."
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="room">Room</label>
          <select id="room" bind:value={roomId}>
            <option value={undefined}>No specific room</option>
            {#each rooms as room}
              <option value={room.id}>{room.name}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="budget">Budget ($)</label>
          <input
            id="budget"
            type="number"
            bind:value={budget}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            bind:value={startDate}
            required
          />
        </div>
        
        <div class="form-group">
          <label for="targetEndDate">Target End Date</label>
          <input
            id="targetEndDate"
            type="date"
            bind:value={targetEndDate}
            min={startDate}
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="status">Status</label>
          <select id="status" bind:value={status}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="priority">Priority</label>
          <select id="priority" bind:value={priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="tags">Tags (comma separated)</label>
        <input
          id="tags"
          type="text"
          bind:value={tags}
          placeholder="e.g., DIY, plumbing, electrical"
        />
      </div>
      
      <div class="modal-actions">
        <button type="button" class="secondary" on:click={handleCancel}>
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
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
    padding: 1rem;
  }
  
  .modal {
    background: white;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--gray-200);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--gray-400);
    padding: 0.5rem;
    cursor: pointer;
    transition: color 0.2s;
  }
  
  .close-btn:hover {
    color: var(--gray-600);
  }
  
  form {
    padding: 1.5rem;
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
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    color: var(--gray-700);
  }
  
  input[type="text"],
  input[type="number"],
  input[type="date"],
  textarea,
  select {
    width: 100%;
  }
  
  textarea {
    resize: vertical;
  }
  
  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>