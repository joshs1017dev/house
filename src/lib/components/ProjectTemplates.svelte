<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { projects } from '../stores';
  import { db } from '../db/database';
  
  const dispatch = createEventDispatcher();
  
  const templates = [
    {
      name: 'Bathroom Renovation',
      category: 'renovation',
      description: 'Complete bathroom remodel including fixtures, tile, and vanity',
      estimatedBudget: 8000,
      estimatedDuration: 14,
      tasks: [
        'Plan layout and design',
        'Obtain permits',
        'Demo existing bathroom',
        'Rough plumbing',
        'Electrical work',
        'Install drywall',
        'Install tile flooring',
        'Install shower/tub',
        'Install vanity and fixtures',
        'Paint walls',
        'Final inspection'
      ],
      materials: [
        { name: 'Vanity', quantity: 1, unit: 'unit', estimatedCost: 800 },
        { name: 'Toilet', quantity: 1, unit: 'unit', estimatedCost: 400 },
        { name: 'Shower fixtures', quantity: 1, unit: 'set', estimatedCost: 500 },
        { name: 'Floor tile', quantity: 50, unit: 'sq ft', estimatedCost: 250 },
        { name: 'Wall tile', quantity: 80, unit: 'sq ft', estimatedCost: 400 },
        { name: 'Drywall', quantity: 10, unit: 'sheets', estimatedCost: 150 },
        { name: 'Paint', quantity: 2, unit: 'gallons', estimatedCost: 80 }
      ]
    },
    {
      name: 'Kitchen Cabinet Refresh',
      category: 'upgrade',
      description: 'Update kitchen cabinets with paint and new hardware',
      estimatedBudget: 1500,
      estimatedDuration: 5,
      tasks: [
        'Remove cabinet doors and hardware',
        'Clean and sand surfaces',
        'Prime cabinets',
        'Paint cabinet boxes',
        'Paint cabinet doors',
        'Install new hardware',
        'Rehang doors and adjust'
      ],
      materials: [
        { name: 'Cabinet paint', quantity: 3, unit: 'gallons', estimatedCost: 150 },
        { name: 'Primer', quantity: 2, unit: 'gallons', estimatedCost: 60 },
        { name: 'Cabinet handles', quantity: 20, unit: 'pieces', estimatedCost: 160 },
        { name: 'Hinges', quantity: 30, unit: 'pieces', estimatedCost: 120 },
        { name: 'Sandpaper', quantity: 10, unit: 'sheets', estimatedCost: 20 },
        { name: 'Brushes/rollers', quantity: 1, unit: 'set', estimatedCost: 40 }
      ]
    },
    {
      name: 'Deck Building',
      category: 'construction',
      description: 'Build a 12x16 ft pressure-treated wood deck',
      estimatedBudget: 5000,
      estimatedDuration: 7,
      tasks: [
        'Design deck layout',
        'Obtain building permit',
        'Mark utilities',
        'Dig post holes',
        'Install posts and concrete',
        'Install beams and joists',
        'Install decking boards',
        'Build stairs',
        'Install railings',
        'Apply deck stain'
      ],
      materials: [
        { name: '6x6 Posts', quantity: 6, unit: 'pieces', estimatedCost: 300 },
        { name: '2x10 Joists', quantity: 20, unit: 'pieces', estimatedCost: 600 },
        { name: '5/4 Decking', quantity: 300, unit: 'sq ft', estimatedCost: 1200 },
        { name: 'Concrete', quantity: 12, unit: 'bags', estimatedCost: 96 },
        { name: 'Joist hangers', quantity: 40, unit: 'pieces', estimatedCost: 120 },
        { name: 'Deck screws', quantity: 25, unit: 'lbs', estimatedCost: 200 },
        { name: 'Railing system', quantity: 1, unit: 'set', estimatedCost: 800 }
      ]
    },
    {
      name: 'Basement Waterproofing',
      category: 'repair',
      description: 'Waterproof basement walls and install drainage',
      estimatedBudget: 3500,
      estimatedDuration: 5,
      tasks: [
        'Clean and inspect walls',
        'Repair cracks',
        'Apply waterproofing membrane',
        'Install interior drain tile',
        'Install sump pump',
        'Test system'
      ],
      materials: [
        { name: 'Waterproofing membrane', quantity: 5, unit: 'gallons', estimatedCost: 250 },
        { name: 'Hydraulic cement', quantity: 10, unit: 'bags', estimatedCost: 150 },
        { name: 'Drain tile', quantity: 100, unit: 'ft', estimatedCost: 400 },
        { name: 'Sump pump', quantity: 1, unit: 'unit', estimatedCost: 300 },
        { name: 'Gravel', quantity: 2, unit: 'yards', estimatedCost: 100 },
        { name: 'PVC pipe', quantity: 50, unit: 'ft', estimatedCost: 100 }
      ]
    },
    {
      name: 'Hardwood Floor Installation',
      category: 'flooring',
      description: 'Install hardwood flooring in living areas',
      estimatedBudget: 6000,
      estimatedDuration: 4,
      tasks: [
        'Remove existing flooring',
        'Level subfloor',
        'Install moisture barrier',
        'Layout flooring pattern',
        'Install hardwood',
        'Sand floors',
        'Apply finish coats',
        'Install transitions and trim'
      ],
      materials: [
        { name: 'Hardwood flooring', quantity: 500, unit: 'sq ft', estimatedCost: 2500 },
        { name: 'Underlayment', quantity: 500, unit: 'sq ft', estimatedCost: 200 },
        { name: 'Floor nails', quantity: 10, unit: 'boxes', estimatedCost: 100 },
        { name: 'Wood filler', quantity: 2, unit: 'containers', estimatedCost: 40 },
        { name: 'Polyurethane finish', quantity: 3, unit: 'gallons', estimatedCost: 150 },
        { name: 'Transitions', quantity: 10, unit: 'pieces', estimatedCost: 150 }
      ]
    },
    {
      name: 'Garage Organization',
      category: 'organization',
      description: 'Install shelving and organization systems in garage',
      estimatedBudget: 1200,
      estimatedDuration: 2,
      tasks: [
        'Plan layout',
        'Clear and clean garage',
        'Install wall-mounted shelving',
        'Install overhead storage',
        'Set up workbench',
        'Install tool organization',
        'Label storage areas'
      ],
      materials: [
        { name: 'Wall shelving units', quantity: 4, unit: 'units', estimatedCost: 400 },
        { name: 'Overhead storage', quantity: 2, unit: 'units', estimatedCost: 300 },
        { name: 'Workbench', quantity: 1, unit: 'unit', estimatedCost: 250 },
        { name: 'Pegboard', quantity: 3, unit: 'sheets', estimatedCost: 90 },
        { name: 'Storage bins', quantity: 20, unit: 'bins', estimatedCost: 100 },
        { name: 'Mounting hardware', quantity: 1, unit: 'set', estimatedCost: 60 }
      ]
    }
  ];
  
  let selectedTemplate: any = null;
  let customizing = false;
  let projectName = '';
  let projectDescription = '';
  let projectBudget = 0;
  let startDate = new Date().toISOString().split('T')[0];
  
  function selectTemplate(template: any) {
    selectedTemplate = template;
    projectName = template.name;
    projectDescription = template.description;
    projectBudget = template.estimatedBudget;
    customizing = true;
  }
  
  async function createProjectFromTemplate() {
    if (!selectedTemplate || !projectName) return;
    
    // Create project
    const projectId = await projects.add({
      name: projectName,
      description: projectDescription,
      startDate: new Date(startDate),
      targetEndDate: new Date(Date.now() + selectedTemplate.estimatedDuration * 24 * 60 * 60 * 1000),
      status: 'planning',
      priority: 'medium',
      budget: projectBudget,
      tags: [selectedTemplate.category]
    });
    
    // Create tasks
    for (let i = 0; i < selectedTemplate.tasks.length; i++) {
      await db.tasks.add({
        projectId,
        title: selectedTemplate.tasks[i],
        status: 'pending',
        priority: 'medium',
        order: i + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create materials
    for (const material of selectedTemplate.materials) {
      await db.materials.add({
        projectId,
        name: material.name,
        quantity: material.quantity,
        unit: material.unit,
        estimatedCost: material.estimatedCost,
        status: 'needed'
      });
    }
    
    // Close and navigate to project
    customizing = false;
    dispatch('projectCreated', projectId);
  }
  
  function cancel() {
    customizing = false;
    selectedTemplate = null;
  }
</script>

<div class="templates">
  <h2>🏗️ Project Templates</h2>
  <p class="subtitle">Start with a pre-built template for common home improvement projects</p>
  
  {#if !customizing}
    <div class="template-grid">
      {#each templates as template}
        <div class="template-card" on:click={() => selectTemplate(template)}>
          <div class="template-header">
            <h3>{template.name}</h3>
            <span class="category-badge">{template.category}</span>
          </div>
          <p class="template-description">{template.description}</p>
          <div class="template-stats">
            <div class="stat">
              <span class="label">Est. Budget</span>
              <span class="value">${template.estimatedBudget.toLocaleString()}</span>
            </div>
            <div class="stat">
              <span class="label">Duration</span>
              <span class="value">{template.estimatedDuration} days</span>
            </div>
            <div class="stat">
              <span class="label">Tasks</span>
              <span class="value">{template.tasks.length}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="customize-form card">
      <h3>Customize Your Project</h3>
      <p>Based on: {selectedTemplate.name}</p>
      
      <div class="form-group">
        <label for="project-name">Project Name</label>
        <input
          id="project-name"
          type="text"
          bind:value={projectName}
          placeholder="Enter project name"
        />
      </div>
      
      <div class="form-group">
        <label for="project-description">Description</label>
        <textarea
          id="project-description"
          bind:value={projectDescription}
          rows="3"
          placeholder="Project description"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="project-budget">Budget</label>
          <input
            id="project-budget"
            type="number"
            bind:value={projectBudget}
            min="0"
            step="100"
          />
        </div>
        
        <div class="form-group">
          <label for="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            bind:value={startDate}
          />
        </div>
      </div>
      
      <div class="template-preview">
        <h4>This template includes:</h4>
        <div class="preview-section">
          <h5>Tasks ({selectedTemplate.tasks.length})</h5>
          <ul class="task-list">
            {#each selectedTemplate.tasks.slice(0, 5) as task}
              <li>{task}</li>
            {/each}
            {#if selectedTemplate.tasks.length > 5}
              <li class="more">...and {selectedTemplate.tasks.length - 5} more</li>
            {/if}
          </ul>
        </div>
        
        <div class="preview-section">
          <h5>Materials ({selectedTemplate.materials.length})</h5>
          <ul class="material-list">
            {#each selectedTemplate.materials.slice(0, 3) as material}
              <li>{material.quantity} {material.unit} - {material.name}</li>
            {/each}
            {#if selectedTemplate.materials.length > 3}
              <li class="more">...and {selectedTemplate.materials.length - 3} more</li>
            {/if}
          </ul>
        </div>
      </div>
      
      <div class="form-actions">
        <button class="btn-secondary" on:click={cancel}>
          Cancel
        </button>
        <button class="btn-primary" on:click={createProjectFromTemplate}>
          Create Project
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .templates {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .subtitle {
    color: var(--gray-600);
    margin-bottom: 2rem;
  }
  
  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .template-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .template-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
  }
  
  .template-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .category-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    background: var(--gray-100);
    color: var(--gray-700);
    border-radius: 999px;
    text-transform: capitalize;
  }
  
  .template-description {
    color: var(--gray-600);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  
  .template-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  
  .stat {
    text-align: center;
  }
  
  .stat .label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: 0.25rem;
  }
  
  .stat .value {
    display: block;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .customize-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .customize-form h3 {
    margin-top: 0;
  }
  
  .customize-form > p {
    color: var(--gray-600);
    margin-bottom: 1.5rem;
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
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    font-size: 1rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .template-preview {
    background: var(--gray-50);
    padding: 1.5rem;
    border-radius: var(--radius);
    margin: 2rem 0;
  }
  
  .template-preview h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .preview-section {
    margin-bottom: 1.5rem;
  }
  
  .preview-section:last-child {
    margin-bottom: 0;
  }
  
  .preview-section h5 {
    margin-bottom: 0.75rem;
    color: var(--gray-700);
  }
  
  .task-list,
  .material-list {
    list-style: none;
    padding: 0;
  }
  
  .task-list li,
  .material-list li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
  }
  
  .task-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--secondary);
  }
  
  .material-list li::before {
    content: '•';
    position: absolute;
    left: 0.5rem;
    color: var(--primary);
  }
  
  .more {
    font-style: italic;
    color: var(--gray-600);
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  @media (max-width: 768px) {
    .template-grid {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>