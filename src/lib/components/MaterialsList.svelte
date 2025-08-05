<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { db } from '../db/database';
  import type { Material } from '../db/database';
  import { format } from 'date-fns';
  
  export let projectId: number;
  
  const dispatch = createEventDispatcher();
  
  let materials: Material[] = [];
  let showNewMaterialForm = false;
  let editingMaterialId: number | null = null;
  let editMaterial: Partial<Material> = {};
  let filterStatus: 'all' | Material['status'] = 'all';
  
  let newMaterial = {
    name: '',
    quantity: 1,
    unit: '',
    estimatedCost: 0,
    vendor: '',
    url: '',
    notes: ''
  };
  
  $: filteredMaterials = materials.filter(m => 
    filterStatus === 'all' || m.status === filterStatus
  );
  
  $: totalEstimated = filteredMaterials.reduce((sum, m) => sum + m.estimatedCost, 0);
  $: totalActual = filteredMaterials.reduce((sum, m) => sum + (m.actualCost || 0), 0);
  
  onMount(async () => {
    await loadMaterials();
  });
  
  async function loadMaterials() {
    materials = await db.materials.where('projectId').equals(projectId).toArray();
  }
  
  async function addMaterial() {
    if (!newMaterial.name.trim() || !newMaterial.unit.trim()) {
      alert('Please enter material name and unit');
      return;
    }
    
    await db.materials.add({
      projectId,
      name: newMaterial.name.trim(),
      quantity: newMaterial.quantity,
      unit: newMaterial.unit.trim(),
      estimatedCost: newMaterial.estimatedCost,
      vendor: newMaterial.vendor.trim(),
      url: newMaterial.url.trim(),
      notes: newMaterial.notes.trim(),
      status: 'needed'
    });
    
    newMaterial = {
      name: '',
      quantity: 1,
      unit: '',
      estimatedCost: 0,
      vendor: '',
      url: '',
      notes: ''
    };
    showNewMaterialForm = false;
    await loadMaterials();
    dispatch('update');
  }
  
  async function updateStatus(materialId: number, status: Material['status']) {
    const updates: Partial<Material> = { status };
    if (status === 'received') {
      updates.purchaseDate = new Date();
    }
    await db.materials.update(materialId, updates);
    await loadMaterials();
    dispatch('update');
  }
  
  async function deleteMaterial(materialId: number) {
    if (confirm('Are you sure you want to delete this material?')) {
      await db.materials.delete(materialId);
      await loadMaterials();
      dispatch('update');
    }
  }
  
  function startEdit(material: Material) {
    editingMaterialId = material.id!;
    editMaterial = { ...material };
  }
  
  function cancelEdit() {
    editingMaterialId = null;
    editMaterial = {};
  }
  
  async function saveEdit() {
    if (!editMaterial.name?.trim() || !editMaterial.unit?.trim()) {
      alert('Please enter material name and unit');
      return;
    }
    
    await db.materials.update(editingMaterialId!, {
      name: editMaterial.name.trim(),
      quantity: editMaterial.quantity,
      unit: editMaterial.unit.trim(),
      estimatedCost: editMaterial.estimatedCost,
      actualCost: editMaterial.actualCost,
      vendor: editMaterial.vendor?.trim(),
      url: editMaterial.url?.trim(),
      notes: editMaterial.notes?.trim()
    });
    
    editingMaterialId = null;
    editMaterial = {};
    await loadMaterials();
    dispatch('update');
  }
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getStatusColor(status: Material['status']) {
    switch (status) {
      case 'needed': return 'warning';
      case 'ordered': return 'primary';
      case 'received': return 'success';
    }
  }
</script>

