/**
 * Minimal example exercises — demonstrates the Papertek exercise data format.
 *
 * This file shows the minimum viable structure for each common exercise type.
 * AI agents should read this alongside schemas/exercise.schema.json to understand
 * how to generate exercise content.
 *
 * Key conventions:
 *   - Export name: exercisesData
 *   - Keys: "{chapter}-{lesson}" (e.g., "1-1", "1-2")
 *   - Each lesson has exercises[] and optional extraExercises[]
 *   - Exercise IDs must be unique within a lesson
 */

export const exercisesData = {
  "1-1": {
    exercises: [
      {
        id: "aufgabeA",
        type: "fill-in",
        title: "Exercise A: Fill in the blanks",
        badges: [{ text: "📝 Grammar" }],
        description: "Complete the sentences with the correct word.",
        items: [
          { pre: "1. Hello, my name", answer: "is", post: "Maria.", width: "w-20" },
          { pre: "2. I", answer: "am", post: "a student.", width: "w-20" },
          { pre: "3. We", answer: "are", post: "learning.", width: "w-20" }
        ]
      },
      {
        id: "aufgabeB",
        type: "matching",
        title: "Exercise B: Match the pairs",
        badges: [],
        description: "Click items on the left to match with items on the right.",
        pairs: [
          { id: 1, q: "Hello", a: "Goodbye" },
          { id: 2, q: "Yes", a: "No" },
          { id: 3, q: "Good", a: "Bad" }
        ]
      },
      {
        id: "aufgabeC",
        type: "true-false",
        title: "Exercise C: True or false?",
        badges: [],
        description: "Decide whether each statement is true or false.",
        statements: [
          { q: "The sky is blue.", a: true },
          { q: "Water is dry.", a: false },
          { q: "Fish can swim.", a: true }
        ]
      },
      {
        id: "aufgabeD",
        type: "quiz",
        title: "Exercise D: Multiple choice",
        badges: [],
        description: "Choose the correct answer.",
        questions: [
          { question: "What color is grass?", options: ["Red", "Green", "Blue"], correctIndex: 1 },
          { question: "How many days in a week?", options: ["5", "6", "7"], correctIndex: 2 }
        ]
      },
      {
        id: "aufgabeE",
        type: "drag-drop",
        title: "Exercise E: Build sentences",
        badges: [],
        description: "Click the words in the correct order to build the sentence.",
        sentences: [
          { q: "I am a student.", words: ["I", "am", "a", "student"], punctuation: "." },
          { q: "She reads books.", words: ["She", "reads", "books"], punctuation: "." }
        ]
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-1-1",
        type: "writing",
        title: "Extra Exercise 1: Write about yourself",
        badges: [{ type: "strengthening", text: "💪 Practice" }],
        description: "Write 3-4 sentences introducing yourself.",
        placeholder: "My name is..."
      }
    ]
  }
};
