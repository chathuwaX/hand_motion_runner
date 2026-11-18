import * as THREE from "three";

const sceneElement = document.querySelector("#scene");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const startScreen = document.querySelector("#startScreen");
const gameOverScreen = document.querySelector("#gameOver");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const finalScore = document.querySelector("#finalScore");
const video = document.querySelector("#webcam");
const trackingCanvas = document.querySelector("#trackingCanvas");
const trackingStatus = document.querySelector("#trackingStatus");
const cameraPlaceholder = document.querySelector("#cameraPlaceholder");
const gestureName = document.querySelector("#gestureName");
const gestureHint = document.querySelector("#gestureHint");

const laneX = [-3.2, 0, 3.2];
let running = false;
let lane = 1;
let score = 0;
let best = Number(localStorage.getItem("handRunnerBest") || 0);
let speed = 12;
let jumpVelocity = 0;
let isSliding = false;
let slideTimeout = 0;
let obstacles = [];
let coins = [];
let muted = false;
let lastGesture = 0;

bestElement.textContent = String(best).padStart(6, "0");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ab0bc);
scene.fog = new THREE.Fog(0x9ab0bc, 32, 115);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 6.2, 11.5);
camera.lookAt(0, 2.2, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneElement.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xd9efff, 0x435164, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1cf, 3.2);
sun.position.set(-12, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
scene.add(sun);

function mat(color, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

// Track
const track = new THREE.Group();
scene.add(track);
for (let i = 0; i < 46; i++) {
  const z = 8 - i * 4;
  const segment = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.25, 3.85), mat(i % 2 ? 0x3d4b54 : 0x465963));
  segment.position.set(0, -0.15, z);
  segment.receiveShadow = true;
  track.add(segment);

  [-5.95, 5.95].forEach(x => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.85), mat(x < 0 ? 0xe7c34d : 0xd94c3f));
    curb.position.set(x, 0.04, z);
    curb.receiveShadow = true;
    track.add(curb);
  });
}

// Lane markings
[-1.6, 1.6].forEach(x => {
  for (let i = 0; i < 30; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(.09, .02, 1.25), mat(0xbac9c9));
    dash.position.set(x, 0.01, 8 - i * 5);
    track.add(dash);
  }
});

// Side buildings
function building(x, z, height, color) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(6.5, height, 7), mat(color));
  box.position.y = height / 2 - .1;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);
  for (let y = 2; y < height - 1; y += 2.4) {
    for (let wx = -2.2; wx <= 2.2; wx += 2.2) {
      const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.15), mat(0xffd98a));
      windowMesh.position.set(wx, y, x < 0 ? 3.51 : -3.51);
      windowMesh.rotation.y = x < 0 ? 0 : Math.PI;
      group.add(windowMesh);
    }
  }
  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

for (let i = 0; i < 12; i++) {
  const z = 12 - i * 14;
  building(-11, z, 7 + (i % 4), i % 2 ? 0x68727a : 0x7d8790);
  building(11, z - 6, 8 + (i % 3), i % 2 ? 0x7a6d67 : 0x5d7077);
}

// Runner
const runner = new THREE.Group();
scene.add(runner);

const body = new THREE.Mesh(new THREE.CapsuleGeometry(.55, 1.35, 5, 10), mat(0x20bfc1));
body.position.y = 2;
body.castShadow = true;
runner.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(.48, 16, 12), mat(0xd89c79));
head.position.y = 3.48;
head.castShadow = true;
runner.add(head);

const hair = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x152332));
hair.position.y = 3.62;
hair.rotation.x = -.15;
runner.add(hair);

const pack = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.1, .38), mat(0xf1b92e));
pack.position.set(0, 2.1, .48);
pack.castShadow = true;
runner.add(pack);

const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(.18, .95, 4, 8), mat(0x283b51));
leftLeg.position.set(-.28, .72, 0);
leftLeg.castShadow = true;
runner.add(leftLeg);
const rightLeg = leftLeg.clone();
rightLeg.position.x = .28;
runner.add(rightLeg);

const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(.14, 1, 4, 8), mat(0xd89c79));
leftArm.position.set(-.72, 2.05, 0);
leftArm.rotation.z = -.18;
runner.add(leftArm);
const rightArm = leftArm.clone();
rightArm.position.x = .72;
rightArm.rotation.z = .18;
runner.add(rightArm);

runner.position.set(laneX[lane], 0, 2);

