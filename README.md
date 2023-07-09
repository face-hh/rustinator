# Rustinator
[Akinator](https://akinator.com/) clone written in [Rust](https://www.rust-lang.org/) + [Tauri](https://tauri.app/) in 2 days

![Example of the program running on Windows](https://github.com/face-hh/feddit/assets/69168154/0849985c-a4f0-43e1-b41f-05fcaaf810bf)


## Algorithm
#### Short
The algorithm uses a series of randomly chosen questions and user responses to iteratively eliminate incorrect options, narrowing down to the correct result based on the remaining possibilities.
#### Long
The current algorithm works by randomly selecting a question and asking the user for a response. Based on the user's answer, the algorithm eliminates all options that have a conflicting answer for that question. The next questions will be randomly chosen from one of the current game state (Array) in order to avoid repeating questions. By iteratively asking questions the described way and eliminating options, the algorithm narrows down to the correct result, assuming the user answers the questions correctly.

## Dataset
The current major issue is the fact that the [dataset](https://github.com/face-hh/rustinator/tree/main/dataset/data.json) is very small.

- Pull requests are VERY appreciated in order to increase the dataset!
  - To do that, choose a personality that is not inside the dataset already.
  - Create an object inside `data.json` with the `name` set to the personality.
  - Navigate over to `src/assets/questions.json` and add your desired questions.
  - Back to `data.json`, add a field called `questions` which will be `[]` (Array).
  - Include the question ID inside the `[]`, example: `questions: [34]`

## What's the point?
Content.
