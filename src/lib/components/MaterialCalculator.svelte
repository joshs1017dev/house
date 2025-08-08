<script lang="ts">
  import { onMount } from 'svelte';
  
  let activeCalculator = 'paint';
  
  // Paint Calculator
  let paintRooms = [{ length: 10, width: 10, height: 8, doors: 1, windows: 2 }];
  let paintCoats = 2;
  let paintCoverage = 350; // sq ft per gallon
  
  // Flooring Calculator
  let floorRooms = [{ length: 10, width: 10 }];
  let floorWaste = 10; // percentage
  
  // Drywall Calculator
  let drywallRooms = [{ length: 10, width: 10, height: 8 }];
  let drywallSheetSize = 32; // 4x8 sheet
  
  // Concrete Calculator
  let concreteLength = 10;
  let concreteWidth = 10;
  let concreteDepth = 4; // inches
  
  // Tile Calculator
  let tileArea = { length: 10, width: 10 };
  let tileSize = { length: 12, width: 12 }; // inches
  let tileSpacing = 0.25; // inches
  
  function addPaintRoom() {
    paintRooms = [...paintRooms, { length: 10, width: 10, height: 8, doors: 1, windows: 1 }];
  }
  
  function removePaintRoom(index: number) {
    paintRooms = paintRooms.filter((_, i) => i !== index);
  }
  
  function addFloorRoom() {
    floorRooms = [...floorRooms, { length: 10, width: 10 }];
  }
  
  function removeFloorRoom(index: number) {
    floorRooms = floorRooms.filter((_, i) => i !== index);
  }
  
  function calculatePaint() {
    let totalWallArea = 0;
    
    paintRooms.forEach(room => {
      const perimeter = 2 * (room.length + room.width);
      const wallArea = perimeter * room.height;
      const doorArea = room.doors * 21; // avg door is 3x7 ft
      const windowArea = room.windows * 15; // avg window is 3x5 ft
      totalWallArea += wallArea - doorArea - windowArea;
    });
    
    const gallonsNeeded = Math.ceil((totalWallArea * paintCoats) / paintCoverage);
    const primerGallons = Math.ceil(totalWallArea / 400); // primer covers more
    
    return {
      totalArea: totalWallArea,
      gallonsNeeded,
      primerGallons,
      estimatedCost: gallonsNeeded * 35 + primerGallons * 25
    };
  }
  
  function calculateFlooring() {
    let totalArea = 0;
    
    floorRooms.forEach(room => {
      totalArea += room.length * room.width;
    });
    
    const wasteMultiplier = 1 + (floorWaste / 100);
    const totalWithWaste = totalArea * wasteMultiplier;
    
    return {
      totalArea,
      totalWithWaste: Math.ceil(totalWithWaste),
      boxes: Math.ceil(totalWithWaste / 20), // avg 20 sq ft per box
      estimatedCost: Math.ceil(totalWithWaste) * 3.5 // $3.50 per sq ft avg
    };
  }
  
  function calculateDrywall() {
    let totalWallArea = 0;
    let totalCeilingArea = 0;
    
    drywallRooms.forEach(room => {
      const perimeter = 2 * (room.length + room.width);
      totalWallArea += perimeter * room.height;
      totalCeilingArea += room.length * room.width;
    });
    
    const totalArea = totalWallArea + totalCeilingArea;
    const sheets = Math.ceil(totalArea / drywallSheetSize);
    const screws = sheets * 40; // ~40 screws per sheet
    const tape = Math.ceil(totalArea / 100) * 500; // 500ft tape per 100 sq ft
    const compound = Math.ceil(totalArea / 100) * 4.5; // 4.5 gal per 100 sq ft
    
    return {
      totalArea,
      sheets,
      screws,
      tapeFeet: tape,
      compoundGallons: compound,
      estimatedCost: sheets * 15 + (screws/100) * 8 + (tape/500) * 7 + compound * 15
    };
  }
  
  function calculateConcrete() {
    const cubicFeet = (concreteLength * concreteWidth * (concreteDepth / 12));
    const cubicYards = cubicFeet / 27;
    const bags80lb = Math.ceil(cubicFeet / 0.6); // 80lb bag = 0.6 cubic ft
    const bags60lb = Math.ceil(cubicFeet / 0.45); // 60lb bag = 0.45 cubic ft
    
    return {
      cubicFeet: cubicFeet.toFixed(2),
      cubicYards: cubicYards.toFixed(2),
      bags80lb,
      bags60lb,
      estimatedCost: Math.min(bags80lb * 8, cubicYards * 150)
    };
  }
  
  function calculateTile() {
    const roomAreaSqFt = (tileArea.length * tileArea.width);
    const tileAreaSqIn = (tileSize.length + tileSpacing) * (tileSize.width + tileSpacing);
    const tileAreaSqFt = tileAreaSqIn / 144;
    const tilesNeeded = Math.ceil(roomAreaSqFt / tileAreaSqFt * 1.1); // 10% waste
    const thinsetBags = Math.ceil(roomAreaSqFt / 50); // 50 sq ft per bag
    const groutBags = Math.ceil(roomAreaSqFt / 25); // 25 sq ft per bag
    
    return {
      roomArea: roomAreaSqFt,
      tilesNeeded,
      boxes: Math.ceil(tilesNeeded / 12), // avg 12 tiles per box
      thinsetBags,
      groutBags,
      estimatedCost: Math.ceil(tilesNeeded / 12) * 45 + thinsetBags * 15 + groutBags * 20
    };
  }
  
  $: paintResult = calculatePaint();
  $: floorResult = calculateFlooring();
  $: drywallResult = calculateDrywall();
  $: concreteResult = calculateConcrete();
  $: tileResult = calculateTile();
