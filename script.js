const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');

let detector;
let poseIndex = 1;
let countdown = 15;
let countdownTimer;
let recording = false;

function drawKeypoints(kps) {
  ctx.fillStyle = 'red';
  kps.forEach(kp => {
    if (kp.score > 0.4) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

function drawCountdown() {
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`倒數：${countdown}`, canvas.width / 2, canvas.height / 2);
}

async function detect() {
  const poses = await detector.estimatePoses(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (poses.length > 0) {
    const keypoints = poses[0].keypoints;
    drawKeypoints(keypoints);

    if (recording && countdown <= 0) {
      savePose(keypoints);
      recording = false;
    }
  }

  if (recording && countdown > 0) {
    drawCountdown();
  }

  requestAnimationFrame(detect);
}

function savePose(keypoints) {
  const data = JSON.stringify({ keypoints }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pose${poseIndex}.json`;
  a.click();
  poseIndex++;
}

function startCountdown() {
  countdown = 15;
  recording = true;
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdown <= 0) clearInterval(countdownTimer);
  }, 1000);
}

async function start() {
  startBtn.disabled = true;
  startBtn.style.display = 'none';

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { exact: 'environment' },
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  });

  video.srcObject = stream;
  await video.play();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);

  try {
    await tf.setBackend('webgl'); await tf.ready();
  } catch {
    try {
      await tf.setBackend('wasm'); await tf.ready();
    } catch {
      await tf.setBackend('cpu'); await tf.ready();
    }
  }

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );

  startCountdown();
  detect();
}

startBtn.addEventListener('click', start);