function makeObstacle(z) {
  const group = new THREE.Group();
  const kind = Math.random();
  if (kind < .45) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.25, .45), mat(0xf15a3b));
    barrier.position.y = 1.15;
    barrier.castShadow = true;
    group.add(barrier);
    [-.72, .72].forEach(x => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.35, .47), mat(0xffd63a));
      stripe.position.set(x, 1.15, 0);
      stripe.rotation.z = -.45;
      group.add(stripe);
    });
  } else if (kind < .75) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat(0xb66c3e));
    crate.position.y = 1;
    crate.castShadow = true;
    group.add(crate);
  } else {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.8, .35), mat(0x32bfc5));
    sign.position.y = 2.65;
    sign.castShadow = true;
    group.add(sign);
    [-.9, .9].forEach(x => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.3, .16), mat(0x3b4d59));
      post.position.set(x, 1.15, 0);
      group.add(post);
    });
  }
  const selectedLane = Math.floor(Math.random() * 3);
  group.position.set(laneX[selectedLane], 0, z);
  group.userData.lane = selectedLane;
  group.userData.low = kind < .45;
  scene.add(group);
  obstacles.push(group);
}

function makeCoin(z) {
  const coin = new THREE.Mesh(
    new THREE.TorusGeometry(.38, .12, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xffd52e, emissive: 0x996600, emissiveIntensity: .35, metalness: .55, roughness: .25 })
  );
  const selectedLane = Math.floor(Math.random() * 3);
  coin.position.set(laneX[selectedLane], 1.5, z);
  coin.rotation.y = Math.PI / 2;
  coin.userData.lane = selectedLane;
  scene.add(coin);
  coins.push(coin);
}

for (let z = -25; z > -150; z -= 18) makeObstacle(z);
for (let z = -10; z > -150; z -= 9) makeCoin(z);

function resetGame() {
  obstacles.forEach(o => scene.remove(o));
  coins.forEach(c => scene.remove(c));
  obstacles = [];
  coins = [];
  lane = 1;
  score = 0;
  speed = 12;
  jumpVelocity = 0;
  isSliding = false;
  runner.scale.y = 1;
  runner.position.set(0, 0, 2);
  for (let z = -25; z > -150; z -= 18) makeObstacle(z);
  for (let z = -10; z > -150; z -= 9) makeCoin(z);
}

function startGame() {
  resetGame();
  running = true;
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  initCamera();
}

function endGame() {
  running = false;
  best = Math.max(best, Math.floor(score));
  localStorage.setItem("handRunnerBest", String(best));
  bestElement.textContent = String(best).padStart(6, "0");
  finalScore.textContent = String(Math.floor(score)).padStart(6, "0");
  gameOverScreen.classList.remove("hidden");
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

document.querySelector("#soundButton").addEventListener("click", event => {
  muted = !muted;
  event.currentTarget.style.opacity = muted ? ".45" : "1";
});

function moveLane(direction) {
  lane = THREE.MathUtils.clamp(lane + direction, 0, 2);
}

function jump() {
  if (runner.position.y <= .02) jumpVelocity = 8.5;
}

function slide() {
  if (runner.position.y < .1) {
    isSliding = true;
    clearTimeout(slideTimeout);
    slideTimeout = setTimeout(() => { isSliding = false; }, 850);
  }
}

window.addEventListener("keydown", event => {
  if (!running) return;
  const key = event.key.toLowerCase();
  if (event.key === "ArrowLeft" || key === "a") moveLane(-1);
  if (event.key === "ArrowRight" || key === "d") moveLane(1);
  if (event.key === "ArrowUp" || key === "w" || key === " ") jump();
  if (event.key === "ArrowDown" || key === "s") slide();
});

// MediaPipe Hands
let cameraTracker = null;

async function initCamera() {
  cameraPlaceholder.classList.add("hidden");
  trackingStatus.textContent = "STARTING";
  if (!navigator.mediaDevices?.getUserMedia) {
    trackingStatus.textContent = "UNAVAILABLE";
    cameraPlaceholder.classList.remove("hidden");
    return;
  }
  try {
    if (window.Hands) {
      const hands = new window.Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: .65,
        minTrackingConfidence: .65
      });
      hands.onResults(onHandResults);

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      video.srcObject = stream;
      await video.play();
      trackingCanvas.width = video.videoWidth || 640;
      trackingCanvas.height = video.videoHeight || 480;
      trackingStatus.textContent = "LIVE";

      if (window.Camera) {
        cameraTracker = new window.Camera(video, {
          onFrame: async () => hands.send({ image: video }),
          width: 640,
          height: 480
        });
        cameraTracker.start();
      } else {
        trackingStatus.textContent = "TRACKER ERROR";
      }
    } else {
      trackingStatus.textContent = "NO MODEL";
    }
  } catch (error) {
    trackingStatus.textContent = "DENIED";
    cameraPlaceholder.classList.remove("hidden");
  }
}

