<script lang="ts">
  import { onMount } from 'svelte';
  import Navigation from './lib/components/Navigation.svelte';
  import MobileNavigation from './lib/components/MobileNavigation.svelte';
  import Dashboard from './lib/views/Dashboard.svelte';
  import Projects from './lib/views/Projects.svelte';
  import ConstructionProjects from './lib/views/ConstructionProjects.svelte';
  import ProjectDetail from './lib/views/ProjectDetail.svelte';
  import Materials from './lib/views/Materials.svelte';
  import Expenses from './lib/views/Expenses.svelte';
  import Tools from './lib/views/Tools.svelte';
  import Maintenance from './lib/views/Maintenance.svelte';
  import MaterialCalculator from './lib/components/MaterialCalculator.svelte';
  import ShoppingList from './lib/components/ShoppingList.svelte';
  import ProjectForm from './lib/components/ProjectForm.svelte';
  import ConstructionProjectForm from './lib/components/ConstructionProjectForm.svelte';
  import MasterSchedule from './lib/views/MasterSchedule.svelte';
  import WorkBreakdownStructure from './lib/views/WorkBreakdownStructure.svelte';
  import SchedulingView from './lib/views/SchedulingView.svelte';
  import { projects, tasks, materials, expenses, rooms } from './lib/stores';
  
  let currentView = 'dashboard';
  let selectedProjectId: number | null = null;
  let showProjectForm = false;
  let editingProject = null;
  let mobileMenuOpen = false;
  let windowWidth = 0;
  
  onMount(async () => {
    // Load initial data
    await projects.load();
    await rooms.load();
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  });
  
  function handleNavigate(event: CustomEvent<string>) {
    currentView = event.detail;
    selectedProjectId = null;
  }
  
  function handleNewProject() {
    editingProject = null;
    showProjectForm = true;
  }
  
  function handleProjectSelect(event: CustomEvent<number>) {
    selectedProjectId = event.detail;
    currentView = 'project-detail';
  }
  
  function handleProjectEdit(event: CustomEvent<any>) {
    editingProject = event.detail;
    showProjectForm = true;
  }
  
  async function handleProjectSave(event: CustomEvent<any>) {
    const project = event.detail;
    
    if (editingProject?.id) {
      await projects.update(editingProject.id, project);
    } else {
      await projects.add(project);
    }
    
    showProjectForm = false;
    editingProject = null;
  }
  
  function handleProjectFormCancel() {
    showProjectForm = false;
    editingProject = null;
  }
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div class="app">
  <!-- Desktop Navigation -->
  {#if windowWidth > 768}
    <Navigation 
      {currentView} 
      on:navigate={handleNavigate}
      on:newProject={handleNewProject}
    />
  {/if}
  
  <!-- Mobile Navigation -->
  {#if windowWidth <= 768}
    <MobileNavigation
      {currentView}
      bind:isOpen={mobileMenuOpen}
      on:navigate={handleNavigate}
      on:newProject={handleNewProject}
    />
  {/if}
  
  <main class="main-content">
    <div class="content-header">
      <h2 class="page-title">
        {#if currentView === 'dashboard'}
          Project Dashboard
        {:else if currentView === 'projects'}
          Active Projects
        {:else if currentView === 'schedule'}
          Master Schedule
        {:else if currentView === 'scheduling'}
          Advanced Scheduling
        {:else if currentView === 'wbs'}
          Work Breakdown Structure
        {:else if currentView === 'dailylog'}
          Daily Reports
        {:else if currentView === 'workforce'}
          Workforce Management
        {:else if currentView === 'equipment'}
          Equipment Tracking
        {:else if currentView === 'safety'}
          Safety Management
        {:else if currentView === 'submittals'}
          Submittal Log
        {:else if currentView === 'rfis'}
          Request for Information
        {:else if currentView === 'drawings'}
          Drawing Management
        {:else if currentView === 'specs'}
          Specifications
        {:else if currentView === 'budget'}
          Budget Tracking
        {:else if currentView === 'changeorders'}
          Change Orders
        {:else if currentView === 'invoices'}
          Invoice Management
        {:else if currentView === 'payapps'}
          Pay Applications
        {:else}
          {currentView}
        {/if}
      </h2>
      <div class="header-actions">
        <span class="current-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
    
    <div class="content-body">
      {#if currentView === 'dashboard'}
        <Dashboard on:selectProject={handleProjectSelect} />
      {:else if currentView === 'projects'}
        <ConstructionProjects 
          on:selectProject={handleProjectSelect}
          on:editProject={handleProjectEdit}
        />
      {:else if currentView === 'project-detail' && selectedProjectId}
        <ProjectDetail 
          projectId={selectedProjectId}
          on:back={() => currentView = 'projects'}
        />
      {:else if currentView === 'materials'}
        <Materials />
      {:else if currentView === 'expenses'}
        <Expenses />
      {:else if currentView === 'calculator'}
        <MaterialCalculator />
      {:else if currentView === 'shopping'}
        <ShoppingList />
      {:else if currentView === 'tools' || currentView === 'equipment'}
        <Tools />
      {:else if currentView === 'maintenance'}
        <Maintenance />
      {:else if currentView === 'schedule'}
        <MasterSchedule />
      {:else if currentView === 'scheduling'}
        <SchedulingView />
      {:else if currentView === 'wbs'}
        <WorkBreakdownStructure />
      {:else}
        <div class="coming-soon">
          <h3>🚧 Under Construction</h3>
          <p>This feature is coming soon to CONSTRUCT Professional Edition</p>
        </div>
      {/if}
    </div>
  </main>
  
  {#if showProjectForm}
    <div class="modal-overlay" on:click={handleProjectFormCancel}>
      <div class="modal-content" on:click|stopPropagation>
        <ConstructionProjectForm
          project={editingProject}
          on:save={handleProjectSave}
          on:cancel={handleProjectFormCancel}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #f9fafb;
    color: #111827;
  }
  
  :global(:root) {
    --primary: #3b82f6;
    --secondary: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --radius-sm: 0.25rem;
    --radius: 0.375rem;
    --radius-lg: 0.5rem;
  }
  
  :global(button) {
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    transition: all 0.2s;
  }
  
  :global(button:hover) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  :global(button:active) {
    transform: translateY(0);
  }
  
  :global(input, textarea, select) {
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    padding: 0.5rem 0.75rem;
    font-family: inherit;
    font-size: inherit;
    transition: border-color 0.2s;
  }
  
  :global(input:focus, textarea:focus, select:focus) {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  :global(h1) {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  
  :global(h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  :global(h3) {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  :global(.card) {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    padding: 1.5rem;
  }
  
  :global(.btn-primary) {
    background: var(--primary);
    color: white;
    padding: 0.5rem 1.25rem;
  }
  
  :global(.btn-primary:hover) {
    background: #2563eb;
  }
  
  :global(.btn-secondary) {
    background: var(--gray-200);
    color: var(--gray-700);
    padding: 0.5rem 1.25rem;
  }
  
  :global(.btn-secondary:hover) {
    background: var(--gray-300);
  }
  
  :global(.btn-danger) {
    background: var(--danger);
    color: white;
    padding: 0.5rem 1.25rem;
  }
  
  :global(.btn-danger:hover) {
    background: #dc2626;
  }
  
  .app {
    display: flex;
    min-height: 100vh;
    background: #f3f4f6;
  }
  
  .main-content {
    margin-left: 280px;
    flex: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    transition: margin-left 0.3s ease;
  }
  
  @media (max-width: 768px) {
    .main-content {
      margin-left: 0;
      margin-top: 56px; /* Height of mobile header */
    }
  }
  
  .content-header {
    background: white;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .page-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }
  
  .current-date {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .content-body {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }
  
  .coming-soon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .coming-soon h3 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }
  
  .coming-soon p {
    color: #6b7280;
  }
  
  .modal-overlay {
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
  }
  
  .modal-content {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  @media (max-width: 768px) {
    .content-body {
      padding: 1rem;
    }
    
    .content-header {
      padding: 1rem;
    }
    
    .page-title {
      font-size: 1.5rem;
    }
    
    .header-actions {
      display: none; /* Hide date on mobile to save space */
    }
    
    .modal-content {
      max-width: 95%;
      margin: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    .content-body {
      padding: 0.75rem;
    }
    
    .page-title {
      font-size: 1.25rem;
    }
  }
  
  /* Touch-friendly adjustments */
  @media (pointer: coarse) {
    :global(button) {
      min-height: 44px;
      min-width: 44px;
    }
    
    :global(input, select, textarea) {
      min-height: 44px;
      font-size: 16px; /* Prevents zoom on iOS */
    }
  }
</style>