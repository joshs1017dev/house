<script lang="ts">
  import { onMount } from 'svelte';
  import { projects } from './lib/stores/projects';
  import Dashboard from './lib/components/Dashboard.svelte';
  import ProjectList from './lib/components/ProjectList.svelte';
  import ProjectDetail from './lib/components/ProjectDetail.svelte';
  import Navigation from './lib/components/Navigation.svelte';
  import NewProjectModal from './lib/components/NewProjectModal.svelte';
  
  let currentView: 'dashboard' | 'projects' | 'project-detail' | 'tools' | 'maintenance' = 'dashboard';
  let selectedProjectId: number | null = null;
  let showNewProjectModal = false;

  onMount(async () => {
    try {
      await projects.load();
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('SW registration failed:', err);
      });
    }
  });

  function handleNavigation(event: CustomEvent<string>) {
    currentView = event.detail as any;
    if (currentView !== 'project-detail') {
      selectedProjectId = null;
    }
  }

  function handleProjectSelect(event: CustomEvent<number>) {
    selectedProjectId = event.detail;
    currentView = 'project-detail';
  }

  function handleNewProject() {
    showNewProjectModal = true;
  }

  function handleBackToProjects() {
    currentView = 'projects';
    selectedProjectId = null;
  }
</script>

<div class="app">
  <Navigation {currentView} on:navigate={handleNavigation} on:newProject={handleNewProject} />
  
  <main class="main-content">
    {#if currentView === 'dashboard'}
      <Dashboard on:selectProject={handleProjectSelect} />
    {:else if currentView === 'projects'}
      <ProjectList on:selectProject={handleProjectSelect} on:newProject={handleNewProject} />
    {:else if currentView === 'project-detail' && selectedProjectId}
      <ProjectDetail projectId={selectedProjectId} on:back={handleBackToProjects} />
    {:else if currentView === 'tools'}
      <div class="container p-6">
        <h1>Tool Inventory</h1>
        <p class="text-gray mt-2">Coming soon...</p>
      </div>
    {:else if currentView === 'maintenance'}
      <div class="container p-6">
        <h1>Maintenance Schedule</h1>
        <p class="text-gray mt-2">Coming soon...</p>
      </div>
    {/if}
  </main>

  {#if showNewProjectModal}
    <NewProjectModal on:close={() => showNewProjectModal = false} />
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    background: var(--gray-50);
    overflow-y: auto;
  }
</style>