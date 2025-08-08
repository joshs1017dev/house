<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Project } from '../db/database';
  
  export let project: Project | null = null;
  
  const dispatch = createEventDispatcher();
  
  const projectTypes = [
    'Commercial Building',
    'Residential Complex',
    'Infrastructure',
    'Industrial Facility',
    'Healthcare Facility',
    'Educational Facility',
    'Retail/Hospitality',
    'Mixed Use Development',
    'Renovation/Retrofit',
    'Civil Works'
  ];
  
  const deliveryMethods = [
    'Design-Bid-Build',
    'Design-Build',
    'Construction Management at Risk',
    'Integrated Project Delivery',
    'Public-Private Partnership',
    'Fast Track',
    'Turn Key'
  ];
  
  let formData = {
    // Basic Information
    name: project?.name || '',
    projectNumber: project?.projectNumber || generateProjectNumber(),
    description: project?.description || '',
    type: project?.type || 'Commercial Building',
    deliveryMethod: project?.deliveryMethod || 'Design-Bid-Build',
    
    // Location
    address: project?.address || '',
    city: project?.city || '',
    state: project?.state || '',
    zipCode: project?.zipCode || '',
    
    // Contract Information
    contractValue: project?.budget || 0,
    contractDate: project?.contractDate ? formatDateForInput(project.contractDate) : '',
    noticeToProcceed: project?.startDate ? formatDateForInput(project.startDate) : '',
    substantialCompletion: project?.targetEndDate ? formatDateForInput(project.targetEndDate) : '',
    finalCompletion: project?.finalCompletion ? formatDateForInput(project.finalCompletion) : '',
    
    // Key Stakeholders
    owner: project?.owner || '',
    architect: project?.architect || '',
    generalContractor: project?.generalContractor || '',
    projectManager: project?.projectManager || '',
    superintendent: project?.superintendent || '',
    
    // Project Details
    squareFootage: project?.squareFootage || 0,
    numberOfFloors: project?.numberOfFloors || 1,
    constructionType: project?.constructionType || '',
    
    status: project?.status || 'planning',
    priority: project?.priority || 'medium'
  };
  
  function generateProjectNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `${year}-${random}`;
  }
  
  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  function handleSubmit(event: Event) {
    event.preventDefault();
    
    const projectData = {
      ...formData,
      budget: parseFloat(formData.contractValue.toString()) || 0,
      startDate: new Date(formData.noticeToProcceed),
      targetEndDate: formData.substantialCompletion ? new Date(formData.substantialCompletion) : undefined,
      tags: [formData.type, formData.deliveryMethod],
      category: formData.type
    };
    
    dispatch('save', projectData);
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<form on:submit={handleSubmit} class="construction-project-form">
  <div class="form-header">
    <h2>{project ? 'Edit Project' : 'New Construction Project'}</h2>
    <span class="project-number">Project #{formData.projectNumber}</span>
  </div>
  
  <div class="form-sections">
    <!-- Basic Information -->
    <section class="form-section">
      <h3>Project Information</h3>
      
      <div class="form-row">
        <div class="form-group wide">
          <label for="name">Project Name *</label>
          <input
            id="name"
            type="text"
            bind:value={formData.name}
            required
            placeholder="e.g., Downtown Office Tower"
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="type">Project Type *</label>
          <select id="type" bind:value={formData.type} required>
            {#each projectTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="delivery">Delivery Method *</label>
          <select id="delivery" bind:value={formData.deliveryMethod} required>
            {#each deliveryMethods as method}
              <option value={method}>{method}</option>
            {/each}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="description">Project Description</label>
        <textarea
          id="description"
          bind:value={formData.description}
          rows="4"
          placeholder="Provide a detailed project description including scope of work..."
        ></textarea>
      </div>
    </section>
    
    <!-- Location -->
    <section class="form-section">
      <h3>Project Location</h3>
      
      <div class="form-group">
        <label for="address">Street Address</label>
        <input
          id="address"
          type="text"
          bind:value={formData.address}
          placeholder="123 Main Street"
        />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="city">City</label>
          <input
            id="city"
            type="text"
            bind:value={formData.city}
          />
        </div>
        
        <div class="form-group small">
          <label for="state">State</label>
          <input
            id="state"
            type="text"
            bind:value={formData.state}
            maxlength="2"
          />
        </div>
        
        <div class="form-group">
          <label for="zip">ZIP Code</label>
          <input
            id="zip"
            type="text"
            bind:value={formData.zipCode}
          />
        </div>
      </div>
    </section>
    
    <!-- Contract Information -->
    <section class="form-section">
      <h3>Contract Information</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="contractValue">Contract Value *</label>
          <input
            id="contractValue"
            type="number"
            bind:value={formData.contractValue}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        
        <div class="form-group">
          <label for="contractDate">Contract Date</label>
          <input
            id="contractDate"
            type="date"
            bind:value={formData.contractDate}
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="ntp">Notice to Proceed *</label>
          <input
            id="ntp"
            type="date"
            bind:value={formData.noticeToProcceed}
            required
          />
        </div>
        
        <div class="form-group">
          <label for="substantial">Substantial Completion</label>
          <input
            id="substantial"
            type="date"
            bind:value={formData.substantialCompletion}
          />
        </div>
        
        <div class="form-group">
          <label for="final">Final Completion</label>
          <input
            id="final"
            type="date"
            bind:value={formData.finalCompletion}
          />
        </div>
      </div>
    </section>
    
    <!-- Key Stakeholders -->
    <section class="form-section">
      <h3>Key Stakeholders</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="owner">Owner/Client</label>
          <input
            id="owner"
            type="text"
            bind:value={formData.owner}
            placeholder="Company or individual name"
          />
        </div>
        
        <div class="form-group">
          <label for="architect">Architect/Engineer</label>
          <input
            id="architect"
            type="text"
            bind:value={formData.architect}
            placeholder="Design firm name"
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="gc">General Contractor</label>
          <input
            id="gc"
            type="text"
            bind:value={formData.generalContractor}
            placeholder="If different from your company"
          />
        </div>
        
        <div class="form-group">
          <label for="pm">Project Manager</label>
          <input
            id="pm"
            type="text"
            bind:value={formData.projectManager}
            placeholder="PM name"
          />
        </div>
        
        <div class="form-group">
          <label for="super">Superintendent</label>
          <input
            id="super"
            type="text"
            bind:value={formData.superintendent}
            placeholder="Site superintendent"
          />
        </div>
      </div>
    </section>
    
    <!-- Project Details -->
    <section class="form-section">
      <h3>Project Details</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="sqft">Square Footage</label>
          <input
            id="sqft"
            type="number"
            bind:value={formData.squareFootage}
            min="0"
          />
        </div>
        
        <div class="form-group">
          <label for="floors">Number of Floors</label>
          <input
            id="floors"
            type="number"
            bind:value={formData.numberOfFloors}
            min="1"
          />
        </div>
        
        <div class="form-group">
          <label for="construction">Construction Type</label>
          <input
            id="construction"
            type="text"
            bind:value={formData.constructionType}
            placeholder="e.g., Type II-B"
          />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="status">Project Status</label>
          <select id="status" bind:value={formData.status}>
            <option value="planning">Pre-Construction</option>
            <option value="active">Active Construction</option>
            <option value="paused">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="priority">Priority</label>
          <select id="priority" bind:value={formData.priority}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </section>
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
  .construction-project-form {
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }
  
  .form-header h2 {
    margin: 0;
    color: #1f2937;
  }
  
  .project-number {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 600;
    background: #f3f4f6;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
  }
  
  .form-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .form-section {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }
  
  .form-section h3 {
    margin: 0 0 1.5rem;
    font-size: 1.125rem;
    color: #374151;
    font-weight: 600;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  .form-group.wide {
    grid-column: 1 / -1;
  }
  
  .form-group.small {
    max-width: 100px;
  }
  
  .form-group label {
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #374151;
    font-size: 0.875rem;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    transition: all 0.2s;
    background: white;
  }
  
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    font-weight: 600;
    transition: all 0.2s;
    cursor: pointer;
    border: none;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }
  
  .btn-secondary:hover {
    background: #d1d5db;
  }
  
  @media (max-width: 768px) {
    .construction-project-form {
      padding: 1rem;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .form-section {
      padding: 1rem;
    }
  }
</style>