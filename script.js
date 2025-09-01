const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.querySelector('.game-container');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreText = document.getElementById('highScoreText');

let bird, pipes, score, level, gameSpeed, gameState, clouds;
let scaleFactor;
let audioCtx; // For sound effects

const birdProps = {
    x: 100,
    y: 150,
    radius: 15,
    gravity: 0.35,
    lift: -6,
    velocity: 0,
    rotation: 0
};

const pipeProps = {
    width: 60,
    gap: 160,
    spawnDistance: 300,
    speed: 3
};

// --- Audio ---
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    gainNode.connect(audioCtx.destination);
    oscillator.connect(gainNode);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

    switch (type) {
        case 'flap':
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
            oscillator.type = 'triangle';
            break;
        case 'score':
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
            oscillator.type = 'sine';
            break;
        case 'gameOver':
            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
            oscillator.type = 'sawtooth';
            break;
    }

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
}


// --- Game Setup ---
function resizeCanvas() {
    const containerRect = gameContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    scaleFactor = Math.sqrt(canvas.height / 600);
}

function init() {
    gameState = 'start';
    bird = { ...birdProps,
        x: 100 * scaleFactor,
        y: 150 * scaleFactor,
        radius: 15 * scaleFactor,
        gravity: birdProps.gravity,   // constant (not scaled)
        lift: birdProps.lift,         // constant (not scaled)
        velocity: 0
    };
    pipes = [];
    clouds = [];
    score = 0;
    level = 1;
    gameSpeed = pipeProps.speed;
    updateUI();

    for (let i = 0; i < 5; i++) {
        clouds.push(createCloud(true));
    }
    pipes.push(createPipe(canvas.width));
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Game Logic ---
function update() {
    updateClouds();
    if (gameState !== 'playing') return;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.velocity < 0) {
        bird.rotation = -0.3;
    } else if (bird.velocity > 1) {
        bird.rotation = Math.min(bird.velocity * 0.1, 0.7);
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= gameSpeed * scaleFactor;

        if (checkCollision(bird, pipes[i])) {
            gameOver();
            return;
        }

        if (!pipes[i].passed && pipes[i].x < bird.x - bird.radius) {
            pipes[i].passed = true;
            score++;
            playSound('score'); // Sound on score
            updateScore();
        }

        if (pipes[i].x + pipeProps.width * scaleFactor < 0) {
            pipes.splice(i, 1);
        }
    }

    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe || canvas.width - lastPipe.x >= pipeProps.spawnDistance * scaleFactor) {
        pipes.push(createPipe(canvas.width));
    }

    if (bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        gameOver();
    }
}

function flap() {
    if (gameState === 'playing') {
        bird.velocity = bird.lift;
        playSound('flap'); // Sound on flap
    }
}

function createPipe(xPos) {
    const gap = getGapForLevel();
    const topPipeHeight = Math.random() * (canvas.height - gap - 100 * scaleFactor) + 50 * scaleFactor;

    return {
        x: xPos,
        top: topPipeHeight,
        bottom: topPipeHeight + gap,
        width: pipeProps.width * scaleFactor,
        passed: false,
        moving: level >= 2 && Math.random() < 0.3,
        moveSpeed: (Math.random() - 0.5) * 2 * scaleFactor,
    };
}

function getGapForLevel() {
    let baseGap = pipeProps.gap * scaleFactor;
    if (level >= 3) {
        return Math.random() < 0.25 ? baseGap * 0.8 : baseGap;
    }
    return baseGap;
}

function checkCollision(bird, pipe) {
    if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width) {
        if (bird.y - bird.radius < pipe.top || bird.y + bird.radius > pipe.bottom) {
            return true;
        }
    }
    return false;
}

function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
    if (score > 0 && score % 10 === 0) {
        const currentLevel = level;
        const newLevel = Math.floor(score / 10) + 1;
        if (newLevel > currentLevel) {
            levelUp();
        }
    }
}

function levelUp() {
    level++;
    gameSpeed += 0.5;
    levelDisplay.textContent = `Level: ${level}`;
}

function startGame() {
    init();
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
}

