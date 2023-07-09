const { invoke } = window.__TAURI__.tauri;

const questionDiv = document.querySelector('.question');
const answerDiv = document.querySelector('.answer');
const buttons = document.querySelectorAll('.container button');

let currentQuestion;
let gameEnded = false;
let questions; // Variable to store the loaded questions

async function loadQuestions() {
  const response = await fetch('assets/questions.json');
  const questions = await response.json();

  return questions;
}

// oh god...
function clearButtons() {
  if (gameEnded) {
    buttons[0].style.display = 'none';
    buttons[1].style.display = 'none';
    buttons[2].style.display = 'block';
  } else {
    buttons[0].style.display = 'block';
    buttons[1].style.display = 'block';
    buttons[2].style.display = 'none';
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  questions = await loadQuestions();
  startGame();
});

async function guess(question, answer) {
  const data = await invoke("guess", { question, answer })

  if (data.persons.length === 0) return endGame('I couldn\'t guess... you win!')
  if (data.persons.length === 1) return endGame(`I guess... `, data.persons[0].name)

  updateQuestion(data)
}

function endGame(content, correctAnswer) {
  message(content, correctAnswer);
  gameEnded = true;
  clearButtons()
}

function startGame() {
  answerDiv.textContent = '';
  gameEnded = false;
  clearButtons()
  resetData()
}

async function updateQuestion(data) {
  const receivedQuestion = await get_question(data)

  const questionText = questions.find((el) => el.id === receivedQuestion).text;

  message(questionText)
}

async function resetData() {
  const data = await invoke("reset_data");

  updateQuestion(data)
}

function message(content, answer) {
  questionDiv.textContent = content;

  if (answer) answerDiv.textContent = answer;
}

/**
 * Answer from HTML.
 * @param {Number} type The answer type (yes = 0 | no = 1 | idk = 2)
 */
function answer(type) {
  guess(currentQuestion, type)
}

async function get_question() {
  const question = await invoke("choose_question")

  currentQuestion = question;

  return question;
}