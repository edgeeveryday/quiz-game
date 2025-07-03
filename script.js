import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXSZOrQZTOy-Q1mCP2LAWkBcaVTyDKHmA",
  authDomain: "smart-quiz-game.firebaseapp.com",
  projectId: "smart-quiz-game",
  storageBucket: "smart-quiz-game.firebasestorage.app",
  messagingSenderId: "940028495772",
  appId: "1:940028495772:web:5170f70d14faa1e6e86a59"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;

// Anonymous login
signInAnonymously(auth)
  .then(() => {
    console.log("✅ Signed in anonymously");
  })
  .catch((error) => {
    console.error("❌ Anonymous sign-in failed", error);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("👤 Current UID:", user.uid);
    displayAllCategoryLeaderboards(); // Show leaderboards once user is authenticated
  }
});

let allQuestions = {};
let selectedQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeRemaining = 10;
let correctStreak = 0;
let totalTime = 0;
let totalQuestions = 10;
let userName = "";
let selectedCategory = "math";
let perQuestionBreakdown = [];

const correctSound = new Audio('correct.mp3');
const wrongSound = new Audio('wrong.mp3');
const beepSound = new Audio('beep.mp3');
const buzzerSound = new Audio('buzzer.mp3');


document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('play-again-btn').addEventListener('click', () => location.reload());

function containsProfanity(name) {
  const bannedWords = ['fool', 'idiot', 'dumb', 'nazi', 'f***', 's***', 'a**', 'bitch', 'bastard'];
  const lowered = name.toLowerCase();
  return bannedWords.some(word => lowered.includes(word));
}

function startQuiz() {
  userName = document.getElementById('username').value.trim();

  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(userName);
  if (!isValid) {
    alert("❌ Please enter a valid username (3–20 characters, letters, numbers, and underscores only).");
    return;
  }

  if (containsProfanity(userName)) {
    alert("⚠️ Please choose a more appropriate username.");
    return;
  }

  selectedCategory = document.querySelector('input[name="category"]:checked').value;

  fetch('questions.json')
    .then(response => response.json())
    .then(data => {
      allQuestions = data;
      selectedQuestions = pickUniqueQuestions(data[selectedCategory], totalQuestions);
      currentQuestionIndex = 0;
      score = 0;
      perQuestionBreakdown = [];

      document.getElementById('quiz-start').classList.add('hidden');
      document.getElementById('quiz-container').classList.remove('hidden');
      showQuestion();
    })
    .catch(error => {
      console.error('Failed to load questions:', error);
    });
}

function pickUniqueQuestions(questionPool, count) {
  const shuffled = [...questionPool];
  shuffle(shuffled);
  return shuffled.slice(0, count);
}

function showQuestion() {
  clearInterval(timer);
  timeRemaining = 10;

  const question = selectedQuestions[currentQuestionIndex];
  document.getElementById('question-number').textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;
  document.getElementById('question-text').textContent = question.question;

  const answers = [...question.choices];
  shuffle(answers);

  const answerButtons = document.getElementById('answer-buttons');
  answerButtons.innerHTML = '';
  answers.forEach(choice => {
    const button = document.createElement('button');
    button.textContent = choice;
    //button.classList.add('fade-in');
    button.onclick = () => selectAnswer(choice);
    answerButtons.appendChild(button);
  });

  startTimer();
}



function startTimer() {
  const timerEl = document.getElementById('time-remaining');
  timerEl.textContent = timeRemaining;
  timerEl.classList.remove('timer-pulse');

  timer = setInterval(() => {
    timeRemaining--;
    timerEl.textContent = timeRemaining;
    timerEl.classList.remove('timer-pulse');
    void timerEl.offsetWidth;
    timerEl.classList.add('timer-pulse');

    // 🔊 Beep in last 3 seconds
    if (timeRemaining <= 3 && timeRemaining > 0) {
      beepSound.currentTime = 0;
      beepSound.play();
    }

    // 🛑 Time's up
    if (timeRemaining <= 0) {
      clearInterval(timer);
      buzzerSound.play(); // 🔊 Final buzzer
      selectAnswer(null);
    }
  }, 1000);
}

function selectAnswer(choice) {
  clearInterval(timer);
  const question = selectedQuestions[currentQuestionIndex];
  const correct = choice === question.answer;

  let pointsEarned = 0;
  if (correct) {
    correctSound.play();
    pointsEarned = Math.max(1, timeRemaining); // Faster = more points
    score += pointsEarned;
    correctStreak++;
  } else {
    wrongSound.play();
    correctStreak = 0;
  }

  totalTime += (10 - timeRemaining);

  perQuestionBreakdown.push({
    question: question.question,
    yourAnswer: choice || "No answer",
    correctAnswer: question.answer,
    points: pointsEarned
  });

  // ✅ Update and animate score display
  const scoreEl = document.getElementById('score-value');
  if (scoreEl) {
    scoreEl.textContent = `Score: ${score}`;
    scoreEl.classList.remove('score-bounce');
    void scoreEl.offsetWidth; // Force reflow to restart animation
    scoreEl.classList.add('score-bounce');
  }

  currentQuestionIndex++;

 if (currentQuestionIndex < totalQuestions) {
  showQuestion(); // no fade-out
} else {
  endQuiz();
}
}

