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

document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('play-again-btn').addEventListener('click', () => location.reload());

function startQuiz() {
  userName = document.getElementById('username').value.trim();
  if (!userName) return alert("Please enter your name!");

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
    button.classList.add('fade-in');
    button.onclick = () => selectAnswer(choice);
    answerButtons.appendChild(button);
  });

  startTimer();
}

function startTimer() {
  document.getElementById('time-remaining').textContent = timeRemaining;
  timer = setInterval(() => {
    timeRemaining--;
    document.getElementById('time-remaining').textContent = timeRemaining;
    if (timeRemaining <= 0) {
      clearInterval(timer);
      selectAnswer(null); // Timeout
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
    pointsEarned = Math.max(1, timeRemaining); // faster → more points
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

  currentQuestionIndex++;

  if (currentQuestionIndex < totalQuestions) {
    setTimeout(showQuestion, 600);
  } else {
    endQuiz();
  }
}

function endQuiz() {
  document.getElementById('quiz-container').classList.add('hidden');
  const resultBox = document.getElementById('result-container');
  resultBox.classList.remove('hidden');

  document.getElementById('score-text').textContent = `${userName}, you scored ${score} points`;

  const badges = [];
  if (score >= 9 * totalQuestions) badges.push("🏆 Quiz Master");
  if ((totalTime / totalQuestions) < 5) badges.push("⚡ Fast Thinker");
  if (correctStreak >= 5) badges.push("🔥 Streak Hero");
  if (score <= 5 && correctStreak >= 3) badges.push("🔁 Comeback Kid");

  document.getElementById('badges').innerHTML = `<strong>Badges:</strong> ${badges.length ? badges.join(" ") : "None"}`;

  updateLeaderboard(userName, score);
  showBreakdown();
}

function showBreakdown() {
  const breakdown = document.createElement('div');
  breakdown.classList.add('breakdown-list');

  breakdown.innerHTML = `<h3>📊 Per-Question Breakdown:</h3>`;
  breakdown.innerHTML += `<ul>` +
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

function updateLeaderboard(name, score) {
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard.slice(0, 5)));

  let leaderboardText = "<h3>🏅 Top 5 Scores</h3><ul>";
  leaderboard.slice(0, 5).forEach((entry, index) => {
    leaderboardText += `<li>${index + 1}. ${entry.name} - ${entry.score} pts</li>`;
  });
  leaderboardText += "</ul>";

  const leaderboardBox = document.createElement('div');
  leaderboardBox.innerHTML = leaderboardText;
  document.getElementById('result-container').appendChild(leaderboardBox);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
