<script lang="ts">
  import { onMount } from 'svelte';
  import { photos } from '../stores';
  import type { Photo } from '../db/database';
  
  export let projectId: number;
  
  let projectPhotos: Photo[] = [];
  let showCamera = false;
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let stream: MediaStream | null = null;
  let selectedPhoto: Photo | null = null;
  let filterType: 'all' | 'before' | 'after' = 'all';
  let uploadInput: HTMLInputElement;
  
  let newPhoto = {
    caption: '',
    isBefore: false,
    isAfter: false,
    tags: ''
  };
  
  photos.subscribe(p => {
    let filtered = p.filter(photo => photo.projectId === projectId);
    
    if (filterType === 'before') {
      filtered = filtered.filter(photo => photo.isBefore);
    } else if (filterType === 'after') {
      filtered = filtered.filter(photo => photo.isAfter);
    }
    
    projectPhotos = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });
  
  onMount(() => {
    return () => {
      stopCamera();
    };
  });
  
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      if (videoElement) {
        videoElement.srcObject = stream;
      }
      showCamera = true;
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    showCamera = false;
  }
  
  async function capturePhoto() {
    if (!videoElement || !canvasElement) return;
    
    const context = canvasElement.getContext('2d');
    if (!context) return;
    
    // Set canvas size to match video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(videoElement, 0, 0);
    
    // Convert to blob
    canvasElement.toBlob(async (blob) => {
      if (!blob) return;
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await savePhoto(base64);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
  }
  
  async function handleFileUpload(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await savePhoto(base64);
        };
        reader.readAsDataURL(file);
      }
    }
    
    // Reset input
    if (uploadInput) uploadInput.value = '';
  }
  
  async function savePhoto(base64Data: string) {
    // Create thumbnail
    const thumbnail = await createThumbnail(base64Data);
    
    await photos.add({
      projectId,
      url: base64Data,
      thumbnail,
      caption: newPhoto.caption.trim() || undefined,
      isBefore: newPhoto.isBefore,
      isAfter: newPhoto.isAfter,
      tags: newPhoto.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      timestamp: new Date()
    });
    
    // Reset form
    newPhoto = {
      caption: '',
      isBefore: false,
      isAfter: false,
      tags: ''
    };
    
    stopCamera();
    await photos.load(projectId);
  }
  
  async function createThumbnail(base64Data: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Data);
          return;
        }
        
        // Create thumbnail at 200px width
        const maxWidth = 200;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = base64Data;
    });
  }
  
  async function deletePhoto(photoId: number) {
    if (confirm('Are you sure you want to delete this photo?')) {
      await photos.delete(photoId);
      await photos.load(projectId);
    }
  }
  
  function downloadPhoto(photo: Photo) {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `project-photo-${photo.id}.jpg`;
    link.click();
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  }
</script>

