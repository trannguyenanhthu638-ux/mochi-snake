const screens = {
  home: document.getElementById('homeScreen'),
  how: document.getElementById('howScreen'),
  level: document.getElementById('levelScreen'),
  leaderboard: document.getElementById('leaderboardScreen'),
  game: document.getElementById('gameScreen')
};

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  (screens[name] || screens.home).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'leaderboard') renderLeaderboard();
  if (name !== 'game') stopGame();
}

document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.go)));
document.querySelectorAll('[data-screen-link]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault(); showScreen(link.dataset.screenLink);
}));

const levelNames = {1:'Sweet Garden',2:'Peach Paradise',3:'Berry Challenge'};
const levelSpeeds = {1:170,2:125,3:90};
const levelTargets = {1:100,2:150,3:200};
let currentLevel = 1;

document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
  currentLevel = Number(button.dataset.level);
  document.getElementById('gameLevelName').textContent = levelNames[currentLevel];
  startGame(); showScreen('game');
}));

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function renderLeaderboard() {
  const container = document.getElementById('leaderboardRows');
  let scores = [];
  try { scores = JSON.parse(localStorage.getItem('mochiLeaderboard') || '[]'); } catch(e) {}
  scores.sort((a,b) => b.score-a.score);
  if (!scores.length) { container.innerHTML = '<p class="empty-state">🌷 Chưa có thành tích nào. Hãy chơi một lượt nhé!</p>'; return; }
  container.innerHTML = scores.slice(0,10).map((item,i) =>
    `<div class="leader-row"><span class="rank">#${i+1}</span><span>${escapeHTML(item.name || 'Mochi Player')}</span><strong>${Number(item.score)||0}</strong></div>`
  ).join('');
}
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// Âm thanh nhẹ bằng Web Audio API, không cần tải tệp bên ngoài.
let soundEnabled = true;
let audioContext = null;
function playTone(freq=660, duration=0.09, type='sine') {
  if (!soundEnabled) return;
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0.055, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch(e) {}
}
const soundButton = document.getElementById('soundButton');
if (soundButton) soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? '♫ Âm thanh' : '♪̸ Đã tắt';
  showToast(soundEnabled ? 'Đã bật âm thanh' : 'Đã tắt âm thanh');
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cell = 20, columns = canvas.width/cell, rows = canvas.height/cell;
let snake=[], fruit={x:10,y:10}, direction={x:1,y:0}, nextDirection={x:1,y:0};
let score=0, gameTimer=null, isPaused=false, isGameOver=false, hasStarted=false, isVictory=false;
function stopGame(){ if(gameTimer){clearInterval(gameTimer);gameTimer=null;} }
function placeFruit(){
  if(snake.length >= columns*rows-1) return;
  do { fruit={x:Math.floor(Math.random()*columns),y:Math.floor(Math.random()*rows)}; }
  while(snake.some(p=>p.x===fruit.x&&p.y===fruit.y));
}
function startGame(){
  stopGame(); snake=[{x:7,y:10},{x:6,y:10},{x:5,y:10}];
  direction={x:1,y:0}; nextDirection={x:1,y:0}; score=0;
  isPaused=false;isGameOver=false;hasStarted=false;isVictory=false;
  document.getElementById('scoreValue').textContent='0';
  document.getElementById('bestValue').textContent=localStorage.getItem('mochiBestScore')||'0';
  document.getElementById('targetValue').textContent=String(levelTargets[currentLevel]);
  document.getElementById('pauseButton').textContent='⏸ Tạm dừng';
  document.getElementById('gameMessage').textContent='🐍 Mochi đã sẵn sàng! Dùng phím hoặc vuốt để bắt đầu.';
  placeFruit();drawGame();
}
function drawGame(){
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fffaf5';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#f1e9df';ctx.lineWidth=1;
  for(let x=0;x<=canvas.width;x+=cell){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for(let y=0;y<=canvas.height;y+=cell){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
  ctx.font='18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍓',fruit.x*cell+cell/2,fruit.y*cell+cell/2+1);
  snake.forEach((p,i)=>{
    ctx.fillStyle=i===0?'#6f9f7c':'#9bc9a5';ctx.beginPath();ctx.roundRect(p.x*cell+2,p.y*cell+2,cell-4,cell-4,7);ctx.fill();
    if(i===0){ctx.fillStyle='#344b3b';ctx.beginPath();ctx.arc(p.x*cell+7,p.y*cell+7,2,0,Math.PI*2);ctx.arc(p.x*cell+14,p.y*cell+7,2,0,Math.PI*2);ctx.fill();}
  });
  if(isPaused||isGameOver){ctx.fillStyle='rgba(255,248,242,.82)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#648b70';ctx.font='bold 28px Nunito,Arial';ctx.fillText(isVictory?'You Win!':isGameOver?'Game Over!':'Tạm dừng',canvas.width/2,canvas.height/2);}
}
function beginMoving(){
  if(hasStarted||isGameOver)return;hasStarted=true;
  document.getElementById('gameMessage').textContent='🍀 Cố lên Mochi!';
  gameTimer=setInterval(gameStep,levelSpeeds[currentLevel]);
}
function changeDirection(x,y){
  if(x===-direction.x&&y===-direction.y)return;
  nextDirection={x,y};beginMoving();
}
function gameStep(){
  if(isPaused||isGameOver)return;
  direction=nextDirection;
  const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
  const hitWall=head.x<0||head.x>=columns||head.y<0||head.y>=rows;
  const eating=head.x===fruit.x&&head.y===fruit.y;
  const bodyToCheck=eating?snake:snake.slice(0,-1);
  if(hitWall||bodyToCheck.some(p=>p.x===head.x&&p.y===head.y)){finishGame(false);return;}
  snake.unshift(head);
  if(eating){
    score+=10;document.getElementById('scoreValue').textContent=String(score);playTone(820,.1,'triangle');
    if(score>=levelTargets[currentLevel]){finishGame(true);return;}
    placeFruit();
  }else snake.pop();
  drawGame();
}
function finishGame(won){
  isGameOver=true;isVictory=won;stopGame();drawGame();
  const best=Number(localStorage.getItem('mochiBestScore')||0);
  if(score>best)localStorage.setItem('mochiBestScore',String(score));
  document.getElementById('bestValue').textContent=String(Math.max(best,score));
  document.getElementById('gameMessage').textContent=won?
    `🎉 Tuyệt vời! Mochi đã hoàn thành ${levelNames[currentLevel]} với ${score} điểm!`:
    `💗 Trò chơi kết thúc! Bạn đạt ${score} điểm. Nhấn Chơi lại để thử lần nữa nhé!`;
  if(won)playTone(1040,.35,'sine');else playTone(220,.22,'triangle');
  if(score>0){
    let scores=[];try{scores=JSON.parse(localStorage.getItem('mochiLeaderboard')||'[]');}catch(e){}
    const player=(prompt('Chúc mừng! Nhập tên để lưu bảng xếp hạng nhé:','Mochi Player')||'Mochi Player').trim().slice(0,18);
    scores.push({name:player||'Mochi Player',score,level:levelNames[currentLevel],date:new Date().toLocaleDateString('vi-VN')});
    scores.sort((a,b)=>b.score-a.score);localStorage.setItem('mochiLeaderboard',JSON.stringify(scores.slice(0,10)));
  }
}
function togglePause(){
  if(isGameOver)return;
  if(!hasStarted){showToast('Di chuyển Mochi trước nhé!');return;}
  isPaused=!isPaused;document.getElementById('pauseButton').textContent=isPaused?'▶ Tiếp tục':'⏸ Tạm dừng';
  document.getElementById('gameMessage').textContent=isPaused?'⏸ Mochi đang nghỉ ngơi.':'🍀 Tiếp tục thôi!';drawGame();
}
document.getElementById('pauseButton').addEventListener('click',togglePause);
document.getElementById('restartButton').addEventListener('click',startGame);
document.addEventListener('keydown',e=>{
  const keys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'];
  if(keys.includes(e.key)&&screens.game.classList.contains('active'))e.preventDefault();
  if(!screens.game.classList.contains('active'))return;
  switch(e.key){
    case'ArrowUp':case'w':case'W':changeDirection(0,-1);break;
    case'ArrowDown':case's':case'S':changeDirection(0,1);break;
    case'ArrowLeft':case'a':case'A':changeDirection(-1,0);break;
    case'ArrowRight':case'd':case'D':changeDirection(1,0);break;
    case' ':togglePause();break;
  }
});
document.querySelectorAll('[data-dir]').forEach(btn=>btn.addEventListener('click',()=>{
  const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};changeDirection(...dirs[btn.dataset.dir]);
}));
// Vuốt trên canvas để điều khiển điện thoại.
let touchStart=null;
canvas.addEventListener('touchstart',e=>{const t=e.changedTouches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});
canvas.addEventListener('touchend',e=>{
  if(!touchStart)return;const t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))>18){if(Math.abs(dx)>Math.abs(dy))changeDirection(dx>0?1:-1,0);else changeDirection(0,dy>0?1:-1);}
  touchStart=null;
},{passive:true});
showScreen('home');
