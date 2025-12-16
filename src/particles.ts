// Golden Capture Particle System
// Spawns celebratory particles when golden letters are captured

// Spawn floating +X reward text over the sol bar
export function spawnRewardText(amount: number): void {
  const solBar = document.getElementById('sol-bar');
  if (!solBar) return;

  const text = document.createElement('div');
  text.className = 'reward-text';
  text.textContent = `+${amount}`;

  // Position above the sol bar
  const rect = solBar.getBoundingClientRect();
  text.style.left = `${rect.left + rect.width / 2}px`;
  text.style.top = `${rect.top - 10}px`;

  document.getElementById('app')?.appendChild(text);

  // Clean up after animation
  setTimeout(() => text.remove(), 800);
}

interface Particle {
  element: HTMLElement;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
}

// Get the target position (sol bar in bottom-right)
function getTargetPosition(): { x: number; y: number } {
  const solBar = document.getElementById('sol-bar');
  if (!solBar) {
    // Fallback to bottom-right corner
    return {
      x: window.innerWidth - 100,
      y: window.innerHeight - 100,
    };
  }

  const rect = solBar.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

// Particle settings per reward tier
const PARTICLE_CONFIG = {
  1: { count: 5, burstDistance: 25, size: 'small' },
  2: { count: 8, burstDistance: 35, size: 'medium' },
  3: { count: 12, burstDistance: 50, size: 'large' },
} as const;

// Create and animate particle burst
export function spawnGoldenParticles(x: number, y: number, reward: 1 | 2 | 3 = 1): void {
  const config = PARTICLE_CONFIG[reward];
  const particles: Particle[] = [];
  const target = getTargetPosition();

  // Create container for particles
  const container = document.getElementById('app');
  if (!container) return;

  // Create particles
  for (let i = 0; i < config.count; i++) {
    const particle = document.createElement('div');
    particle.className = `golden-particle golden-particle--${config.size}`;

    // Random spread for initial burst
    const angle = (Math.PI * 2 * i) / config.count;
    const burstDistance = config.burstDistance + Math.random() * 15;
    const burstX = Math.cos(angle) * burstDistance;
    const burstY = Math.sin(angle) * burstDistance;

    // Stagger animation slightly
    const delay = i * 15;

    // Set initial position
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--burst-x', `${burstX}px`);
    particle.style.setProperty('--burst-y', `${burstY}px`);
    particle.style.setProperty('--target-x', `${target.x - x}px`);
    particle.style.setProperty('--target-y', `${target.y - y}px`);
    particle.style.animationDelay = `${delay}ms`;

    container.appendChild(particle);

    particles.push({
      element: particle,
      startX: x,
      startY: y,
      targetX: target.x,
      targetY: target.y,
      delay,
    });
  }

  // Clean up particles after animation completes
  const maxDelay = config.count * 15;
  setTimeout(() => {
    particles.forEach((p) => p.element.remove());
  }, 1000 + maxDelay);
}

// Get screen position of a character element
export function getCharacterPosition(wordIndex: number, charIndex: number): { x: number; y: number } | null {
  // Find the word element
  const wordsEl = document.getElementById('words');
  if (!wordsEl) return null;

  const wordEls = wordsEl.querySelectorAll('.word');
  const wordEl = wordEls[wordIndex] as HTMLElement | undefined;
  if (!wordEl) return null;

  // Find the character element
  const charEls = wordEl.querySelectorAll('.char:not(.extra)');
  const charEl = charEls[charIndex] as HTMLElement | undefined;
  if (!charEl) return null;

  // Get screen position
  const rect = charEl.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
