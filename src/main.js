const { invoke } = window.__TAURI__.tauri;

const questionDiv = document.querySelector('.question');
const answerDiv = document.querySelector('.answer');
const buttons = document.querySelectorAll('.container button');

let currentQuestion;
let gameEnded = false;
let questions; // Variable to store the loaded questions

let expandCharacter;
let expandQuestions;
let expandCustomQuestions = [];

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
    const data = await invoke("guess", { question, answer });

    if (data.persons.length === 0) return endGame('I couldn\'t guess... you win!');
    if (data.persons.length === 1) return endGame(`I guess... `, data.persons[0].name);

    updateQuestion(data);
}

function endGame(content, correctAnswer) {
    message(content, correctAnswer);
    gameEnded = true;
    clearButtons();
}

function startGame() {
    answerDiv.textContent = '';
    gameEnded = false;
    clearButtons();
    resetData();
}

async function updateQuestion(data) {
    const receivedQuestion = await get_question(data);

    const questionText = questions.find((el) => el.id === receivedQuestion).text;

    message(questionText);
}

async function resetData() {
    const data = await invoke("reset_data");

    updateQuestion(data);
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
    guess(currentQuestion, type);
}

async function get_question() {
    const question = await invoke("choose_question");

    currentQuestion = question;

    return question;
}

function expandDataset() {
    var xhr = new XMLHttpRequest();

    xhr.onload = function () {
        if (xhr.status === 200) {
            document.body.innerHTML = xhr.responseText;

            var backButton = document.querySelector('.nav');
            backButton.addEventListener('click', goBack);
        } else {
            console.log('Error loading expand.html. Status code: ' + xhr.status);
        }
    };

    xhr.open('GET', 'expand.html', true);
    xhr.send();
}

function goBack() {
    window.location.reload();
}

async function random() {
    const response = await fetch('assets/celebrities.json');
    const celebrities = await response.json();

    const randomCelebrity = celebrities[Math.floor(Math.random() * celebrities.length)];

    document.getElementById('character').value = randomCelebrity;
}

function next() {
    if (!expandCharacter) {
        const character = document.getElementById('character').value;
        const selectElement = document.getElementById('questions');

        if (character === '') return;

        expandCharacter = character;

        document.getElementById('character').classList.add('hidden');
        document.getElementById('random').classList.add('hidden');
        selectElement.classList.remove('hidden');
        document.getElementById('text').innerHTML = `What questions apply to ${document.getElementById('character').value}? (CTRL + click to select multiple)`;

        questions.forEach((question, index) => {
            const option = document.createElement('option');
            option.value = question.id;
            option.textContent = question.text;
            option.id = 'q';
            selectElement.appendChild(option);

            if (index !== questions.length - 1) {
                const separator = document.createElement('option');
                separator.value = "";
                separator.style.fontSize = '5pt';
                separator.disabled = true;
                separator.innerHTML = '&nbsp;';
                selectElement.appendChild(separator);
            }
        });
    } else {
        const selectElement = document.getElementById('questions');
        const selected = Array.from(selectElement.selectedOptions).map(option => parseInt(option.value));

        if (selected.length === 0) return;

        expandQuestions = selected;

        document.getElementById('next').classList.add('hidden');
        document.getElementById('questions').classList.add('hidden');
        document.getElementById('addBtn').classList.remove('hidden');
        document.getElementById('save').classList.remove('hidden');
        document.getElementById('text').innerHTML = `Would you like to add a custom question or save ${expandCharacter} to the dataset?`;
    }
}

function addQuestion() {
    document.getElementById('addQuestion').classList.remove('hidden');
    document.getElementById('addBtn').classList.add('hidden');
    document.getElementById('save').classList.add('hidden');
    document.getElementById('add').classList.remove('hidden');
    document.getElementById('text').innerHTML = `What question do you want to add to ${document.getElementById('character').value}?`;
}

function add() {
    const question = document.getElementById('addQuestion').value;

    if (question === '') return;

    expandCustomQuestions.push({ id: expandCustomQuestions[0] ? expandCustomQuestions.length + questions.length + 1 : questions.length + 1, text: question });

    document.getElementById('addQuestion').classList.add('hidden');
    document.getElementById('addQuestion').value = '';
    document.getElementById('add').classList.add('hidden');
    document.getElementById('addBtn').classList.remove('hidden');
    document.getElementById('save').classList.remove('hidden');
    document.getElementById('text').innerHTML = `Would you like to add a custom question or save ${expandCharacter} to the dataset?`;
}

async function save() {
    const expandCustomQuestionsIDs = expandCustomQuestions.map(question => question.id);
    const data = {
        name: expandCharacter,
        questions: [...expandQuestions, ...expandCustomQuestionsIDs],
    };

    const questionsToAdd = expandCustomQuestions.map(question => ({ id: question.id, text: question.text }));
    console.log(questionsToAdd);

    await invoke("save_data", { data, questionsToAdd: JSON.stringify(questionsToAdd) });
}  