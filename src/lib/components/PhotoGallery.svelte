<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { db } from '../db/database';
  import type { Photo, Task } from '../db/database';
  import { format } from 'date-fns';
  
  export let projectId: number;
  
  const dispatch = createEventDispatcher();
  
  let photos: Photo[] = [];
  let tasks: Task[] = [];
  let showUploadForm = false;
  let selectedPhoto: Photo | null = null;
  let filterType: 'all' | 'before' | 'after' = 'all';
  let filterTaskId: number | undefined;
  let uploadInput: HTMLInputElement;
  let cameraInput: HTMLInputElement;
  
  let newPhoto = {
    caption: '',
    isBefore: true,
    taskId: undefined as number | undefined,
    tags: ''
  };
  
  $: filteredPhotos = photos.filter(p => {
    if (filterType !== 'all' && p.isBefore !== (filterType === 'before')) return false;
    if (filterTaskId && p.taskId !== filterTaskId) return false;
    return true;
  });
  
  onMount(async () => {
    await loadPhotos();
    await loadTasks();
  });
  
  async function loadPhotos() {
    photos = await db.photos
      .where('projectId')
      .equals(projectId)
      .reverse()
      .toArray();
  }
  
  async function loadTasks() {
    tasks = await db.tasks.where('projectId').equals(projectId).toArray();
  }
  
  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    
    for (const file of files) {
      await uploadPhoto(file);
    }
  }
  
  async function uploadPhoto(file: File) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      const thumbnail = await createThumbnail(url);
      
      await db.photos.add({
        projectId,
        url,
        thumbnail,
        caption: newPhoto.caption.trim(),
        isBefore: newPhoto.isBefore,
        taskId: newPhoto.taskId,
        timestamp: new Date(),
        tags: newPhoto.tags.split(',').map(t => t.trim()).filter(t => t)
      });
      
      await loadPhotos();
      dispatch('update');
    };
    
    reader.readAsDataURL(file);
  }
  
  async function createThumbnail(url: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = url;
    });
  }
  
  async function deletePhoto(photo: Photo) {
    if (confirm('Are you sure you want to delete this photo?')) {
      await db.photos.delete(photo.id!);
      await loadPhotos();
      dispatch('update');
    }
  }
  
  function openCamera() {
    cameraInput.click();
  }
  
  function selectPhoto(photo: Photo) {
    selectedPhoto = photo;
  }
  
  function closePhotoViewer() {
    selectedPhoto = null;
  }
  
  function getTaskName(taskId: number) {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || 'Unknown task';
  }
</script>

