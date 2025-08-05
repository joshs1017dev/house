<script lang="ts">
  import { onMount } from 'svelte';
  import type { Project } from '../db/database';
  import { db } from '../db/database';
  
  export let project: Project;
  
  const GEMINI_API_KEY = 'AIzaSyA19u0p1ccNS8JysypFjmvvlG3iZ4KAUqE';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
  
  let activeFeature: 'estimator' | 'advisor' | 'materials' | 'timeline' = 'estimator';
  let userInput = '';
  let aiResponse = '';
  let isLoading = false;
  let projectContext = '';
  
  // Cost estimation variables
  let roomType = '';
  let roomSize = '';
  let workScope = '';
  
  // Materials suggestion variables
  let materialTask = '';
  let qualityLevel = 'mid-range';
  
  // Timeline generation variables
  let projectScope = '';
  let availableHours = '10';
  
  onMount(async () => {
    await loadProjectContext();
  });
  
  async function loadProjectContext() {
    const tasks = await db.tasks.where('projectId').equals(project.id!).toArray();
    const materials = await db.materials.where('projectId').equals(project.id!).toArray();
    const expenses = await db.expenses.where('projectId').equals(project.id!).toArray();
    
    projectContext = `
      Project: ${project.name}
      Description: ${project.description}
      Budget: $${project.budget}
      Current Spend: $${project.actualCost}
      Status: ${project.status}
      Tasks: ${tasks.length} total (${tasks.filter(t => t.status === 'completed').length} completed)
      Materials: ${materials.length} items listed
      Total Expenses: $${expenses.reduce((sum, e) => sum + e.amount, 0)}
    `;
  }
  
  async function callGeminiAPI(prompt: string) {
    isLoading = true;
    aiResponse = '';
    
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      aiResponse = data.candidates[0].content.parts[0].text;
    } catch (error) {
      aiResponse = `Error: ${error.message}. Please try again.`;
    } finally {
      isLoading = false;
    }
  }
  
  async function estimateCost() {
    if (!roomType || !roomSize || !workScope) {
      alert('Please fill in all fields for cost estimation');
      return;
    }
    
    const prompt = `
      As a home improvement cost estimator, provide a detailed cost breakdown for the following project:
      
      Room Type: ${roomType}
      Room Size: ${roomSize} square feet
      Scope of Work: ${workScope}
      
      Current Project Context:
      ${projectContext}
      
      Please provide:
      1. Itemized cost breakdown (materials, labor, permits)
      2. Total estimated cost range (low, mid, high)
      3. Potential cost-saving tips
      4. Common unexpected expenses to budget for
      
      Format the response in a clear, organized manner with sections and bullet points.
    `;
    
    await callGeminiAPI(prompt);
  }
  
  async function getAdvice() {
    if (!userInput.trim()) {
      alert('Please enter a question or describe what you need help with');
      return;
    }
    
    const prompt = `
      As a professional home improvement advisor, help with the following question:
      
      Question: ${userInput}
      
      Current Project Context:
      ${projectContext}
      
      Please provide:
      1. Direct answer to the question
      2. Step-by-step guidance if applicable
      3. Safety considerations
      4. Tools or materials needed
      5. Common mistakes to avoid
      6. Professional tips
      
      Keep the advice practical and actionable.
    `;
    
    await callGeminiAPI(prompt);
  }
  
  async function suggestMaterials() {
    if (!materialTask) {
      alert('Please describe what you need materials for');
      return;
    }
    
    const prompt = `
      As a home improvement materials expert, suggest materials for:
      
      Task: ${materialTask}
      Quality Level: ${qualityLevel}
      
      Current Project Context:
      ${projectContext}
      
      Please provide:
      1. Complete materials list with quantities (be specific)
      2. Brand recommendations for each item
      3. Estimated cost per item
      4. Where to buy (store suggestions)
      5. Quality alternatives (budget vs premium options)
      6. Tools needed for installation
      
      Format as a shopping list with clear categories.
    `;
    
    await callGeminiAPI(prompt);
  }
  
  async function generateTimeline() {
    if (!projectScope) {
      alert('Please describe the project scope');
      return;
    }
    
    const prompt = `
      As a project management expert, create a realistic timeline for:
      
      Project Scope: ${projectScope}
      Available Hours per Week: ${availableHours}
      
      Current Project Context:
      ${projectContext}
      
      Please provide:
      1. Phase-by-phase breakdown with duration estimates
      2. Critical path and dependencies
      3. Recommended task order
      4. Milestones and checkpoints
      5. Buffer time recommendations
      6. Tips for staying on schedule
      
      Format as a week-by-week timeline with clear phases.
    `;
    
    await callGeminiAPI(prompt);
  }
</script>