function onHandResults(results) {
  const ctx = trackingCanvas.getContext("2d");
  ctx.clearRect(0, 0, trackingCanvas.width, trackingCanvas.height);
  if (!results.multiHandLandmarks?.length) {
    gestureName.textContent = "RAISE HAND";
    gestureHint.textContent = "Waiting for gesture";
    return;
  }

  const landmarks = results.multiHandLandmarks[0];
  if (window.drawConnectors && window.HAND_CONNECTIONS) {
    window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: "#36dfd1", lineWidth: 2 });
    window.drawLandmarks(ctx, landmarks, { color: "#ffd52e", lineWidth: 1, radius: 2 });
  }

  const wrist = landmarks[0];
  const palm = landmarks[9];
  const palmHeight = palm.y;
  const horizontal = 1 - wrist.x;
  const now = performance.now();
  if (now - lastGesture < 500) return;

  if (horizontal < .3) {
    moveLane(-1);
    lastGesture = now;
    gestureName.textContent = "MOVE LEFT";
    gestureHint.textContent = "Swipe or tilt hand";
  } else if (horizontal > .68) {
    moveLane(1);
    lastGesture = now;
    gestureName.textContent = "MOVE RIGHT";
    gestureHint.textContent = "Swipe or tilt hand";
  } else if (palmHeight < .32) {
    jump();
    lastGesture = now;
    gestureName.textContent = "JUMP";
    gestureHint.textContent = "Hand raised";
  } else if (palmHeight > .72) {
    slide();
    lastGesture = now;
    gestureName.textContent = "SLIDE";
    gestureHint.textContent = "Hand lowered";
  } else {
    gestureName.textContent = "HANDS READY";
    gestureHint.textContent = "Move left, right, up or down";
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);

  if (running) {
    speed = Math.min(24, speed + dt * .12);
    score += dt * speed * 2;
    scoreElement.textContent = String(Math.floor(score)).padStart(6, "0");

    runner.position.x = THREE.MathUtils.lerp(runner.position.x, laneX[lane], 1 - Math.pow(.0008, dt));

    if (runner.position.y > 0 || jumpVelocity > 0) {
      jumpVelocity -= 20 * dt;
      runner.position.y += jumpVelocity * dt;
      if (runner.position.y < 0) {
        runner.position.y = 0;
        jumpVelocity = 0;
      }
    }

    runner.scale.y = THREE.MathUtils.lerp(runner.scale.y, isSliding ? .55 : 1, 1 - Math.pow(.01, dt));

    track.children.forEach(child => {
      child.position.z += speed * dt;
      if (child.position.z > 14) child.position.z -= 184;
    });

    obstacles.forEach((obstacle, index) => {
      obstacle.position.z += speed * dt;
      if (obstacle.position.z > 18) {
        scene.remove(obstacle);
        obstacles[index] = null;
      }
      if (obstacle.position.z > -.2 && obstacle.position.z < 1.8 &&
          obstacle.userData.lane === lane) {
        const avoided = (obstacle.userData.low && runner.position.y > 1.35) ||
                        (isSliding && obstacle.userData.low);
        if (!avoided) endGame();
      }
    });
    obstacles = obstacles.filter(Boolean);

    if (obstacles.length < 8) makeObstacle(-105 - Math.random() * 35);

    coins.forEach((coin, index) => {
      coin.position.z += speed * dt;
      coin.rotation.z += dt * 5;
      if (coin.position.z > 18) {
        scene.remove(coin);
        coins[index] = null;
      } else if (coin.position.z > -.2 && coin.position.z < 1.8 &&
                 coin.userData.lane === lane &&
                 Math.abs(runner.position.y - coin.position.y) < 2) {
        score += 50;
        scene.remove(coin);
        coins[index] = null;
      }
    });
    coins = coins.filter(Boolean);
    if (coins.length < 10) makeCoin(-100 - Math.random() * 30);

    leftLeg.rotation.x = Math.sin(performance.now() * .012) * .35;
    rightLeg.rotation.x = -Math.sin(performance.now() * .012) * .35;
  }

  renderer.render(scene, camera);
}

animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