<div class="photo-gallery">
  <div class="gallery-header">
    <h3>Photo Gallery</h3>
    <div class="header-actions">
      <button on:click={() => showUploadForm = !showUploadForm}>
        {showUploadForm ? '✕ Cancel' : '📸 Add Photos'}
      </button>
    </div>
  </div>
  
  {#if showUploadForm}
    <div class="upload-form card">
      <h4>Add Photos</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Type</label>
          <div class="radio-group">
            <label>
              <input
                type="radio"
                bind:group={newPhoto.isBefore}
                value={true}
              />
              Before
            </label>
            <label>
              <input
                type="radio"
                bind:group={newPhoto.isBefore}
                value={false}
              />
              After
            </label>
          </div>
        </div>
        
        {#if tasks.length > 0}
          <div class="form-group">
            <label for="task">Related Task (optional)</label>
            <select id="task" bind:value={newPhoto.taskId}>
              <option value={undefined}>No specific task</option>
              {#each tasks as task}
                <option value={task.id}>{task.title}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>
      
      <div class="form-group">
        <label for="caption">Caption (optional)</label>
        <input
          id="caption"
          type="text"
          bind:value={newPhoto.caption}
          placeholder="Describe the photo..."
        />
      </div>
      
      <div class="form-group">
        <label for="tags">Tags (comma separated, optional)</label>
        <input
          id="tags"
          type="text"
          bind:value={newPhoto.tags}
          placeholder="e.g., plumbing, demo, flooring"
        />
      </div>
      
      <div class="upload-actions">
        <button class="upload-btn" on:click={() => uploadInput.click()}>
          📁 Choose Files
        </button>
        <button class="camera-btn" on:click={openCamera}>
          📷 Take Photo
        </button>
      </div>
      
      <input
        bind:this={uploadInput}
        type="file"
        accept="image/*"
        multiple
        on:change={handleFileUpload}
        style="display: none"
      />
      
      <input
        bind:this={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        on:change={handleFileUpload}
        style="display: none"
      />
    </div>
  {/if}
  
  <div class="gallery-filters">
    <select bind:value={filterType}>
      <option value="all">All Photos</option>
      <option value="before">Before Photos</option>
      <option value="after">After Photos</option>
    </select>
    
    {#if tasks.length > 0}
      <select bind:value={filterTaskId}>
        <option value={undefined}>All Tasks</option>
        {#each tasks as task}
          <option value={task.id}>{task.title}</option>
        {/each}
      </select>
    {/if}
    
    <div class="photo-count">
      {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
    </div>
  </div>
  
  {#if filteredPhotos.length === 0}
    <div class="empty-state">
      <p>No photos uploaded yet</p>
      <p class="text-sm text-gray">Document your project progress with before and after photos</p>
    </div>
  {:else}
    <div class="photo-grid">
      {#each filteredPhotos as photo}
        <div class="photo-item" on:click={() => selectPhoto(photo)}>
          <img 
            src={photo.thumbnail || photo.url} 
            alt={photo.caption || 'Project photo'}
          />
          <div class="photo-overlay">
            <span class="photo-type badge {photo.isBefore ? 'warning' : 'success'}">
              {photo.isBefore ? 'Before' : 'After'}
            </span>
            {#if photo.caption}
              <p class="photo-caption">{photo.caption}</p>
            {/if}
          </div>
          <button 
            class="delete-btn"
            on:click|stopPropagation={() => deletePhoto(photo)}
            title="Delete photo"
          >
            🗑️
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if selectedPhoto}
  <div class="photo-viewer" on:click={closePhotoViewer}>
    <div class="viewer-content" on:click|stopPropagation>
      <button class="close-btn" on:click={closePhotoViewer}>✕</button>
      <img src={selectedPhoto.url} alt={selectedPhoto.caption || 'Project photo'} />
      <div class="photo-info">
        <div class="info-header">
          <span class="badge {selectedPhoto.isBefore ? 'warning' : 'success'}">
            {selectedPhoto.isBefore ? 'Before' : 'After'}
          </span>
          <span class="timestamp">
            {format(selectedPhoto.timestamp, 'MMM d, yyyy h:mm a')}
          </span>
        </div>
        {#if selectedPhoto.caption}
          <p class="caption">{selectedPhoto.caption}</p>
        {/if}
        {#if selectedPhoto.taskId}
          <p class="task-link">
            Related to: {getTaskName(selectedPhoto.taskId)}
          </p>
        {/if}
        {#if selectedPhoto.tags.length > 0}
          <div class="tags">
            {#each selectedPhoto.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .photo-gallery {
    height: 100%;
  }
  
  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .gallery-header h3 {
    margin: 0;
  }
  
  .upload-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .upload-form h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    color: var(--gray-700);
    font-weight: 500;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
  }
  
  .radio-group {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  
  .radio-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
  }
  
  .upload-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .upload-btn,
  .camera-btn {
    flex: 1;
  }
  
  .gallery-filters {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .photo-count {
    margin-left: auto;
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-600);
  }
  
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .photo-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: var(--radius);
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .photo-item:hover {
    transform: scale(1.05);
  }
  
  .photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .photo-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    color: white;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .photo-caption {
    font-size: 0.875rem;
    margin: 0;
  }
  
  .delete-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.25rem;
    font-size: 0.875rem;
    border-radius: var(--radius-sm);
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .photo-item:hover .delete-btn {
    opacity: 1;
  }
  
  .photo-viewer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }
  
  .viewer-content {
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .viewer-content img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }
  
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
  }
  
  .photo-info {
    background: rgba(0, 0, 0, 0.7);
    padding: 1rem;
    border-radius: var(--radius);
    color: white;
  }
  
  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .timestamp {
    font-size: 0.875rem;
    color: var(--gray-300);
  }
  
  .caption {
    margin: 0.5rem 0;
  }
  
  .task-link {
    font-size: 0.875rem;
    color: var(--gray-300);
    margin: 0.5rem 0;
  }
  
  .tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }
  
  .tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm);
  }
  
  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
    
    .photo-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }
</style>