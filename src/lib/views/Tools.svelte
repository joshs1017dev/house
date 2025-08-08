<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../db/database';
  import type { Tool } from '../db/database';
  
  let tools: Tool[] = [];
  let showNewToolForm = false;
  let editingToolId: number | null = null;
  let filterCategory = 'all';
  let filterOwned = 'all';
  let searchTerm = '';
  
  let categories = [
    'Power Tools',
    'Hand Tools',
    'Measuring',
    'Safety',
    'Plumbing',
    'Electrical',
    'Painting',
    'Garden',
    'Other'
  ];
  
  let newTool = {
    name: '',
    category: 'Hand Tools',
    owned: true,
    location: '',
    purchasePrice: 0,
    notes: ''
  };
  
  let editTool = { ...newTool };
  
  onMount(async () => {
    await loadTools();
  });
  
  async function loadTools() {
    tools = await db.tools.toArray();
  }
  
  async function addTool() {
    if (!newTool.name.trim()) {
      alert('Please enter a tool name');
      return;
    }
    
    await db.tools.add({
      name: newTool.name.trim(),
      category: newTool.category,
      owned: newTool.owned,
      location: newTool.location.trim() || undefined,
      purchaseDate: newTool.owned && newTool.purchasePrice > 0 ? new Date() : undefined,
      purchasePrice: newTool.owned ? newTool.purchasePrice : undefined,
      notes: newTool.notes.trim() || undefined
    });
    
    newTool = {
      name: '',
      category: 'Hand Tools',
      owned: true,
      location: '',
      purchasePrice: 0,
      notes: ''
    };
    showNewToolForm = false;
    await loadTools();
  }
  
  async function startEditTool(tool: Tool) {
    editingToolId = tool.id!;
    editTool = {
      name: tool.name,
      category: tool.category,
      owned: tool.owned,
      location: tool.location || '',
      purchasePrice: tool.purchasePrice || 0,
      notes: tool.notes || ''
    };
  }
  
  async function saveEditTool() {
    if (!editTool.name.trim()) {
      alert('Please enter a tool name');
      return;
    }
    
    await db.tools.update(editingToolId!, {
      name: editTool.name.trim(),
      category: editTool.category,
      owned: editTool.owned,
      location: editTool.location.trim() || undefined,
      purchasePrice: editTool.owned ? editTool.purchasePrice : undefined,
      notes: editTool.notes.trim() || undefined
    });
    
    editingToolId = null;
    await loadTools();
  }
  
  async function deleteTool(toolId: number) {
    if (confirm('Are you sure you want to delete this tool?')) {
      await db.tools.delete(toolId);
      await loadTools();
    }
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  $: filteredTools = tools.filter(tool => {
    if (filterCategory !== 'all' && tool.category !== filterCategory) return false;
    if (filterOwned === 'owned' && !tool.owned) return false;
    if (filterOwned === 'needed' && tool.owned) return false;
    if (searchTerm && !tool.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  $: totalValue = filteredTools
    .filter(t => t.owned && t.purchasePrice)
    .reduce((sum, t) => sum + (t.purchasePrice || 0), 0);
  
  $: ownedCount = filteredTools.filter(t => t.owned).length;
  $: neededCount = filteredTools.filter(t => !t.owned).length;
</script>

<div class="tools">
  <div class="tools-header">
    <h1>🔧 Tool Inventory</h1>
    <button class="btn-primary" on:click={() => showNewToolForm = true}>
      ➕ Add Tool
    </button>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">🛠️</div>
      <div class="stat-content">
        <div class="stat-label">Total Tools</div>
        <div class="stat-value">{filteredTools.length}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-content">
        <div class="stat-label">Owned</div>
        <div class="stat-value">{ownedCount}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">🛒</div>
      <div class="stat-content">
        <div class="stat-label">Shopping List</div>
        <div class="stat-value">{neededCount}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💵</div>
      <div class="stat-content">
        <div class="stat-label">Total Value</div>
        <div class="stat-value">{formatCurrency(totalValue)}</div>
      </div>
    </div>
  </div>
  
  <div class="filters">
    <div class="filter-group">
      <input
        type="text"
        placeholder="Search tools..."
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
      <select bind:value={filterOwned}>
        <option value="all">All Tools</option>
        <option value="owned">Owned</option>
        <option value="needed">Shopping List</option>
      </select>
    </div>
  </div>
  
  {#if showNewToolForm}
    <div class="new-tool-form card">
      <h4>Add New Tool</h4>
      <form on:submit|preventDefault={addTool}>
        <div class="form-row">
          <div class="form-group flex-2">
            <input
              type="text"
              bind:value={newTool.name}
              placeholder="Tool name *"
              required
            />
          </div>
          
          <div class="form-group">
            <select bind:value={newTool.category}>
              {#each categories as category}
                <option value={category}>{category}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={newTool.owned}
              />
              I own this tool
            </label>
          </div>
          
          {#if newTool.owned}
            <div class="form-group">
              <input
                type="number"
                bind:value={newTool.purchasePrice}
                min="0"
                step="0.01"
                placeholder="Purchase price ($)"
              />
            </div>
          {/if}
        </div>
        
        {#if newTool.owned}
          <div class="form-group">
            <input
              type="text"
              bind:value={newTool.location}
              placeholder="Storage location (e.g., Garage shelf A)"
            />
          </div>
        {/if}
        
        <div class="form-group">
          <textarea
            bind:value={newTool.notes}
            placeholder="Notes (model, condition, etc.)"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => showNewToolForm = false}>
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Tool
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  {#if filteredTools.length === 0}
    <div class="empty-state">
      <p>No tools found</p>
      <p class="text-sm text-gray">Add tools to track your inventory</p>
    </div>
  {:else}
    <div class="tools-grid">
      {#each filteredTools as tool}
        <div class="tool-card card">
          {#if editingToolId === tool.id}
            <div class="edit-form">
              <input
                type="text"
                bind:value={editTool.name}
                placeholder="Tool name"
              />
              <select bind:value={editTool.category}>
                {#each categories as category}
                  <option value={category}>{category}</option>
                {/each}
              </select>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={editTool.owned}
                />
                Owned
              </label>
              {#if editTool.owned}
                <input
                  type="number"
                  bind:value={editTool.purchasePrice}
                  min="0"
                  step="0.01"
                  placeholder="Price"
                />
                <input
                  type="text"
                  bind:value={editTool.location}
                  placeholder="Location"
                />
              {/if}
              <textarea
                bind:value={editTool.notes}
                placeholder="Notes"
                rows="2"
              ></textarea>
              <div class="edit-actions">
                <button class="btn-secondary small" on:click={() => editingToolId = null}>
                  Cancel
                </button>
                <button class="btn-primary small" on:click={saveEditTool}>
                  Save
                </button>
              </div>
            </div>
          {:else}
            <div class="tool-header">
              <h3>{tool.name}</h3>
              <span class="category-badge">{tool.category}</span>
            </div>
            
            <div class="tool-status">
              {#if tool.owned}
                <span class="status-badge owned">✅ Owned</span>
                {#if tool.purchasePrice}
                  <span class="price">{formatCurrency(tool.purchasePrice)}</span>
                {/if}
              {:else}
                <span class="status-badge needed">🛒 Need to Buy</span>
              {/if}
            </div>
            
            {#if tool.location}
              <div class="tool-location">
                📍 {tool.location}
              </div>
            {/if}
            
            {#if tool.notes}
              <p class="tool-notes">{tool.notes}</p>
            {/if}
            
            <div class="tool-actions">
              <button class="icon-btn" on:click={() => startEditTool(tool)}>
                ✏️
              </button>
              <button class="icon-btn danger" on:click={() => deleteTool(tool.id || 0)}>
                🗑️
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tools {
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
  
  .tools-header {
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
  
  .search-input {
    width: 100%;
  }
  
  .new-tool-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .new-tool-form h4 {
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
  
  .tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .tool-card {
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .tool-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.75rem;
  }
  
  .tool-header h3 {
    margin: 0;
    font-size: 1.25rem;
    flex: 1;
  }
  
  .category-badge {
    font-size: 0.75rem;
    background: var(--gray-100);
    color: var(--gray-700);
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
  }
  
  .tool-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .status-badge {
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-weight: 500;
  }
  
  .status-badge.owned {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }
  
  .status-badge.needed {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }
  
  .price {
    font-weight: 600;
    color: var(--gray-700);
  }
  
  .tool-location {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.5rem;
  }
  
  .tool-notes {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0.5rem 0 0;
    line-height: 1.5;
  }
  
  .tool-actions {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .tool-card:hover .tool-actions {
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
    
    .tools-grid {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      flex-direction: column;
    }
  }
</style>