function gameOver() {
    if (gameState === 'playing') { // Prevent sound from playing multiple times
        playSound('gameOver'); // Sound on game over
    }
    gameState = 'gameOver';
    gameOverScreen.style.display = 'flex';
    const highScore = localStorage.getItem('flappyHighScore') || 0;
    if (score > highScore) {
        localStorage.setItem('flappyHighScore', score);
        highScoreText.textContent = `New High Score!`;
    } else {
        highScoreText.textContent = `High Score: ${highScore}`;
    }
    finalScoreDisplay.textContent = `Score: ${score}`;
}

function updateUI() {
    scoreDisplay.textContent = `Score: ${score}`;
    levelDisplay.textContent = `Level: ${level}`;
}

// --- Scenery Logic ---
function createCloud(isInitial) {
    return {
        x: isInitial ? Math.random() * canvas.width : canvas.width + 100,
        y: Math.random() * canvas.height * 0.6,
        radius: (Math.random() * 20 + 20) * scaleFactor,
        speed: (Math.random() * 0.5 + 0.2) * scaleFactor
    };
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.radius * 2 < 0) {
            Object.assign(cloud, createCloud(false));
        }
    });
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBird();
    pipes.forEach(pipe => {
        if (pipe.moving && gameState === 'playing') {
            pipe.top += pipe.moveSpeed;
            pipe.bottom += pipe.moveSpeed;
            if (pipe.top < 50 * scaleFactor || pipe.bottom > canvas.height - 50 * scaleFactor) {
                pipe.moveSpeed *= -1;
            }
        }
        drawPipe(pipe);
    });
}

function drawBackground() {
    const theme = getComputedStyle(document.documentElement);
    const bgColor = theme.getPropertyValue('--bg-color').trim();
    const bgGradient = theme.getPropertyValue('--bg-gradient').trim();

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, bgGradient);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawClouds();
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.radius, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(cloud.x + cloud.radius * 0.7, cloud.y - cloud.radius * 0.5, cloud.radius * 0.8, Math.PI * 1, Math.PI * 2);
        ctx.arc(cloud.x + cloud.radius * 1.8, cloud.y, cloud.radius, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
    });
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(bird.radius * 0.3, -bird.radius * 0.4, bird.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(bird.radius * 0.4, -bird.radius * 0.4, bird.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(bird.radius * 0.5, 0);
    ctx.lineTo(bird.radius * 1.2, -bird.radius * 0.2);
    ctx.lineTo(bird.radius * 1.2, bird.radius * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPipe(pipe) {
    const theme = getComputedStyle(document.documentElement);
    const pipeColor = theme.getPropertyValue('--pipe-color').trim();
    const pipeHeadColor = theme.getPropertyValue('--pipe-head-color').trim();
    const pipeHeadHeight = 25 * scaleFactor;

    ctx.fillStyle = pipeColor;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
    ctx.fillStyle = pipeHeadColor;
    ctx.fillRect(pipe.x - 5 * scaleFactor, pipe.top - pipeHeadHeight, pipe.width + 10 * scaleFactor, pipeHeadHeight);

    ctx.fillStyle = pipeColor;
    ctx.fillRect(pipe.x, pipe.bottom, pipe.width, canvas.height - pipe.bottom);
    ctx.fillStyle = pipeHeadColor;
    ctx.fillRect(pipe.x - 5 * scaleFactor, pipe.bottom, pipe.width + 10 * scaleFactor, pipeHeadHeight);
}

// --- Event Listeners ---
window.addEventListener('resize', () => {
    resizeCanvas();
    init();
});

startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio(); // Initialize audio on user interaction
    startGame();
});

restartButton.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio(); // Initialize audio on user interaction
    startGame();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'start' || gameState === 'gameOver') {
            initAudio(); // Initialize audio on user interaction
            startGame();
        } else if (gameState === 'playing') {
            flap();
        }
    }
});

gameContainer.addEventListener('click', () => {
    if (gameState === 'playing') {
        flap();
    }
});

// --- Initial Load ---
resizeCanvas();
init();
gameLoop();