<div class="materials-list">
  <div class="materials-header">
    <h3>Materials & Shopping List</h3>
    <button on:click={() => showNewMaterialForm = true}>
      ➕ Add Material
    </button>
  </div>
  
  <div class="materials-summary">
    <div class="summary-item">
      <span class="label">Estimated Total:</span>
      <span class="value">{formatCurrency(totalEstimated)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Actual Total:</span>
      <span class="value">{formatCurrency(totalActual)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Filter:</span>
      <select bind:value={filterStatus} class="filter-select">
        <option value="all">All Materials</option>
        <option value="needed">Needed</option>
        <option value="ordered">Ordered</option>
        <option value="received">Received</option>
      </select>
    </div>
  </div>
  
  {#if showNewMaterialForm}
    <div class="new-material-form card">
      <h4>Add New Material</h4>
      <form on:submit|preventDefault={addMaterial}>
        <div class="form-row">
          <div class="form-group flex-2">
            <input
              type="text"
              bind:value={newMaterial.name}
              placeholder="Material name *"
              required
            />
          </div>
          
          <div class="form-group">
            <input
              type="number"
              bind:value={newMaterial.quantity}
              min="0"
              step="0.01"
              placeholder="Quantity *"
              required
            />
          </div>
          
          <div class="form-group">
            <input
              type="text"
              bind:value={newMaterial.unit}
              placeholder="Unit (e.g., ft, pcs) *"
              required
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <input
              type="number"
              bind:value={newMaterial.estimatedCost}
              min="0"
              step="0.01"
              placeholder="Estimated cost ($)"
            />
          </div>
          
          <div class="form-group flex-2">
            <input
              type="text"
              bind:value={newMaterial.vendor}
              placeholder="Vendor/Store"
            />
          </div>
        </div>
        
        <div class="form-group">
          <input
            type="url"
            bind:value={newMaterial.url}
            placeholder="Product URL (optional)"
          />
        </div>
        
        <div class="form-group">
          <textarea
            bind:value={newMaterial.notes}
            placeholder="Notes (optional)"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="secondary" on:click={() => showNewMaterialForm = false}>
            Cancel
          </button>
          <button type="submit">
            Add Material
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  {#if filteredMaterials.length === 0}
    <div class="empty-state">
      <p>No materials added yet</p>
      <p class="text-sm text-gray">Start by adding materials you'll need for this project</p>
    </div>
  {:else}
    <div class="materials-table">
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Quantity</th>
            <th>Est. Cost</th>
            <th>Actual Cost</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredMaterials as material}
            <tr>
              {#if editingMaterialId === material.id}
                <td colspan="7">
                  <div class="edit-form">
                    <div class="edit-row">
                      <input
                        type="text"
                        bind:value={editMaterial.name}
                        placeholder="Material name"
                      />
                      <input
                        type="number"
                        bind:value={editMaterial.quantity}
                        min="0"
                        step="0.01"
                        placeholder="Qty"
                      />
                      <input
                        type="text"
                        bind:value={editMaterial.unit}
                        placeholder="Unit"
                      />
                    </div>
                    <div class="edit-row">
                      <input
                        type="number"
                        bind:value={editMaterial.estimatedCost}
                        min="0"
                        step="0.01"
                        placeholder="Est. cost"
                      />
                      <input
                        type="number"
                        bind:value={editMaterial.actualCost}
                        min="0"
                        step="0.01"
                        placeholder="Actual cost"
                      />
                      <input
                        type="text"
                        bind:value={editMaterial.vendor}
                        placeholder="Vendor"
                      />
                    </div>
                    <div class="edit-row">
                      <input
                        type="url"
                        bind:value={editMaterial.url}
                        placeholder="Product URL"
                        class="full-width"
                      />
                    </div>
                    <div class="edit-row">
                      <textarea
                        bind:value={editMaterial.notes}
                        placeholder="Notes"
                        rows="2"
                        class="full-width"
                      ></textarea>
                    </div>
                    <div class="edit-actions">
                      <button class="secondary small" on:click={cancelEdit}>Cancel</button>
                      <button class="small" on:click={saveEdit}>Save</button>
                    </div>
                  </div>
                </td>
              {:else}
                <td>
                  <div class="material-name">
                    {material.name}
                    {#if material.notes}
                      <div class="material-notes">{material.notes}</div>
                    {/if}
                    {#if material.url}
                      <a href={material.url} target="_blank" rel="noopener noreferrer" class="material-link">
                        🔗 View Product
                      </a>
                    {/if}
                  </div>
                </td>
                <td>{material.quantity} {material.unit}</td>
                <td>{formatCurrency(material.estimatedCost)}</td>
                <td>
                  {#if material.actualCost}
                    {formatCurrency(material.actualCost)}
                  {:else}
                    <span class="text-gray">-</span>
                  {/if}
                </td>
                <td>
                  {#if material.vendor}
                    {material.vendor}
                  {:else}
                    <span class="text-gray">-</span>
                  {/if}
                </td>
                <td>
                  <span class="badge {getStatusColor(material.status)}">
                    {material.status}
                  </span>
                  {#if material.purchaseDate}
                    <div class="purchase-date">
                      {format(material.purchaseDate, 'MMM d')}
                    </div>
                  {/if}
                </td>
                <td>
                  <div class="table-actions">
                    {#if material.status === 'needed'}
                      <button 
                        class="icon-btn"
                        on:click={() => updateStatus(material.id || 0, 'ordered')}
                        title="Mark as Ordered"
                      >
                        🛒
                      </button>
                    {/if}
                    {#if material.status === 'ordered'}
                      <button 
                        class="icon-btn"
                        on:click={() => updateStatus(material.id || 0, 'received')}
                        title="Mark as Received"
                      >
                        ✅
                      </button>
                    {/if}
                    <button 
                      class="icon-btn"
                      on:click={() => startEdit(material)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      class="icon-btn danger"
                      on:click={() => deleteMaterial(material.id || 0)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .materials-list {
    height: 100%;
  }
  
  .materials-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .materials-header h3 {
    margin: 0;
  }
  
  .materials-summary {
    display: flex;
    gap: 2rem;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
  }
  
  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .summary-item .label {
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .summary-item .value {
    font-weight: 600;
  }
  
  .filter-select {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .new-material-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .new-material-form h4 {
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
  .form-group textarea {
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
  
  .materials-table {
    overflow-x: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th {
    text-align: left;
    padding: 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--gray-700);
    border-bottom: 2px solid var(--gray-200);
  }
  
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--gray-100);
  }
  
  tr:hover td {
    background: var(--gray-50);
  }
  
  .material-name {
    font-weight: 500;
  }
  
  .material-notes {
    font-size: 0.75rem;
    color: var(--gray-600);
    margin-top: 0.25rem;
  }
  
  .material-link {
    font-size: 0.75rem;
    color: var(--primary);
    text-decoration: none;
    display: inline-block;
    margin-top: 0.25rem;
  }
  
  .material-link:hover {
    text-decoration: underline;
  }
  
  .purchase-date {
    font-size: 0.75rem;
    color: var(--gray-600);
    margin-top: 0.25rem;
  }
  
  .table-actions {
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
    background: rgb(239 68 68 / 0.1);
  }
  
  .edit-form {
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
  }
  
  .edit-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .edit-row input,
  .edit-row textarea {
    flex: 1;
  }
  
  .full-width {
    width: 100%;
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
    .materials-summary {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .form-row {
      flex-direction: column;
    }
    
    .materials-table {
      font-size: 0.875rem;
    }
    
    th, td {
      padding: 0.5rem;
    }
  }
</style>