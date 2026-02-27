/**
 * Chapter 1 — Exercises: Introduction to Variables
 * @see schemas/exercise.schema.json
 *
 * Demonstrates that exercise types work for non-language subjects.
 */
export const exercisesData = {
  "1-1": {
    exercises: [
      {
        id: "aufgabeA",
        type: "fill-in",
        title: "Oppgave A: Sett inn for x",
        badges: [{ text: "Variabler" }],
        description: "Regn ut verdien når x = 3.",
        items: [
          { pre: "1. x + 2 =", answer: "5", post: "", width: "w-16" },
          { pre: "2. x + 7 =", answer: "10", post: "", width: "w-16" },
          { pre: "3. 2x =", answer: "6", post: "", width: "w-16" },
          { pre: "4. x - 1 =", answer: "2", post: "", width: "w-16" }
        ]
      },
      {
        id: "aufgabeB",
        type: "quiz",
        title: "Oppgave B: Hva er en variabel?",
        badges: [],
        description: "Velg riktig svar.",
        questions: [
          {
            question: "Hva er en variabel?",
            options: [
              "Et spesielt tall",
              "En bokstav som representerer et tall",
              "Et regnetegn",
              "En brøk"
            ],
            correctIndex: 1
          },
          {
            question: "Hva betyr 3x?",
            options: ["x + 3", "x - 3", "3 · x", "x ÷ 3"],
            correctIndex: 2
          },
          {
            question: "Hvis a = 5, hva er 2a + 1?",
            options: ["6", "10", "11", "7"],
            correctIndex: 2
          }
        ]
      },
      {
        id: "aufgabeC",
        type: "true-false",
        title: "Oppgave C: Riktig eller galt?",
        badges: [],
        description: "Avgjør om påstandene er riktige.",
        variableName: "tf-variables-1-1",
        statements: [
          { q: "En variabel kan bare være bokstaven x.", a: false },
          { q: "Hvis x = 4, så er 2x = 8.", a: true },
          { q: "3x betyr x + 3.", a: false },
          { q: "Hvis a = 2 og b = 3, så er a + b = 5.", a: true }
        ]
      },
      {
        id: "aufgabeD",
        type: "fill-in",
        title: "Oppgave D: Sett inn for a og b",
        badges: [{ text: "Utfordring" }],
        description: "Regn ut når a = 2 og b = 5.",
        items: [
          { pre: "1. a + b =", answer: "7", post: "", width: "w-16" },
          { pre: "2. b - a =", answer: "3", post: "", width: "w-16" },
          { pre: "3. 2a + b =", answer: "9", post: "", width: "w-16" },
          { pre: "4. 3b - a =", answer: "13", post: "", width: "w-16" }
        ]
      },
      {
        id: "aufgabeE",
        type: "writing",
        title: "Oppgave E: Lag dine egne uttrykk",
        badges: [{ text: "Kreativ" }],
        description: "Lag tre uttrykk med variabelen x. Skriv uttrykket og verdien når x = 10.",
        template: ["Uttrykk 1: ... = ... (når x = 10)", "Uttrykk 2: ... = ...", "Uttrykk 3: ... = ..."],
        placeholder: "Eksempel: 2x + 1 = 21 (når x = 10)"
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-1-1",
        type: "fill-in",
        title: "Ekstraøvelse 1: Større tall",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.1" }],
        description: "Regn ut når x = 10.",
        items: [
          { pre: "1. x + 15 =", answer: "25", post: "", width: "w-16" },
          { pre: "2. 3x =", answer: "30", post: "", width: "w-16" },
          { pre: "3. 5x - 10 =", answer: "40", post: "", width: "w-16" },
          { pre: "4. 2x + 3 =", answer: "23", post: "", width: "w-16" }
        ]
      }
    ]
  },
  "1-2": {
    exercises: [
      {
        id: "aufgabeA",
        type: "fill-in",
        title: "Oppgave A: Løs likningene",
        badges: [{ text: "Likninger" }],
        description: "Finn verdien av x.",
        items: [
          { pre: "1. x + 3 = 7 → x =", answer: "4", post: "", width: "w-16" },
          { pre: "2. x + 5 = 12 → x =", answer: "7", post: "", width: "w-16" },
          { pre: "3. x + 10 = 15 → x =", answer: "5", post: "", width: "w-16" },
          { pre: "4. x + 1 = 9 → x =", answer: "8", post: "", width: "w-16" }
        ]
      },
      {
        id: "aufgabeB",
        type: "quiz",
        title: "Oppgave B: Likningsforståelse",
        badges: [],
        description: "Velg riktig svar.",
        questions: [
          {
            question: "Hva gjør vi for å løse x + 5 = 12?",
            options: [
              "Legge til 5 på begge sider",
              "Trekke fra 5 på begge sider",
              "Gange med 5 på begge sider",
              "Dele på 5 på begge sider"
            ],
            correctIndex: 1
          },
          {
            question: "x + 8 = 20. Hva er x?",
            options: ["28", "8", "12", "10"],
            correctIndex: 2
          }
        ]
      },
      {
        id: "aufgabeC",
        type: "drag-drop",
        title: "Oppgave C: Sorter løsningsstegene",
        badges: [{ text: "Problemløsning" }],
        description: "Sett stegene i riktig rekkefølge for å løse x + 6 = 10.",
        sentences: [
          {
            q: "Steg for å løse x + 6 = 10",
            words: ["Skriv likningen", "Trekk fra 6", "på begge sider", "x = 4"],
            svar: "Skriv likningen Trekk fra 6 på begge sider x = 4",
            punctuation: ""
          }
        ]
      },
      {
        id: "aufgabeD",
        type: "true-false",
        title: "Oppgave D: Sjekk løsningene",
        badges: [],
        description: "Er den oppgitte løsningen riktig?",
        variableName: "tf-equations-1-2",
        statements: [
          { q: "x + 3 = 10 → x = 7", a: true },
          { q: "x + 5 = 8 → x = 2", a: false },
          { q: "x + 4 = 4 → x = 0", a: true },
          { q: "x + 6 = 15 → x = 8", a: false }
        ]
      },
      {
        id: "aufgabeE",
        type: "fill-in",
        title: "Oppgave E: Subtraksjon",
        badges: [{ text: "Utfordring" }],
        description: "Løs likningene med subtraksjon: x - a = b.",
        items: [
          { pre: "1. x - 3 = 5 → x =", answer: "8", post: "", width: "w-16" },
          { pre: "2. x - 7 = 10 → x =", answer: "17", post: "", width: "w-16" },
          { pre: "3. x - 1 = 0 → x =", answer: "1", post: "", width: "w-16" },
          { pre: "4. x - 10 = 10 → x =", answer: "20", post: "", width: "w-16" }
        ]
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-1-2",
        type: "fill-in",
        title: "Ekstraøvelse 1: Blandede likninger",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.2" }],
        description: "Løs likningene.",
        items: [
          { pre: "1. x + 12 = 20 → x =", answer: "8", post: "", width: "w-16" },
          { pre: "2. x - 5 = 15 → x =", answer: "20", post: "", width: "w-16" },
          { pre: "3. x + 100 = 150 → x =", answer: "50", post: "", width: "w-16" },
          { pre: "4. x - 25 = 75 → x =", answer: "100", post: "", width: "w-16" }
        ]
      }
    ]
  }
};
