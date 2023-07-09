#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs::File;
use std::io::Read;
use std::sync::Mutex;

use rand::prelude::SliceRandom;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri::*;

static mut ALREADY_ASKED: Vec<i32> = Vec::new();

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

fn main() {
    let mut file_path = env::current_dir().expect("Failed to get current directory");
    file_path.push("dataset/data.json"); // Relative path to the file

    let mut file = File::open(file_path).expect("Failed to open file.");
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .expect("Failed to read file.");

    let dataset: DataElem = serde_json::from_str(&contents).expect("Failed to parse JSON");
    let game_dataset = Mutex::new(dataset.clone());

    println!("Loaded dataset!");

    tauri::Builder::default()
        .manage(game_dataset)
        .manage(dataset)
        .invoke_handler(tauri::generate_handler![guess, choose_question, reset_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