</script>

<div class="calculator">
  <div class="calculator-tabs">
    <button 
      class="tab" 
      class:active={activeCalculator === 'paint'}
      on:click={() => activeCalculator = 'paint'}
    >
      Paint
    </button>
    <button 
      class="tab" 
      class:active={activeCalculator === 'flooring'}
      on:click={() => activeCalculator = 'flooring'}
    >
      Flooring
    </button>
    <button 
      class="tab" 
      class:active={activeCalculator === 'drywall'}
      on:click={() => activeCalculator = 'drywall'}
    >
      Drywall
    </button>
    <button 
      class="tab" 
      class:active={activeCalculator === 'concrete'}
      on:click={() => activeCalculator = 'concrete'}
    >
      Concrete
    </button>
    <button 
      class="tab" 
      class:active={activeCalculator === 'tile'}
      on:click={() => activeCalculator = 'tile'}
    >
      Tile
    </button>
  </div>
  
  <div class="calculator-content">
    {#if activeCalculator === 'paint'}
      <div class="calculator-section">
        <h3>🎨 Paint Calculator</h3>
        
        <div class="input-group">
          <label>Number of Coats</label>
          <input type="number" bind:value={paintCoats} min="1" max="4" />
        </div>
        
        <div class="input-group">
          <label>Coverage per Gallon (sq ft)</label>
          <input type="number" bind:value={paintCoverage} min="200" max="400" />
        </div>
        
        <h4>Rooms</h4>
        {#each paintRooms as room, i}
          <div class="room-inputs">
            <h5>Room {i + 1}</h5>
            <div class="room-grid">
              <div>
                <label>Length (ft)</label>
                <input type="number" bind:value={room.length} min="1" />
              </div>
              <div>
                <label>Width (ft)</label>
                <input type="number" bind:value={room.width} min="1" />
              </div>
              <div>
                <label>Height (ft)</label>
                <input type="number" bind:value={room.height} min="1" />
              </div>
              <div>
                <label>Doors</label>
                <input type="number" bind:value={room.doors} min="0" />
              </div>
              <div>
                <label>Windows</label>
                <input type="number" bind:value={room.windows} min="0" />
              </div>
              <button class="btn-danger small" on:click={() => removePaintRoom(i)}>Remove</button>
            </div>
          </div>
        {/each}
        
        <button class="btn-secondary" on:click={addPaintRoom}>+ Add Room</button>
        
        <div class="results">
          <h4>Results</h4>
          <div class="result-item">
            <span>Total Wall Area:</span>
            <span>{paintResult.totalArea} sq ft</span>
          </div>
          <div class="result-item">
            <span>Paint Needed:</span>
            <span>{paintResult.gallonsNeeded} gallons</span>
          </div>
          <div class="result-item">
            <span>Primer Needed:</span>
            <span>{paintResult.primerGallons} gallons</span>
          </div>
          <div class="result-item highlight">
            <span>Estimated Cost:</span>
            <span>${paintResult.estimatedCost}</span>
          </div>
        </div>
      </div>
    {/if}
    
    {#if activeCalculator === 'flooring'}
      <div class="calculator-section">
        <h3>🏠 Flooring Calculator</h3>
        
        <div class="input-group">
          <label>Waste Factor (%)</label>
          <input type="number" bind:value={floorWaste} min="5" max="20" />
        </div>
        
        <h4>Rooms</h4>
        {#each floorRooms as room, i}
          <div class="room-inputs">
            <h5>Room {i + 1}</h5>
            <div class="room-grid">
              <div>
                <label>Length (ft)</label>
                <input type="number" bind:value={room.length} min="1" />
              </div>
              <div>
                <label>Width (ft)</label>
                <input type="number" bind:value={room.width} min="1" />
              </div>
              <button class="btn-danger small" on:click={() => removeFloorRoom(i)}>Remove</button>
            </div>
          </div>
        {/each}
        
        <button class="btn-secondary" on:click={addFloorRoom}>+ Add Room</button>
        
        <div class="results">
          <h4>Results</h4>
          <div class="result-item">
            <span>Floor Area:</span>
            <span>{floorResult.totalArea} sq ft</span>
          </div>
          <div class="result-item">
            <span>With Waste:</span>
            <span>{floorResult.totalWithWaste} sq ft</span>
          </div>
          <div class="result-item">
            <span>Boxes Needed:</span>
            <span>{floorResult.boxes} boxes</span>
          </div>
          <div class="result-item highlight">
            <span>Estimated Cost:</span>
            <span>${floorResult.estimatedCost}</span>
          </div>
        </div>
      </div>
    {/if}
    
    {#if activeCalculator === 'drywall'}
      <div class="calculator-section">
        <h3>🔨 Drywall Calculator</h3>
        
        <h4>Rooms</h4>
        {#each drywallRooms as room, i}
          <div class="room-inputs">
            <h5>Room {i + 1}</h5>
            <div class="room-grid">
              <div>
                <label>Length (ft)</label>
                <input type="number" bind:value={room.length} min="1" />
              </div>
              <div>
                <label>Width (ft)</label>
                <input type="number" bind:value={room.width} min="1" />
              </div>
              <div>
                <label>Height (ft)</label>
                <input type="number" bind:value={room.height} min="1" />
              </div>
            </div>
          </div>
        {/each}
        
        <div class="results">
          <h4>Results</h4>
          <div class="result-item">
            <span>Total Area:</span>
            <span>{drywallResult.totalArea} sq ft</span>
          </div>
          <div class="result-item">
            <span>Sheets (4x8):</span>
            <span>{drywallResult.sheets}</span>
          </div>
          <div class="result-item">
            <span>Screws:</span>
            <span>{drywallResult.screws}</span>
          </div>
          <div class="result-item">
            <span>Joint Tape:</span>
            <span>{drywallResult.tapeFeet} ft</span>
          </div>
          <div class="result-item">
            <span>Joint Compound:</span>
            <span>{drywallResult.compoundGallons} gallons</span>
          </div>
          <div class="result-item highlight">
            <span>Estimated Cost:</span>
            <span>${drywallResult.estimatedCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    {/if}
    
    {#if activeCalculator === 'concrete'}
      <div class="calculator-section">
        <h3>🧱 Concrete Calculator</h3>
        
        <div class="input-grid">
          <div class="input-group">
            <label>Length (ft)</label>
            <input type="number" bind:value={concreteLength} min="1" />
          </div>
          <div class="input-group">
            <label>Width (ft)</label>
            <input type="number" bind:value={concreteWidth} min="1" />
          </div>
          <div class="input-group">
            <label>Depth (inches)</label>
            <input type="number" bind:value={concreteDepth} min="1" />
          </div>
        </div>
        
        <div class="results">
          <h4>Results</h4>
          <div class="result-item">
            <span>Volume:</span>
            <span>{concreteResult.cubicFeet} cubic ft</span>
          </div>
          <div class="result-item">
            <span>Cubic Yards:</span>
            <span>{concreteResult.cubicYards}</span>
          </div>
          <div class="result-item">
            <span>80lb Bags:</span>
            <span>{concreteResult.bags80lb}</span>
          </div>
          <div class="result-item">
            <span>60lb Bags:</span>
            <span>{concreteResult.bags60lb}</span>
          </div>
          <div class="result-item highlight">
            <span>Estimated Cost:</span>
            <span>${concreteResult.estimatedCost}</span>
          </div>
        </div>
      </div>
    {/if}
    
    {#if activeCalculator === 'tile'}
      <div class="calculator-section">
        <h3>⬜ Tile Calculator</h3>
        
        <h4>Room Dimensions</h4>
        <div class="input-grid">
          <div class="input-group">
            <label>Length (ft)</label>
            <input type="number" bind:value={tileArea.length} min="1" />
          </div>
          <div class="input-group">
            <label>Width (ft)</label>
            <input type="number" bind:value={tileArea.width} min="1" />
          </div>
        </div>
        
        <h4>Tile Size</h4>
        <div class="input-grid">
          <div class="input-group">
            <label>Tile Length (inches)</label>
            <input type="number" bind:value={tileSize.length} min="1" />
          </div>
          <div class="input-group">
            <label>Tile Width (inches)</label>
            <input type="number" bind:value={tileSize.width} min="1" />
          </div>
          <div class="input-group">
            <label>Grout Spacing (inches)</label>
            <input type="number" bind:value={tileSpacing} min="0" max="1" step="0.125" />
          </div>
        </div>
        
        <div class="results">
          <h4>Results</h4>
          <div class="result-item">
            <span>Room Area:</span>
            <span>{tileResult.roomArea} sq ft</span>
          </div>
          <div class="result-item">
            <span>Tiles Needed:</span>
            <span>{tileResult.tilesNeeded} tiles</span>
          </div>
          <div class="result-item">
            <span>Boxes:</span>
            <span>{tileResult.boxes}</span>
          </div>
          <div class="result-item">
            <span>Thinset Bags:</span>
            <span>{tileResult.thinsetBags}</span>
          </div>
          <div class="result-item">
            <span>Grout Bags:</span>
            <span>{tileResult.groutBags}</span>
          </div>
          <div class="result-item highlight">
            <span>Estimated Cost:</span>
            <span>${tileResult.estimatedCost}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .calculator {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .calculator-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid var(--gray-200);
    overflow-x: auto;
  }
  
  .tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--gray-600);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .tab:hover {
    color: var(--primary);
    background: var(--gray-50);
  }
  
  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  
  .calculator-content {
    background: white;
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: var(--shadow);
  }
  
  .calculator-section h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
  }
  
  .calculator-section h4 {
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: var(--gray-700);
  }
  
  .calculator-section h5 {
    margin: 0.5rem 0;
    color: var(--gray-600);
  }
  
  .input-group {
    margin-bottom: 1rem;
  }
  
  .input-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .input-group input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    font-size: 1rem;
  }
  
  .input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .room-inputs {
    background: var(--gray-50);
    padding: 1rem;
    border-radius: var(--radius);
    margin-bottom: 1rem;
  }
  
  .room-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
    align-items: end;
  }
  
  .room-grid input {
    padding: 0.375rem;
    font-size: 0.875rem;
  }
  
  .btn-secondary {
    background: var(--gray-100);
    color: var(--gray-700);
    padding: 0.5rem 1rem;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: var(--gray-200);
  }
  
  .btn-danger {
    background: var(--danger);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-danger:hover {
    background: #dc2626;
  }
  
  .btn-danger.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.8125rem;
  }
  
  .results {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--gray-50);
    border-radius: var(--radius);
    border: 2px solid var(--gray-200);
  }
  
  .results h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--gray-200);
  }
  
  .result-item:last-child {
    border-bottom: none;
  }
  
  .result-item span:first-child {
    color: var(--gray-600);
  }
  
  .result-item span:last-child {
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .result-item.highlight {
    background: white;
    margin: 0 -1rem;
    padding: 1rem;
    border-radius: var(--radius);
    border: 2px solid var(--primary);
  }
  
  .result-item.highlight span:last-child {
    font-size: 1.25rem;
    color: var(--primary);
  }
  
  @media (max-width: 768px) {
    .calculator-content {
      padding: 1rem;
    }
    
    .calculator-tabs {
      justify-content: flex-start;
    }
    
    .tab {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
  }
</style>