<div class="photo-gallery">
  <div class="gallery-header">
    <h3>📸 Photo Documentation</h3>
    <div class="header-actions">
      <button class="btn-secondary" on:click={() => uploadInput.click()}>
        📁 Upload
      </button>
      <button class="btn-primary" on:click={startCamera}>
        📷 Take Photo
      </button>
    </div>
  </div>
  
  <input
    bind:this={uploadInput}
    type="file"
    accept="image/*"
    multiple
    on:change={handleFileUpload}
    style="display: none"
  />
  
  <div class="filter-tabs">
    <button
      class="filter-tab"
      class:active={filterType === 'all'}
      on:click={() => filterType = 'all'}
    >
      All Photos ({projectPhotos.length})
    </button>
    <button
      class="filter-tab"
      class:active={filterType === 'before'}
      on:click={() => filterType = 'before'}
    >
      Before ({projectPhotos.filter(p => p.isBefore).length})
    </button>
    <button
      class="filter-tab"
      class:active={filterType === 'after'}
      on:click={() => filterType = 'after'}
    >
      After ({projectPhotos.filter(p => p.isAfter).length})
    </button>
  </div>
  
  {#if showCamera}
    <div class="camera-container card">
      <h4>Take Photo</h4>
      
      <div class="camera-preview">
        <video bind:this={videoElement} autoplay playsinline></video>
        <canvas bind:this={canvasElement} style="display: none"></canvas>
      </div>
      
      <div class="photo-form">
        <div class="form-group">
          <input
            type="text"
            bind:value={newPhoto.caption}
            placeholder="Photo caption (optional)"
          />
        </div>
        
        <div class="form-row">
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={newPhoto.isBefore}
            />
            Before photo
          </label>
          
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={newPhoto.isAfter}
            />
            After photo
          </label>
        </div>
        
        <div class="form-group">
          <input
            type="text"
            bind:value={newPhoto.tags}
            placeholder="Tags (comma separated)"
          />
        </div>
      </div>
      
      <div class="camera-actions">
        <button class="btn-secondary" on:click={stopCamera}>
          Cancel
        </button>
        <button class="btn-primary capture-btn" on:click={capturePhoto}>
          📸 Capture
        </button>
      </div>
    </div>
  {/if}
  
  {#if projectPhotos.length === 0}
    <div class="empty-state">
      <p>No photos yet</p>
      <p class="text-sm text-gray">Document your project progress with photos</p>
    </div>
  {:else}
    <div class="photo-grid">
      {#each projectPhotos as photo}
        <div class="photo-item" on:click={() => selectedPhoto = photo}>
          <img 
            src={photo.thumbnail || photo.url} 
            alt={photo.caption || 'Project photo'}
            loading="lazy"
          />
          
          <div class="photo-overlay">
            <div class="photo-badges">
              {#if photo.isBefore}
                <span class="badge before">Before</span>
              {/if}
              {#if photo.isAfter}
                <span class="badge after">After</span>
              {/if}
            </div>
            
            {#if photo.caption}
              <p class="photo-caption">{photo.caption}</p>
            {/if}
            
            <div class="photo-meta">
              <span>{formatDate(photo.timestamp)}</span>
            </div>
          </div>
          
          <div class="photo-actions">
            <button
              class="icon-btn"
              on:click|stopPropagation={() => downloadPhoto(photo)}
              title="Download"
            >
              ⬇️
            </button>
            <button
              class="icon-btn danger"
              on:click|stopPropagation={() => deletePhoto(photo.id || 0)}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if selectedPhoto}
    <div class="lightbox" on:click={() => selectedPhoto = null}>
      <div class="lightbox-content" on:click|stopPropagation>
        <button class="close-btn" on:click={() => selectedPhoto = null}>
          ✕
        </button>
        
        <img src={selectedPhoto.url} alt={selectedPhoto.caption || 'Project photo'} />
        
        {#if selectedPhoto.caption}
          <div class="lightbox-caption">
            <p>{selectedPhoto.caption}</p>
          </div>
        {/if}
        
        <div class="lightbox-meta">
          <div class="meta-badges">
            {#if selectedPhoto.isBefore}
              <span class="badge before">Before</span>
            {/if}
            {#if selectedPhoto.isAfter}
              <span class="badge after">After</span>
            {/if}
            {#each selectedPhoto.tags as tag}
              <span class="tag">#{tag}</span>
            {/each}
          </div>
          <span class="date">{formatDate(selectedPhoto.timestamp)}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

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
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .filter-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--gray-200);
  }
  
  .filter-tab {
    background: none;
    color: var(--gray-600);
    padding: 0.75rem 1rem;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
  }
  
  .filter-tab:hover {
    color: var(--gray-900);
    transform: none;
    box-shadow: none;
  }
  
  .filter-tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    font-weight: 500;
  }
  
  .camera-container {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .camera-container h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .camera-preview {
    position: relative;
    margin-bottom: 1rem;
    border-radius: var(--radius);
    overflow: hidden;
    background: #000;
  }
  
  .camera-preview video {
    width: 100%;
    height: auto;
    display: block;
  }
  
  .photo-form {
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group input {
    width: 100%;
  }
  
  .form-row {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
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
  
  .camera-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }
  
  .capture-btn {
    font-size: 1.125rem;
    padding: 0.75rem 2rem;
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
  
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .photo-item {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    background: var(--gray-100);
    aspect-ratio: 4/3;
  }
  
  .photo-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }
  
  .photo-item:hover img {
    transform: scale(1.05);
  }
  
  .photo-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    color: white;
    padding: 1rem;
    pointer-events: none;
  }
  
  .photo-badges {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-weight: 500;
  }
  
  .badge.before {
    background: var(--warning);
  }
  
  .badge.after {
    background: var(--secondary);
  }
  
  .photo-caption {
    font-size: 0.875rem;
    margin: 0.5rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .photo-meta {
    font-size: 0.75rem;
    opacity: 0.8;
  }
  
  .photo-actions {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .photo-item:hover .photo-actions {
    opacity: 1;
  }
  
  .icon-btn {
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem;
    font-size: 0.875rem;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  
  .icon-btn:hover {
    background: white;
    transform: none;
    box-shadow: var(--shadow);
  }
  
  .icon-btn.danger:hover {
    background: #fef2f2;
  }
  
  .lightbox {
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
  
  .lightbox-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  
  .lightbox-content img {
    max-width: 100%;
    max-height: calc(90vh - 100px);
    object-fit: contain;
  }
  
  .close-btn {
    position: absolute;
    top: -2rem;
    right: 0;
    background: none;
    color: white;
    font-size: 2rem;
    padding: 0.5rem;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: none;
  }
  
  .lightbox-caption {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 1rem;
    margin-top: 1rem;
    border-radius: var(--radius);
  }
  
  .lightbox-caption p {
    margin: 0;
  }
  
  .lightbox-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    color: white;
    font-size: 0.875rem;
  }
  
  .meta-badges {
    display: flex;
    gap: 0.5rem;
  }
  
  .tag {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
  }
  
  @media (max-width: 768px) {
    .photo-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    
    .lightbox {
      padding: 1rem;
    }
  }
</style>