async function endQuiz() {
  document.getElementById('quiz-container').classList.add('hidden');
  const resultBox = document.getElementById('result-container');
  resultBox.classList.remove('hidden');
 // Remove only score, badges, and leaderboard if already present
document.getElementById('score-text')?.remove();
document.getElementById('badges')?.remove();
document.getElementById('leaderboard-box')?.remove();
document.querySelector('.breakdown-list')?.remove();


  const scoreText = document.createElement('div');
  scoreText.id = "score-text";
  scoreText.textContent = `${userName}, you scored ${score} points`;
  resultBox.appendChild(scoreText);

  const badges = [];
  if (score >= 9 * totalQuestions) badges.push("🏆 Quiz Master");
  if ((totalTime / totalQuestions) < 5) badges.push("⚡ Fast Thinker");
  if (correctStreak >= 5) badges.push("🔥 Streak Hero");
  if (score <= 5 && correctStreak >= 3) badges.push("🔁 Comeback Kid");

  const badgeEl = document.createElement('div');
  badgeEl.id = "badges";
  badgeEl.innerHTML = `<strong>Badges:</strong> ${badges.length ? badges.join(" ") : "None"}`;
  resultBox.appendChild(badgeEl);

  await updateLeaderboard(userName, score, selectedCategory);
  showBreakdown();
}

async function updateLeaderboard(name, score, category) {
  if (!currentUser) {
    console.error("No user signed in");
    return;
  }

  try {
    await addDoc(collection(db, 'leaderboard'), {
      uid: currentUser.uid,
      name,
      score,
      category,
      timestamp: Date.now()
    });

    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(5)
    );

    const snapshot = await getDocs(q);

    const leaderboardBox = document.createElement('div');
    leaderboardBox.id = 'leaderboard-box';
    leaderboardBox.innerHTML = `<h3>🏅 Top 5 Scores:</h3><ol>`;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.category === category) {
        leaderboardBox.innerHTML += `<li>${data.name} — ${data.score}</li>`;
      }
    });

    leaderboardBox.innerHTML += `</ol>`;
    document.getElementById('result-container').appendChild(leaderboardBox);

  } catch (err) {
    console.error("🔥 Leaderboard error:", err);
  }
}

function showBreakdown() {
  const breakdown = document.createElement('div');
  breakdown.classList.add('breakdown-list');

  breakdown.innerHTML = `<h3>📊 Per-Question Breakdown:</h3><ul>` +
    perQuestionBreakdown.map((q, i) => `
      <li>
        <strong>Q${i + 1}:</strong> ${q.question}<br/>
        <span style="color:${q.yourAnswer === q.correctAnswer ? 'lightgreen' : 'salmon'};">
          Your Answer: ${q.yourAnswer}
        </span><br/>
        Correct Answer: ${q.correctAnswer}<br/>
        Points: ${q.points}
      </li><br/>
    `).join('') +
    `</ul>`;

  document.getElementById('result-container').appendChild(breakdown);
}

// 🔥 Show top scores per category on homepage
async function displayAllCategoryLeaderboards() {
  const categories = ['math', 'science', 'history', 'movies']; // update as needed
  const container = document.getElementById('home-leaderboards');
  if (!container) return;

  container.innerHTML = '';

  for (const cat of categories) {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'));
    const snapshot = await getDocs(q);
    const filtered = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.category === cat) filtered.push(data);
    });

    const top5 = filtered.slice(0, 5);
    const section = document.createElement('div');
    section.classList.add('leaderboard-section');
    section.innerHTML = `<h3>🏆 Top in ${cat.charAt(0).toUpperCase() + cat.slice(1)}:</h3><ol>` +
      top5.map(entry => `<li>${entry.name} — ${entry.score}</li>`).join('') +
      `</ol>`;

    container.appendChild(section);
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Rules Modal Logic
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeBtn = document.querySelector('.close-btn');

rulesBtn.addEventListener('click', () => {
  rulesModal.classList.remove('hidden');
});

closeBtn.addEventListener('click', () => {
  rulesModal.classList.add('hidden');
});

// Optional: close on background click
rulesModal.addEventListener('click', (e) => {
  if (e.target === rulesModal) {
    rulesModal.classList.add('hidden');
  }
});
