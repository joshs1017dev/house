<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../db/database';
  import type { MaintenanceReminder } from '../db/database';
  
  let reminders: MaintenanceReminder[] = [];
  let showNewReminderForm = false;
  let editingReminderId: number | null = null;
  let filterStatus = 'all';
  let filterCategory = 'all';
  let searchTerm = '';
  
  let categories = [
    'HVAC',
    'Plumbing',
    'Electrical',
    'Appliances',
    'Roof',
    'Exterior',
    'Interior',
    'Landscaping',
    'Safety',
    'Other'
  ];
  
  let frequencies = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semiannual', label: 'Semi-Annual' },
    { value: 'annual', label: 'Annual' },
    { value: 'custom', label: 'Custom' }
  ];
  
  let newReminder = {
    title: '',
    description: '',
    category: 'HVAC',
    frequency: 'monthly',
    customDays: 30,
    lastCompleted: '',
    nextDue: '',
    cost: 0,
    notes: ''
  };
  
  let editReminder = { ...newReminder };
  
  onMount(async () => {
    await loadReminders();
    checkOverdueReminders();
  });
  
  async function loadReminders() {
    reminders = await db.maintenanceReminders.toArray();
  }
  
  async function addReminder() {
    if (!newReminder.title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    const lastCompletedDate = newReminder.lastCompleted ? new Date(newReminder.lastCompleted) : new Date();
    const nextDueDate = calculateNextDue(lastCompletedDate, newReminder.frequency, newReminder.customDays);
    
    await db.maintenanceReminders.add({
      title: newReminder.title.trim(),
      description: newReminder.description.trim() || undefined,
      category: newReminder.category,
      frequency: newReminder.frequency,
      customDays: newReminder.frequency === 'custom' ? newReminder.customDays : undefined,
      lastCompleted: lastCompletedDate,
      nextDue: nextDueDate,
      cost: newReminder.cost || undefined,
      notes: newReminder.notes.trim() || undefined,
      isActive: true
    });
    
    newReminder = {
      title: '',
      description: '',
      category: 'HVAC',
      frequency: 'monthly',
      customDays: 30,
      lastCompleted: '',
      nextDue: '',
      cost: 0,
      notes: ''
    };
    showNewReminderForm = false;
    await loadReminders();
  }
  
  function calculateNextDue(lastDate: Date, frequency: string, customDays?: number): Date {
    const next = new Date(lastDate);
    
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semiannual':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
      case 'custom':
        next.setDate(next.getDate() + (customDays || 30));
        break;
    }
    
    return next;
  }
  
  async function completeReminder(reminder: MaintenanceReminder) {
    const now = new Date();
    const nextDue = calculateNextDue(now, reminder.frequency, reminder.customDays);
    
    await db.maintenanceReminders.update(reminder.id!, {
      lastCompleted: now,
      nextDue: nextDue
    });
    
    // Add to history
    await db.maintenanceHistory.add({
      reminderId: reminder.id!,
      completedDate: now,
      cost: reminder.cost,
      notes: `Completed ${reminder.title}`
    });
    
    await loadReminders();
  }
  
  async function startEditReminder(reminder: MaintenanceReminder) {
    editingReminderId = reminder.id!;
    editReminder = {
      title: reminder.title,
      description: reminder.description || '',
      category: reminder.category,
      frequency: reminder.frequency,
      customDays: reminder.customDays || 30,
      lastCompleted: formatDateInput(reminder.lastCompleted),
      nextDue: formatDateInput(reminder.nextDue),
      cost: reminder.cost || 0,
      notes: reminder.notes || ''
    };
  }
  
  async function saveEditReminder() {
    if (!editReminder.title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    const lastCompletedDate = new Date(editReminder.lastCompleted);
    const nextDueDate = new Date(editReminder.nextDue);
    
    await db.maintenanceReminders.update(editingReminderId!, {
      title: editReminder.title.trim(),
      description: editReminder.description.trim() || undefined,
      category: editReminder.category,
      frequency: editReminder.frequency,
      customDays: editReminder.frequency === 'custom' ? editReminder.customDays : undefined,
      lastCompleted: lastCompletedDate,
      nextDue: nextDueDate,
      cost: editReminder.cost || undefined,
      notes: editReminder.notes.trim() || undefined
    });
    
    editingReminderId = null;
    await loadReminders();
  }
  
  async function deleteReminder(reminderId: number) {
    if (confirm('Are you sure you want to delete this reminder?')) {
      await db.maintenanceReminders.delete(reminderId);
      await loadReminders();
    }
  }
  
  async function toggleReminderActive(reminder: MaintenanceReminder) {
    await db.maintenanceReminders.update(reminder.id!, {
      isActive: !reminder.isActive
    });
    await loadReminders();
  }
  
  function checkOverdueReminders() {
    const now = new Date();
    const overdueCount = reminders.filter(r => 
      r.isActive && r.nextDue < now
    ).length;
    
    if (overdueCount > 0) {
      // Could trigger a notification here
      console.log(`${overdueCount} maintenance tasks are overdue!`);
    }
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  function formatDateInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  function getDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  function getDueStatus(dueDate: Date): string {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'overdue';
    if (days <= 7) return 'due-soon';
    return 'upcoming';
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  $: filteredReminders = reminders.filter(reminder => {
    if (filterStatus === 'active' && !reminder.isActive) return false;
    if (filterStatus === 'inactive' && reminder.isActive) return false;
    if (filterStatus === 'overdue' && getDaysUntilDue(reminder.nextDue) >= 0) return false;
    if (filterCategory !== 'all' && reminder.category !== filterCategory) return false;
    if (searchTerm && !reminder.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  $: activeCount = reminders.filter(r => r.isActive).length;
  $: overdueCount = reminders.filter(r => r.isActive && getDaysUntilDue(r.nextDue) < 0).length;
  $: totalCost = reminders
    .filter(r => r.isActive && r.cost)
    .reduce((sum, r) => sum + (r.cost || 0), 0);
</script>

<div class="maintenance">
  <div class="maintenance-header">
    <h1>🔧 Maintenance Reminders</h1>
    <button class="btn-primary" on:click={() => showNewReminderForm = true}>
      ➕ Add Reminder
    </button>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">📅</div>
      <div class="stat-content">
        <div class="stat-label">Active Reminders</div>
        <div class="stat-value">{activeCount}</div>
      </div>
    </div>
    
    <div class="stat-card {overdueCount > 0 ? 'alert' : ''}">
      <div class="stat-icon">⚠️</div>
      <div class="stat-content">
        <div class="stat-label">Overdue</div>
        <div class="stat-value">{overdueCount}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-content">
        <div class="stat-label">Est. Annual Cost</div>
        <div class="stat-value">{formatCurrency(totalCost)}</div>
      </div>
    </div>
  </div>
  
  <div class="filters">
    <div class="filter-group">
      <input
        type="text"
        placeholder="Search reminders..."
        bind:value={searchTerm}
        class="search-input"
      />
    </div>
    
    <div class="filter-group">
      <select bind:value={filterCategory}>
        <option value="all">All Categories</option>
        {#each categories as category}
          <option value={category}>{category}</option>
        {/each}
      </select>
    </div>
    
    <div class="filter-group">
      <select bind:value={filterStatus}>
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="overdue">Overdue</option>
      </select>
    </div>
  </div>
  
  {#if showNewReminderForm}
    <div class="new-reminder-form card">
      <h4>Add New Reminder</h4>
      <form on:submit|preventDefault={addReminder}>
        <div class="form-row">
          <div class="form-group flex-2">
            <input
              type="text"
              bind:value={newReminder.title}
              placeholder="Reminder title *"
              required
            />
          </div>
          
          <div class="form-group">
            <select bind:value={newReminder.category}>
              {#each categories as category}
                <option value={category}>{category}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <textarea
            bind:value={newReminder.description}
            placeholder="Description"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Frequency</label>
            <select bind:value={newReminder.frequency}>
              {#each frequencies as freq}
                <option value={freq.value}>{freq.label}</option>
              {/each}
            </select>
          </div>
          
          {#if newReminder.frequency === 'custom'}
            <div class="form-group">
              <label>Days</label>
              <input
                type="number"
                bind:value={newReminder.customDays}
                min="1"
                placeholder="Days"
              />
            </div>
          {/if}
          
          <div class="form-group">
            <label>Estimated Cost</label>
            <input
              type="number"
              bind:value={newReminder.cost}
              min="0"
              step="0.01"
              placeholder="Cost ($)"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Last Completed</label>
            <input
              type="date"
              bind:value={newReminder.lastCompleted}
            />
          </div>
        </div>
        
        <div class="form-group">
          <textarea
            bind:value={newReminder.notes}
            placeholder="Notes"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => showNewReminderForm = false}>
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Reminder
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  {#if filteredReminders.length === 0}
    <div class="empty-state">
      <p>No maintenance reminders found</p>
      <p class="text-sm text-gray">Add reminders to stay on top of home maintenance</p>
    </div>
  {:else}
    <div class="reminders-grid">
      {#each filteredReminders as reminder}
        <div class="reminder-card card {getDueStatus(reminder.nextDue)}">
          {#if editingReminderId === reminder.id}
            <div class="edit-form">
              <input
                type="text"
                bind:value={editReminder.title}
                placeholder="Title"
              />
              <select bind:value={editReminder.category}>
                {#each categories as category}
                  <option value={category}>{category}</option>
                {/each}
              </select>
              <textarea
                bind:value={editReminder.description}
                placeholder="Description"
                rows="2"
              ></textarea>
              <select bind:value={editReminder.frequency}>
                {#each frequencies as freq}
                  <option value={freq.value}>{freq.label}</option>
                {/each}
              </select>
              {#if editReminder.frequency === 'custom'}
                <input
                  type="number"
                  bind:value={editReminder.customDays}
                  min="1"
                  placeholder="Days"
                />
              {/if}
              <input
                type="number"
                bind:value={editReminder.cost}
                min="0"
                step="0.01"
                placeholder="Cost"
              />
              <input
                type="date"
                bind:value={editReminder.lastCompleted}
              />
              <input
                type="date"
                bind:value={editReminder.nextDue}
              />
              <textarea
                bind:value={editReminder.notes}
                placeholder="Notes"
                rows="2"
              ></textarea>
              <div class="edit-actions">
                <button class="btn-secondary small" on:click={() => editingReminderId = null}>
                  Cancel
                </button>
                <button class="btn-primary small" on:click={saveEditReminder}>
                  Save
                </button>
              </div>
            </div>
          {:else}
            <div class="reminder-header">
              <h3>{reminder.title}</h3>
              <div class="reminder-actions">
                <button 
                  class="icon-btn"
                  on:click={() => toggleReminderActive(reminder)}
                  title="{reminder.isActive ? 'Deactivate' : 'Activate'}"
                >
                  {reminder.isActive ? '✅' : '⏸️'}
                </button>
                <button class="icon-btn" on:click={() => startEditReminder(reminder)}>
                  ✏️
                </button>
                <button class="icon-btn danger" on:click={() => deleteReminder(reminder.id || 0)}>
                  🗑️
                </button>
              </div>
            </div>
            
            <div class="reminder-meta">
              <span class="category-badge">{reminder.category}</span>
              <span class="frequency-badge">{frequencies.find(f => f.value === reminder.frequency)?.label}</span>
              {#if reminder.cost}
                <span class="cost-badge">{formatCurrency(reminder.cost)}</span>
              {/if}
            </div>
            
            {#if reminder.description}
              <p class="reminder-description">{reminder.description}</p>
            {/if}
            
            <div class="reminder-dates">
              <div class="date-info">
                <span class="date-label">Last Completed:</span>
                <span class="date-value">{formatDate(reminder.lastCompleted)}</span>
              </div>
              <div class="date-info">
                <span class="date-label">Next Due:</span>
                <span class="date-value due-{getDueStatus(reminder.nextDue)}">
                  {formatDate(reminder.nextDue)}
                  {#if reminder.isActive}
                    <span class="days-until">
                      ({getDaysUntilDue(reminder.nextDue) < 0 
                        ? `${Math.abs(getDaysUntilDue(reminder.nextDue))} days overdue`
                        : `${getDaysUntilDue(reminder.nextDue)} days`})
                    </span>
                  {/if}
                </span>
              </div>
            </div>
            
            {#if reminder.notes}
              <p class="reminder-notes">{reminder.notes}</p>
            {/if}
            
            {#if reminder.isActive && getDueStatus(reminder.nextDue) !== 'upcoming'}
              <button 
                class="btn-primary full-width"
                on:click={() => completeReminder(reminder)}
              >
                ✓ Mark as Completed
              </button>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .maintenance {
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
  
  .maintenance-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
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
  
  .filter-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .search-input {
    width: 100%;
  }
  
  .new-reminder-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .new-reminder-form h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    flex: 1;
  }
  
  .form-group.flex-2 {
    flex: 2;
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
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-600);
  }
  
  .text-sm {
    font-size: 0.875rem;
  }
  
  .text-gray {
    color: var(--gray-500);
  }
  
  .reminders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .reminder-card {
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .reminder-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .reminder-card.overdue {
    border: 2px solid var(--danger);
  }
  
  .reminder-card.due-soon {
    border: 2px solid var(--warning);
  }
  
  .reminder-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.75rem;
  }
  
  .reminder-header h3 {
    margin: 0;
    font-size: 1.25rem;
    flex: 1;
  }
  
  .reminder-actions {
    display: flex;
    gap: 0.25rem;
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
  
  .reminder-meta {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  .category-badge,
  .frequency-badge,
  .cost-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-weight: 500;
  }
  
  .category-badge {
    background: var(--gray-100);
    color: var(--gray-700);
  }
  
  .frequency-badge {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
  }
  
  .cost-badge {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }
  
  .reminder-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0 0 1rem;
    line-height: 1.5;
  }
  
  .reminder-dates {
    background: var(--gray-50);
    padding: 0.75rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
  }
  
  .date-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .date-info:last-child {
    margin-bottom: 0;
  }
  
  .date-label {
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .date-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .date-value.due-overdue {
    color: var(--danger);
  }
  
  .date-value.due-due-soon {
    color: var(--warning);
  }
  
  .days-until {
    font-weight: normal;
    font-size: 0.8125rem;
  }
  
  .reminder-notes {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0 0 1rem;
    padding: 0.75rem;
    background: var(--gray-50);
    border-radius: var(--radius);
    line-height: 1.5;
  }
  
  .full-width {
    width: 100%;
  }
  
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .edit-form input,
  .edit-form textarea,
  .edit-form select {
    font-size: 0.875rem;
  }
  
  .edit-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  
  button.small {
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
  }
  
  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
    }
    
    .filter-group {
      width: 100%;
    }
    
    .reminders-grid {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      flex-direction: column;
    }
  }
</style>