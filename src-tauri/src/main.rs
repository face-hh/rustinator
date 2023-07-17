use std::env;
use std::fs::write;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use once_cell::sync::OnceCell;
use rand::prelude::SliceRandom;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri::*;

static mut ALREADY_ASKED: Vec<i32> = Vec::new();
static DATASET_PATH: OnceCell<String> = OnceCell::new();

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Persons {
    name: String,
    questions: Vec<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct DataElem {
    persons: Vec<Persons>,
    objects: Vec<Persons>,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn guess(
    question: i32,
    answer: i8,
    game_dataset: State<Mutex<DataElem>>, // Deserialize as a String
) -> Result<Option<DataElem>> {
    let mut data = game_dataset.lock().unwrap();
    let iter_data = data.persons.iter();

    let include_or_not = answer == 0;
    let filtered_data = iter_data
        .filter(|item| item.questions.contains(&question) == include_or_not)
        .cloned()
        .collect::<Vec<_>>();

    data.persons = filtered_data;

    // Send the `data` back to the frontend
    Ok(Some(data.clone()))
}

#[tauri::command]
fn choose_question(game_dataset: State<Mutex<DataElem>>) -> Result<Option<i32>> {
    let data = game_dataset.lock().unwrap();

    unsafe {
        let available_questions: Vec<i32> = data
            .persons
            .iter()
            .flat_map(|person| person.questions.iter())
            .filter(|&question| !ALREADY_ASKED.contains(question))
            .cloned()
            .collect();

        let question = available_questions.choose(&mut rand::thread_rng()).cloned();

        if let Some(question) = question {
            ALREADY_ASKED.push(question);
        }

        Ok(question)
    }
}

#[tauri::command]
fn reset_data(
    game_dataset: State<Mutex<DataElem>>,
    dataset: State<DataElem>,
) -> Result<Option<DataElem>> {
    *game_dataset.lock().unwrap() = (*dataset).clone();

    unsafe {
        ALREADY_ASKED.clear();
    }

    Ok(Some(game_dataset.lock().unwrap().clone()))
}

#[tauri::command]
fn save_data(data: serde_json::Value, questions_to_add: String, game_dataset: State<Mutex<DataElem>>) -> Result<()> {
    let dataset_path = DATASET_PATH.get().expect("Failed to get dataset path");

    let mut game_dataset = game_dataset.lock().unwrap();

    // Deserialize the `Value` into `Persons` struct
    let person: Persons = serde_json::from_value(data).unwrap();

    game_dataset.persons.push(person);

    let serialized = serde_json::to_string_pretty(&*game_dataset).unwrap();
    write(dataset_path, serialized).expect("Failed to write to file");

    let questions_path: PathBuf = ["../src", "assets", "questions.json"].iter().collect();

    let questions_json =
        std::fs::read_to_string(&questions_path).expect("Failed to read questions file");

    let questions: Arc<Vec<serde_json::Value>> =
        Arc::new(serde_json::from_str(&questions_json).unwrap());

    let new_questions: Vec<serde_json::Value> = serde_json::from_str(&questions_to_add).unwrap();

    let mut updated_questions = questions.iter().cloned().collect::<Vec<_>>();
    updated_questions.extend(new_questions);

    let updated_questions_str = serde_json::to_string_pretty(&updated_questions).unwrap();
    write(&questions_path, updated_questions_str).expect("Failed to write questions to file");

    Ok(())
}

fn main() {
    let mut file_path = env::current_dir().expect("Failed to get current directory");
    file_path.push("dataset/data.json"); // Relative path to the file

    DATASET_PATH.set(file_path.display().to_string()).unwrap();

    let mut file = File::open(&file_path).expect("Failed to open file.");
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .expect("Failed to read file.");

    let dataset: DataElem = serde_json::from_str(&contents).expect("Failed to parse JSON");
    let game_dataset = Mutex::new(dataset.clone());

    println!("Loaded dataset!");

    tauri::Builder::default()
        .manage(game_dataset)
        .manage(dataset)
        .invoke_handler(tauri::generate_handler![
            guess,
            choose_question,
            reset_data,
            save_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}