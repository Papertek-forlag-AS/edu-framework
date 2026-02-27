/**
 * Chapter 1 — Exercises: Greetings and Introductions
 * @see schemas/exercise.schema.json
 */
export const exercisesData = {
  "1-1": {
    exercises: [
      {
        id: "aufgabeA",
        type: "matching",
        title: "Oppgave A: Hilsener",
        badges: [{ text: "Vokabular" }],
        description: "Match de tyske hilsenene med den norske oversettelsen.",
        isIconGame: false,
        variableName: "greetings-match-1-1",
        pairs: [
          { id: 1, q: "Hallo", a: "Hei" },
          { id: 2, q: "Tschüss", a: "Ha det" },
          { id: 3, q: "Guten Morgen", a: "God morgen" },
          { id: 4, q: "Auf Wiedersehen", a: "På gjensyn" },
          { id: 5, q: "Wie heißt du?", a: "Hva heter du?" }
        ]
      },
      {
        id: "aufgabeB",
        type: "fill-in",
        title: "Oppgave B: Presentasjon",
        badges: [],
        description: "Fyll inn riktig ord.",
        items: [
          { pre: "1. Hallo! Ich", answer: "bin", post: "Anna.", width: "w-20" },
          { pre: "2. Wie", answer: "heißt", post: "du?", width: "w-24" },
          { pre: "3. Ich", answer: "heiße", post: "Max.", width: "w-24" },
          { pre: "4. Ich", answer: "komme", post: "aus Berlin.", width: "w-28" }
        ]
      },
      {
        id: "aufgabeC",
        type: "true-false",
        title: "Oppgave C: Riktig eller galt?",
        badges: [],
        description: "Les dialogene fra leksjonen og avgjør om påstandene er riktige.",
        variableName: "tf-dialog-1-1",
        statements: [
          { q: "Anna kommt aus Berlin.", a: false },
          { q: "Max kommt aus Berlin.", a: true },
          { q: "Anna heißt Max.", a: false },
          { q: "Max sagt 'Tschüss' zu Anna.", a: true }
        ]
      },
      {
        id: "aufgabeD",
        type: "drag-drop",
        title: "Oppgave D: Bygg setninger",
        badges: [],
        description: "Sett ordene i riktig rekkefølge.",
        sentences: [
          { q: "Jeg heter Anna.", words: ["Ich", "heiße", "Anna"], svar: "Ich heiße Anna", punctuation: "." },
          { q: "Jeg kommer fra Berlin.", words: ["Ich", "komme", "aus", "Berlin"], svar: "Ich komme aus Berlin", punctuation: "." },
          { q: "Hva heter du?", words: ["Wie", "heißt", "du"], svar: "Wie heißt du", punctuation: "?" }
        ]
      },
      {
        id: "aufgabeE",
        type: "quiz",
        title: "Oppgave E: Velg riktig svar",
        badges: [],
        description: "Velg det beste svaret.",
        questions: [
          {
            question: "Noen sier 'Hallo, wie heißt du?' — Hva svarer du?",
            options: ["Tschüss!", "Ich heiße Max.", "Guten Abend.", "Auf Wiedersehen."],
            correctIndex: 1
          },
          {
            question: "Hva betyr 'Woher kommst du?'?",
            options: ["Hvor bor du?", "Hvor gammel er du?", "Hvor kommer du fra?", "Hva heter du?"],
            correctIndex: 2
          }
        ]
      },
      {
        id: "aufgabeF",
        type: "writing",
        title: "Oppgave F: Skriv din egen presentasjon",
        badges: [{ text: "Skriving" }],
        description: "Skriv en kort presentasjon av deg selv på tysk. Bruk mønsteret fra dialogen.",
        template: ["Hallo! Ich bin/heiße...", "Ich komme aus...", "Tschüss!"],
        placeholder: "Hallo! Ich bin..."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-1-1",
        type: "matching",
        title: "Ekstraøvelse 1: Formelle og uformelle hilsener",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.1" }],
        description: "Match den formelle hilsenen med den uformelle.",
        isIconGame: false,
        variableName: "formal-informal-1-1",
        pairs: [
          { id: 1, q: "Guten Tag", a: "Hallo" },
          { id: 2, q: "Auf Wiedersehen", a: "Tschüss" },
          { id: 3, q: "Guten Morgen", a: "Morgen!" },
          { id: 4, q: "Wie heißen Sie?", a: "Wie heißt du?" }
        ]
      },
      {
        id: "ekstraovelse-2-1-1",
        type: "fill-in",
        title: "Ekstraøvelse 2: Komplett dialogen",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.1" }],
        description: "Fyll inn ordene som mangler i dialogen.",
        items: [
          { pre: "A: Hallo!", answer: "Ich", post: "bin Anna.", width: "w-20" },
          { pre: "B: Hallo! Ich bin", answer: "Max", post: ".", width: "w-20" },
          { pre: "A: Woher", answer: "kommst", post: "du?", width: "w-28" },
          { pre: "B: Ich komme", answer: "aus", post: "Berlin.", width: "w-20" }
        ]
      }
    ]
  }
};
