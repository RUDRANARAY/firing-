import React, { useRef, useEffect, useState } from 'react';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const AIRCRAFT_WIDTH = 40;
const AIRCRAFT_HEIGHT = 40;
const BUBBLE_RADIUS = 15;
const BULLET_WIDTH = 8;
const BULLET_HEIGHT = 16;
const GAME_TIME = 60; // seconds

function getRandomX() {
  return Math.random() * (CANVAS_WIDTH - BUBBLE_RADIUS * 2) + BUBBLE_RADIUS;
}

const App = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [gameOver, setGameOver] = useState(false);

  // Game objects
  const aircraft = useRef({ x: CANVAS_WIDTH / 2 - AIRCRAFT_WIDTH / 2, y: CANVAS_HEIGHT - AIRCRAFT_HEIGHT - 10 });
  const bubbles = useRef([]);
  const bullets = useRef([]);
  const keys = useRef({});

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key] = true;
    };
    const handleKeyUp = (e) => {
      keys.current[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let animationId;
    let lastTime = Date.now();
    let shootCooldown = 0;

    function spawnBubble() {
      bubbles.current.push({
        x: getRandomX(),
        y: -BUBBLE_RADIUS,
        radius: BUBBLE_RADIUS + Math.random() * 10,
        speed: 1 + Math.random() * 1.5,
      });
    }

    function update() {
      // Move aircraft
      if (keys.current['ArrowLeft'] && aircraft.current.x > 0) {
        aircraft.current.x -= 7;
      }
      if (keys.current['ArrowRight'] && aircraft.current.x < CANVAS_WIDTH - AIRCRAFT_WIDTH) {
        aircraft.current.x += 7;
      }
      // Shoot
      if (keys.current[' '] && shootCooldown <= 0) {
        bullets.current.push({
          x: aircraft.current.x + AIRCRAFT_WIDTH / 2 - BULLET_WIDTH / 2,
          y: aircraft.current.y - BULLET_HEIGHT / 2, // fire from nose
        });
        shootCooldown = 15; // frames
      }
      if (shootCooldown > 0) shootCooldown--;

      // Move bullets
      bullets.current.forEach((b) => (b.y -= 12)); // Increased speed
      bullets.current = bullets.current.filter((b) => b.y + BULLET_HEIGHT > 0);

      // Move bubbles
      bubbles.current.forEach((bubble) => (bubble.y += bubble.speed));
      bubbles.current = bubbles.current.filter((bubble) => bubble.y - bubble.radius < CANVAS_HEIGHT);

      // Collision detection (only destroy red bubbles)
      bullets.current.forEach((bullet, bi) => {
        bubbles.current.forEach((bubble, bubi) => {
          // All bubbles are red, so destroy on collision
          const dx = bullet.x + BULLET_WIDTH / 2 - bubble.x;
          const dy = bullet.y - bubble.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < bubble.radius) {
            setScore((s) => s + 1);
            bubbles.current.splice(bubi, 1);
            bullets.current.splice(bi, 1);
          }
        });
      });

      // Spawn bubbles
      if (Math.random() < 0.03) {
        spawnBubble();
      }
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Draw border
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Draw aircraft (realistic)
      ctx.save();
      ctx.translate(aircraft.current.x + AIRCRAFT_WIDTH / 2, aircraft.current.y + AIRCRAFT_HEIGHT / 2);
      ctx.beginPath();
      // Fuselage
      ctx.moveTo(0, -AIRCRAFT_HEIGHT / 2);
      ctx.lineTo(0, AIRCRAFT_HEIGHT / 2);
      // Left wing
      ctx.moveTo(0, 0);
      ctx.lineTo(-AIRCRAFT_WIDTH / 2, AIRCRAFT_HEIGHT / 6);
      // Right wing
      ctx.moveTo(0, 0);
      ctx.lineTo(AIRCRAFT_WIDTH / 2, AIRCRAFT_HEIGHT / 6);
      // Tail
      ctx.moveTo(0, AIRCRAFT_HEIGHT / 2);
      ctx.lineTo(-AIRCRAFT_WIDTH / 6, AIRCRAFT_HEIGHT / 3);
      ctx.moveTo(0, AIRCRAFT_HEIGHT / 2);
      ctx.lineTo(AIRCRAFT_WIDTH / 6, AIRCRAFT_HEIGHT / 3);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      // Draw bubbles
      bubbles.current.forEach((bubble) => {
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
      });
      // Draw bullets
      bullets.current.forEach((b) => {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + BULLET_WIDTH, b.y);
        ctx.lineTo(b.x + BULLET_WIDTH / 2, b.y - BULLET_HEIGHT);
        ctx.closePath();
        ctx.stroke();
      });
    }

    function gameLoop() {
      if (gameOver) return;
      update();
      const ctx = canvasRef.current.getContext('2d');
      draw(ctx);
      animationId = requestAnimationFrame(gameLoop);
    }

    // Timer
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    gameLoop();
    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(timer);
    };
  }, [gameOver]);

  const handleRestart = () => {
    setScore(0);
    setTimeLeft(GAME_TIME);
    setGameOver(false);
    bubbles.current = [];
    bullets.current = [];
    aircraft.current.x = CANVAS_WIDTH / 2 - AIRCRAFT_WIDTH / 2;
    aircraft.current.y = CANVAS_HEIGHT - AIRCRAFT_HEIGHT - 10;
  };

  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <h2>Aircraft Bubble Shooter</h2>
      <div style={{ marginBottom: 10 }}>
        <span>Score: {score} </span>
        <span style={{ marginLeft: 20 }}>Time: {timeLeft}s</span>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ border: '2px solid black', background: '#fff' }}
      />
      {gameOver && (
        <div>
          <h3>Game Over! Final Score: {score}</h3>
          <button onClick={handleRestart} style={{ fontSize: 18, padding: '8px 24px', marginTop: 10 }}>Restart</button>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <small>Move: ← →, Shoot: Space</small>
      </div>
    </div>
  );
};

export default App;
