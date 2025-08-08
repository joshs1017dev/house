<script lang="ts">
  import { onMount } from 'svelte';
  import { projects } from '../stores';
  import { db } from '../db/database';
  import type { Project, Task, ProjectPhase } from '../db/database';
  import WBSTreeNode from '../components/WBSTreeNode.svelte';
  import WBSOutlineNode from '../components/WBSOutlineNode.svelte';
  
  let selectedProject: Project | null = null;
  let allProjects: Project[] = [];
  let projectTasks: Task[] = [];
  let projectPhases: ProjectPhase[] = [];
  let viewMode: 'tree' | 'chart' | 'outline' = 'tree';
  let expandedNodes = new Set<string>();
  let showWBSCode = true;
  let wbsLevel = 3; // How many levels deep to show
  
  // WBS Node structure
  interface WBSNode {
    id: string;
    code: string;
    name: string;
    type: 'project' | 'phase' | 'task' | 'subtask';
    level: number;
    children: WBSNode[];
    data: Project | ProjectPhase | Task;
    work?: number; // estimated hours
    cost?: number;
    resources?: string[];
    progress?: number;
  }
  
  onMount(async () => {
    await loadProjects();
  });
  
  async function loadProjects() {
    await projects.load();
    allProjects = await db.projects.toArray();
    if (allProjects.length > 0 && !selectedProject) {
      selectedProject = allProjects[0];
      await loadProjectData();
    }
  }
  
  async function loadProjectData() {
    if (!selectedProject) return;
    
    projectPhases = await db.projectPhases
      .where('projectId')
      .equals(selectedProject.id!)
      .sortBy('order');
      
    projectTasks = await db.tasks
      .where('projectId')
      .equals(selectedProject.id!)
      .toArray();
  }
  
  function buildWBSTree(): WBSNode | null {
    if (!selectedProject) return null;
    
    const root: WBSNode = {
      id: `project-${selectedProject.id}`,
      code: '1',
      name: selectedProject.name,
      type: 'project',
      level: 1,
      children: [],
      data: selectedProject,
      work: 0,
      cost: selectedProject.budget,
      progress: selectedProject.completionPercentage || 0
    };
    
    // Add phases as level 2
    projectPhases.forEach((phase, phaseIndex) => {
      const phaseNode: WBSNode = {
        id: `phase-${phase.id}`,
        code: `1.${phaseIndex + 1}`,
        name: phase.name,
        type: 'phase',
        level: 2,
        children: [],
        data: phase,
        work: 0,
        cost: 0,
        progress: phase.percentComplete || 0
      };
      
      // Add tasks under phases
      const phaseTasks = projectTasks.filter(t => t.phaseId === phase.id && !t.parentTaskId);
      phaseTasks.forEach((task, taskIndex) => {
        const taskNode = buildTaskNode(task, `${phaseNode.code}.${taskIndex + 1}`, 3);
        phaseNode.children.push(taskNode);
        phaseNode.work! += taskNode.work || 0;
      });
      
      root.children.push(phaseNode);
    });
    
    // Add tasks without phases
    const orphanTasks = projectTasks.filter(t => !t.phaseId && !t.parentTaskId);
    orphanTasks.forEach((task, index) => {
      const taskNode = buildTaskNode(task, `1.${projectPhases.length + index + 1}`, 2);
      root.children.push(taskNode);
    });
    
    // Calculate total work
    root.work = root.children.reduce((sum, child) => sum + (child.work || 0), 0);
    
    return root;
  }
  
  function buildTaskNode(task: Task, code: string, level: number): WBSNode {
    const node: WBSNode = {
      id: `task-${task.id}`,
      code,
      name: task.title,
      type: level > 3 ? 'subtask' : 'task',
      level,
      children: [],
      data: task,
      work: task.estimatedHours || 0,
      cost: 0,
      resources: task.assignedTo ? [task.assignedTo] : [],
      progress: task.percentComplete || 0
    };
    
    // Add subtasks
    if (level <= wbsLevel) {
      const subtasks = projectTasks.filter(t => t.parentTaskId === task.id);
      subtasks.forEach((subtask, index) => {
        const subtaskNode = buildTaskNode(subtask, `${code}.${index + 1}`, level + 1);
        node.children.push(subtaskNode);
        node.work! += subtaskNode.work || 0;
      });
    }
    
    return node;
  }
  
  function toggleNode(nodeId: string) {
    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId);
    } else {
      expandedNodes.add(nodeId);
    }
    expandedNodes = expandedNodes;
  }
  
  function expandAll() {
    const tree = buildWBSTree();
    if (!tree) return;
    
    function collectIds(node: WBSNode) {
      expandedNodes.add(node.id);
      node.children.forEach(collectIds);
    }
    
    collectIds(tree);
    expandedNodes = expandedNodes;
  }
  
  function collapseAll() {
    expandedNodes.clear();
    expandedNodes = expandedNodes;
  }
  
  function exportWBS() {
    const tree = buildWBSTree();
    if (!tree) return;
    
    const rows: any[] = [];
    
    function traverseNode(node: WBSNode, indent: string = '') {
      rows.push({
        'WBS Code': node.code,
        'Name': indent + node.name,
        'Type': node.type,
        'Work (Hours)': node.work || 0,
        'Progress': `${node.progress || 0}%`,
        'Resources': node.resources?.join(', ') || ''
      });
      
      node.children.forEach(child => traverseNode(child, indent + '  '));
    }
    
    traverseNode(tree);
    
    // Convert to CSV
    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    const csv = [headers, ...csvRows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wbs-${selectedProject?.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function getNodeIcon(type: string): string {
    switch (type) {
      case 'project': return '🏗️';
      case 'phase': return '📁';
      case 'task': return '📋';
      case 'subtask': return '📌';
      default: return '•';
    }
  }
  
  function getProgressColor(progress: number): string {
    if (progress >= 80) return '#10b981';
    if (progress >= 50) return '#3b82f6';
    if (progress >= 20) return '#f59e0b';
    return '#6b7280';
  }
  
  $: wbsTree = buildWBSTree();
</script>

<div class="wbs-container">
  <div class="wbs-header">
    <h2>Work Breakdown Structure</h2>
    <div class="header-actions">
      <select bind:value={selectedProject} on:change={loadProjectData}>
        {#each allProjects as project}
          <option value={project}>{project.name}</option>
        {/each}
      </select>
      
      <button class="btn-secondary" on:click={exportWBS}>
        📥 Export WBS
      </button>
    </div>
  </div>
  
  <div class="wbs-controls">
    <div class="view-controls">
      <button 
        class:active={viewMode === 'tree'}
        on:click={() => viewMode = 'tree'}
      >
        🌳 Tree View
      </button>
      <button 
        class:active={viewMode === 'chart'}
        on:click={() => viewMode = 'chart'}
      >
        📊 Chart View
      </button>
      <button 
        class:active={viewMode === 'outline'}
        on:click={() => viewMode = 'outline'}
      >
        📝 Outline View
      </button>
    </div>
    
    <div class="tree-controls">
      <button class="btn-small" on:click={expandAll}>Expand All</button>
      <button class="btn-small" on:click={collapseAll}>Collapse All</button>
      
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showWBSCode} />
        Show WBS Codes
      </label>
      
      <label class="level-control">
        Levels:
        <input 
          type="number" 
          bind:value={wbsLevel} 
          min="1" 
          max="6"
        />
      </label>
    </div>
  </div>
  
  <div class="wbs-content">
    {#if wbsTree}
      {#if viewMode === 'tree'}
        <div class="tree-view">
          <WBSTreeNode 
            node={wbsTree} 
            {expandedNodes} 
            {showWBSCode}
            on:toggle={(e) => toggleNode(e.detail)}
          />
        </div>
        
      {:else if viewMode === 'chart'}
        <div class="chart-view">
          <div class="wbs-chart">
            <!-- Simplified chart view -->
            <div class="chart-node-container">
              <div class="chart-node">
                <div class="chart-node-header">
                  {#if showWBSCode}
                    <span class="node-code">{wbsTree.code}</span>
                  {/if}
                  <span class="node-icon">{getNodeIcon(wbsTree.type)}</span>
                </div>
                <div class="chart-node-body">
                  <h4>{wbsTree.name}</h4>
                  <p>Total Work: {wbsTree.work}h</p>
                  <div class="progress-bar">
                    <div 
                      class="progress-fill"
                      style="width: {wbsTree.progress}%; background: {getProgressColor(wbsTree.progress)}"
                    ></div>
                  </div>
                </div>
              </div>
              
              {#if wbsTree.children.length > 0}
                <div class="chart-children">
                  {#each wbsTree.children as child}
                    <div class="chart-node">
                      <div class="chart-node-header">
                        {#if showWBSCode}
                          <span class="node-code">{child.code}</span>
                        {/if}
                        <span class="node-icon">{getNodeIcon(child.type)}</span>
                      </div>
                      <div class="chart-node-body">
                        <h5>{child.name}</h5>
                        {#if child.work}
                          <p>{child.work}h</p>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
        
      {:else if viewMode === 'outline'}
        <div class="outline-view">
          <div class="outline-content">
            <WBSOutlineNode node={wbsTree} {showWBSCode} />
          </div>
        </div>
      {/if}
    {:else}
      <p class="empty-state">Select a project to view its WBS</p>
    {/if}
  </div>
  
  {#if wbsTree}
    <div class="wbs-summary">
      <div class="summary-card">
        <h4>Total Work</h4>
        <p class="summary-value">{wbsTree.work} hours</p>
      </div>
      <div class="summary-card">
        <h4>Total Cost</h4>
        <p class="summary-value">${(wbsTree.cost || 0).toLocaleString()}</p>
      </div>
      <div class="summary-card">
        <h4>Overall Progress</h4>
        <p class="summary-value">{wbsTree.progress}%</p>
      </div>
      <div class="summary-card">
        <h4>Total Tasks</h4>
        <p class="summary-value">{projectTasks.length}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .wbs-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .wbs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .wbs-header h2 {
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .header-actions select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
  }
  
  .wbs-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .view-controls {
    display: flex;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.375rem;
  }
  
  .view-controls button {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }
  
  .view-controls button:hover {
    background: #e5e7eb;
  }
  
  .view-controls button.active {
    background: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .tree-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .btn-small {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    background: #e5e7eb;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-small:hover {
    background: #d1d5db;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .level-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .level-control input {
    width: 3rem;
    padding: 0.25rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
  }
  
  .wbs-content {
    flex: 1;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: auto;
    padding: 2rem;
  }
  
  /* Tree View Styles */
  .tree-view {
    font-family: monospace;
  }
  
  /* Chart View Styles */
  .chart-view {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }
  
  .wbs-chart {
    display: inline-block;
  }
  
  .chart-node-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 1rem;
  }
  
  .chart-node {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    min-width: 200px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin: 0.5rem;
  }
  
  .chart-node-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .chart-node-header .node-code {
    font-weight: 600;
    color: #3b82f6;
    font-family: monospace;
  }
  
  .chart-node-header .node-icon {
    font-size: 1.125rem;
  }
  
  .chart-node-body h4,
  .chart-node-body h5 {
    margin: 0 0 0.5rem;
  }
  
  .chart-node-body p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .chart-children {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  /* Outline View Styles */
  .outline-view {
    max-width: 800px;
    margin: 0 auto;
  }
  
  /* Progress Bar */
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }
  
  .progress-fill {
    height: 100%;
    transition: width 0.3s;
  }
  
  /* Summary */
  .wbs-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .summary-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  .summary-card h4 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .summary-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }
  
  .empty-state {
    text-align: center;
    color: #6b7280;
    padding: 4rem;
  }
  
  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: #d1d5db;
  }
  
  @media (max-width: 768px) {
    .wbs-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .tree-controls {
      flex-wrap: wrap;
    }
    
    .chart-node {
      min-width: 150px;
      padding: 0.75rem;
    }
  }
</style>