<div class="project-ai">
  <div class="ai-header">
    <h3>✨ AI Assistant</h3>
    <p class="ai-subtitle">Powered by Gemini 2.5 Pro</p>
  </div>
  
  <div class="feature-tabs">
    <button 
      class="feature-tab"
      class:active={activeFeature === 'estimator'}
      on:click={() => activeFeature = 'estimator'}
    >
      💰 Cost Estimator
    </button>
    <button 
      class="feature-tab"
      class:active={activeFeature === 'advisor'}
      on:click={() => activeFeature = 'advisor'}
    >
      💡 Project Advisor
    </button>
    <button 
      class="feature-tab"
      class:active={activeFeature === 'materials'}
      on:click={() => activeFeature = 'materials'}
    >
      🛒 Materials Helper
    </button>
    <button 
      class="feature-tab"
      class:active={activeFeature === 'timeline'}
      on:click={() => activeFeature = 'timeline'}
    >
      📅 Timeline Generator
    </button>
  </div>
  
  <div class="feature-content">
    {#if activeFeature === 'estimator'}
      <div class="feature-form">
        <h4>AI Cost Estimator</h4>
        <p class="feature-description">Get accurate cost estimates based on room type and scope of work</p>
        
        <div class="form-group">
          <label for="roomType">Room Type</label>
          <select id="roomType" bind:value={roomType}>
            <option value="">Select room type...</option>
            <option value="kitchen">Kitchen</option>
            <option value="bathroom">Bathroom</option>
            <option value="bedroom">Bedroom</option>
            <option value="living room">Living Room</option>
            <option value="basement">Basement</option>
            <option value="garage">Garage</option>
            <option value="exterior">Exterior</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="roomSize">Room Size (sq ft)</label>
          <input
            id="roomSize"
            type="number"
            bind:value={roomSize}
            placeholder="e.g., 150"
            min="1"
          />
        </div>
        
        <div class="form-group">
          <label for="workScope">Scope of Work</label>
          <textarea
            id="workScope"
            bind:value={workScope}
            placeholder="Describe the work needed (e.g., full renovation, new flooring, painting, plumbing updates...)"
            rows="3"
          ></textarea>
        </div>
        
        <button on:click={estimateCost} disabled={isLoading}>
          {isLoading ? 'Calculating...' : 'Get Cost Estimate'}
        </button>
      </div>
      
    {:else if activeFeature === 'advisor'}
      <div class="feature-form">
        <h4>AI Project Advisor</h4>
        <p class="feature-description">Get expert advice on any home improvement question</p>
        
        <div class="form-group">
          <label for="question">Your Question</label>
          <textarea
            id="question"
            bind:value={userInput}
            placeholder="Ask anything about your project (e.g., 'How do I remove old wallpaper?', 'What permits do I need for a deck?', 'Best paint for bathroom?')"
            rows="4"
          ></textarea>
        </div>
        
        <button on:click={getAdvice} disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Get Expert Advice'}
        </button>
      </div>
      
    {:else if activeFeature === 'materials'}
      <div class="feature-form">
        <h4>AI Materials Suggester</h4>
        <p class="feature-description">Get a complete materials list for any task</p>
        
        <div class="form-group">
          <label for="materialTask">What do you need materials for?</label>
          <textarea
            id="materialTask"
            bind:value={materialTask}
            placeholder="Describe the task (e.g., 'Install tile backsplash in kitchen', 'Build a deck 12x16 feet', 'Replace bathroom vanity')"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="quality">Quality Level</label>
          <select id="quality" bind:value={qualityLevel}>
            <option value="budget">Budget-Friendly</option>
            <option value="mid-range">Mid-Range (Recommended)</option>
            <option value="premium">Premium Quality</option>
          </select>
        </div>
        
        <button on:click={suggestMaterials} disabled={isLoading}>
          {isLoading ? 'Researching...' : 'Get Materials List'}
        </button>
      </div>
      
    {:else if activeFeature === 'timeline'}
      <div class="feature-form">
        <h4>AI Timeline Generator</h4>
        <p class="feature-description">Create a realistic project timeline</p>
        
        <div class="form-group">
          <label for="scope">Project Scope</label>
          <textarea
            id="scope"
            bind:value={projectScope}
            placeholder="Describe everything you want to accomplish (e.g., 'Complete kitchen remodel including cabinets, countertops, appliances, and flooring')"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="hours">Available Hours per Week</label>
          <input
            id="hours"
            type="number"
            bind:value={availableHours}
            min="1"
            max="168"
          />
        </div>
        
        <button on:click={generateTimeline} disabled={isLoading}>
          {isLoading ? 'Planning...' : 'Generate Timeline'}
        </button>
      </div>
    {/if}
    
    {#if aiResponse}
      <div class="ai-response">
        <h4>AI Response</h4>
        <div class="response-content">
          {#each aiResponse.split('\n') as paragraph}
            {#if paragraph.trim()}
              <p>{paragraph}</p>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
    
    {#if isLoading}
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>AI is thinking...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .project-ai {
    height: 100%;
  }
  
  .ai-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .ai-header h3 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .ai-subtitle {
    color: var(--gray-600);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  .feature-tabs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
    margin-bottom: 2rem;
  }
  
  .feature-tab {
    background: var(--gray-100);
    color: var(--gray-700);
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .feature-tab:hover {
    background: var(--gray-200);
    transform: none;
  }
  
  .feature-tab.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .feature-content {
    background: var(--gray-50);
    padding: 2rem;
    border-radius: var(--radius);
    min-height: 300px;
  }
  
  .feature-form h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }
  
  .feature-description {
    color: var(--gray-600);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--gray-700);
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
  }
  
  .ai-response {
    margin-top: 2rem;
    padding: 1.5rem;
    background: white;
    border-radius: var(--radius);
    border: 1px solid var(--gray-200);
  }
  
  .ai-response h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary);
  }
  
  .response-content {
    line-height: 1.6;
    color: var(--gray-800);
  }
  
  .response-content p {
    margin-bottom: 1rem;
    white-space: pre-wrap;
  }
  
  .response-content p:last-child {
    margin-bottom: 0;
  }
  
  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--gray-200);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loading-indicator p {
    margin-top: 1rem;
    color: var(--gray-600);
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  @media (max-width: 768px) {
    .feature-tabs {
      grid-template-columns: 1fr;
    }
    
    .feature-content {
      padding: 1rem;
    }
  }
</style>