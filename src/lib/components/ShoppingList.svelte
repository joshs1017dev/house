<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '../db/database';
  import type { Material, Project } from '../db/database';
  
  export let projectId: number | null = null;
  
  let materials: Material[] = [];
  let projects: Project[] = [];
  let selectedStore = 'all';
  let groupByStore = false;
  let showPurchased = false;
  
  const stores = [
    'Home Depot',
    'Lowes',
    'Menards',
    'Local Hardware',
    'Online',
    'Other'
  ];
  
  onMount(async () => {
    await loadMaterials();
    if (!projectId) {
      projects = await db.projects.toArray();
    }
  });
  
  async function loadMaterials() {
    if (projectId) {
      materials = await db.materials
        .where('projectId')
        .equals(projectId)
        .toArray();
    } else {
      materials = await db.materials.toArray();
    }
    
    if (!showPurchased) {
      materials = materials.filter(m => m.status !== 'received');
    }
  }
  
  async function togglePurchased(material: Material) {
    const newStatus = material.status === 'received' ? 'needed' : 'received';
    await db.materials.update(material.id!, {
      status: newStatus,
      purchaseDate: newStatus === 'received' ? new Date() : undefined,
      actualCost: newStatus === 'received' && !material.actualCost ? material.estimatedCost : material.actualCost
    });
    await loadMaterials();
  }
  
  async function updateActualCost(material: Material, cost: number) {
    await db.materials.update(material.id!, {
      actualCost: cost
    });
    await loadMaterials();
  }
  
  function getProjectName(projectId: number): string {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function printList() {
    window.print();
  }
  
  function exportToCSV() {
    const headers = ['Item', 'Quantity', 'Unit', 'Est. Cost', 'Store', 'Project', 'Status'];
    const rows = filteredMaterials.map(m => [
      m.name,
      m.quantity,
      m.unit,
      m.estimatedCost,
      m.vendor || '',
      projectId ? '' : getProjectName(m.projectId),
      m.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
  
  $: filteredMaterials = materials.filter(m => {
    if (selectedStore !== 'all' && m.vendor !== selectedStore) return false;
    return true;
  });
  
  $: groupedMaterials = groupByStore ? 
    filteredMaterials.reduce((acc, material) => {
      const store = material.vendor || 'Other';
      if (!acc[store]) acc[store] = [];
      acc[store].push(material);
      return acc;
    }, {} as Record<string, Material[]>) :
    { 'All Items': filteredMaterials };
  
  $: totalEstimated = filteredMaterials.reduce((sum, m) => sum + m.estimatedCost, 0);
  $: totalActual = filteredMaterials
    .filter(m => m.actualCost)
    .reduce((sum, m) => sum + (m.actualCost || 0), 0);
  $: itemsNeeded = filteredMaterials.filter(m => m.status === 'needed').length;
  $: itemsPurchased = filteredMaterials.filter(m => m.status === 'received').length;
</script>

<div class="shopping-list">
  <div class="list-header">
    <h2>🛒 Shopping List</h2>
    <div class="header-actions">
      <button class="btn-secondary" on:click={printList}>
        🖨️ Print
      </button>
      <button class="btn-secondary" on:click={exportToCSV}>
        📥 Export CSV
      </button>
    </div>
  </div>
  
  <div class="list-stats">
    <div class="stat">
      <span class="stat-label">Items Needed</span>
      <span class="stat-value">{itemsNeeded}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Items Purchased</span>
      <span class="stat-value">{itemsPurchased}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Est. Total</span>
      <span class="stat-value">{formatCurrency(totalEstimated)}</span>
    </div>
    {#if totalActual > 0}
      <div class="stat">
        <span class="stat-label">Actual Total</span>
        <span class="stat-value">{formatCurrency(totalActual)}</span>
      </div>
    {/if}
  </div>
  
  <div class="list-controls">
    <select bind:value={selectedStore}>
      <option value="all">All Stores</option>
      {#each stores as store}
        <option value={store}>{store}</option>
      {/each}
    </select>
    
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={groupByStore} />
      Group by Store
    </label>
    
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={showPurchased} on:change={loadMaterials} />
      Show Purchased
    </label>
  </div>
  
  <div class="list-content">
    {#each Object.entries(groupedMaterials) as [store, items]}
      {#if groupByStore}
        <h3 class="store-header">{store}</h3>
      {/if}
      
      <div class="materials-list">
        {#each items as material}
          <div class="material-item" class:purchased={material.status === 'received'}>
            <label class="checkbox-wrapper">
              <input 
                type="checkbox" 
                checked={material.status === 'received'}
                on:change={() => togglePurchased(material)}
              />
              <div class="material-info">
                <div class="material-name">{material.name}</div>
                <div class="material-details">
                  <span class="quantity">{material.quantity} {material.unit}</span>
                  {#if material.vendor}
                    <span class="vendor">{material.vendor}</span>
                  {/if}
                  {#if !projectId}
                    <span class="project-name">{getProjectName(material.projectId)}</span>
                  {/if}
                </div>
              </div>
            </label>
            
            <div class="material-cost">
              <div class="estimated-cost">
                Est: {formatCurrency(material.estimatedCost)}
              </div>
              {#if material.status === 'received'}
                <input 
                  type="number" 
                  class="actual-cost-input"
                  value={material.actualCost || material.estimatedCost}
                  on:blur={(e) => updateActualCost(material, parseFloat(e.currentTarget.value))}
                  step="0.01"
                  min="0"
                />
              {/if}
            </div>
            
            {#if material.url}
              <a href={material.url} target="_blank" class="material-link" title="View product">
                🔗
              </a>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
    
    {#if filteredMaterials.length === 0}
      <div class="empty-state">
        <p>No items in shopping list</p>
        <p class="text-sm">Add materials to your projects to see them here</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .shopping-list {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .list-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .stat {
    background: white;
    padding: 1rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    text-align: center;
  }
  
  .stat-label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
  }
  
  .list-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  
  .list-controls select {
    padding: 0.5rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    background: white;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .list-content {
    background: white;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }
  
  .store-header {
    font-size: 1.25rem;
    margin: 1.5rem 0 1rem;
    color: var(--gray-700);
    border-bottom: 2px solid var(--gray-200);
    padding-bottom: 0.5rem;
  }
  
  .store-header:first-child {
    margin-top: 0;
  }
  
  .materials-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .material-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius);
    transition: all 0.2s;
  }
  
  .material-item:hover {
    background: var(--gray-100);
  }
  
  .material-item.purchased {
    opacity: 0.6;
  }
  
  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    cursor: pointer;
  }
  
  .checkbox-wrapper input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }
  
  .material-info {
    flex: 1;
  }
  
  .material-name {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .material-details {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .quantity {
    font-weight: 500;
  }
  
  .vendor {
    padding: 0.125rem 0.5rem;
    background: var(--gray-200);
    border-radius: 999px;
    font-size: 0.75rem;
  }
  
  .project-name {
    color: var(--primary);
  }
  
  .material-cost {
    text-align: right;
  }
  
  .estimated-cost {
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .actual-cost-input {
    width: 100px;
    padding: 0.25rem 0.5rem;
    margin-top: 0.25rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-sm);
    text-align: right;
    font-size: 0.875rem;
  }
  
  .material-link {
    padding: 0.25rem 0.5rem;
    background: var(--primary);
    color: white;
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .material-link:hover {
    background: var(--primary-dark);
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-600);
  }
  
  .text-sm {
    font-size: 0.875rem;
    color: var(--gray-500);
  }
  
  .btn-secondary {
    padding: 0.5rem 1rem;
    background: var(--gray-100);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: var(--gray-200);
  }
  
  @media print {
    .list-header, .list-controls, .header-actions, .actual-cost-input, .material-link {
      display: none !important;
    }
    
    .material-item {
      break-inside: avoid;
    }
  }
  
  @media (max-width: 768px) {
    .list-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .list-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .material-details {
      flex-direction: column;
      gap: 0.25rem;
    }
  }
</style>