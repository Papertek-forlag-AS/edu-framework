/**
 * Chapter 2 — Exercises: Family and Numbers
 * @see schemas/exercise.schema.json
 */
export const exercisesData = {
  "2-1": {
    exercises: [
      {
        id: "aufgabeA",
        type: "matching",
        title: "Oppgave A: Familiemedlemmer",
        badges: [{ text: "Vokabular" }],
        description: "Match de tyske familieordene med den norske oversettelsen.",
        isIconGame: false,
        variableName: "family-match-2-1",
        pairs: [
          { id: 1, q: "der Vater", a: "faren" },
          { id: 2, q: "die Mutter", a: "moren" },
          { id: 3, q: "der Bruder", a: "broren" },
          { id: 4, q: "die Schwester", a: "søsteren" },
          { id: 5, q: "die Geschwister", a: "søsknene" }
        ]
      },
      {
        id: "aufgabeB",
        type: "fill-in",
        title: "Oppgave B: Mein oder meine?",
        badges: [{ text: "Grammatikk" }],
        description: "Fyll inn riktig possessivpronomen (mein/meine).",
        items: [
          { pre: "1. Das ist", answer: "mein", post: "Vater.", width: "w-24" },
          { pre: "2. Das ist", answer: "meine", post: "Mutter.", width: "w-24" },
          { pre: "3. Das ist", answer: "mein", post: "Bruder.", width: "w-24" },
          { pre: "4. Das ist", answer: "meine", post: "Schwester.", width: "w-24" }
        ]
      },
      {
        id: "aufgabeC",
        type: "true-false",
        title: "Oppgave C: Familiedialogen",
        badges: [],
        description: "Les dialogene fra leksjonen og avgjør om påstandene er riktige.",
        variableName: "tf-family-2-1",
        statements: [
          { q: "Annas Vater heißt Thomas.", a: true },
          { q: "Annas Mutter heißt Lisa.", a: false },
          { q: "Anna hat einen Bruder.", a: true },
          { q: "Max hat einen Bruder.", a: false },
          { q: "Annas Bruder heißt Paul.", a: true }
        ]
      },
      {
        id: "aufgabeD",
        type: "drag-drop",
        title: "Oppgave D: Setningsbygging",
        badges: [],
        description: "Sett ordene i riktig rekkefølge.",
        sentences: [
          { q: "Det er faren min.", words: ["Das", "ist", "mein", "Vater"], svar: "Das ist mein Vater", punctuation: "." },
          { q: "Har du søsken?", words: ["Hast", "du", "Geschwister"], svar: "Hast du Geschwister", punctuation: "?" },
          { q: "Jeg har en søster.", words: ["Ich", "habe", "eine", "Schwester"], svar: "Ich habe eine Schwester", punctuation: "." }
        ]
      },
      {
        id: "aufgabeE",
        type: "quiz",
        title: "Oppgave E: Velg riktig",
        badges: [],
        description: "Velg det riktige alternativet.",
        questions: [
          {
            question: "Hva betyr 'die Geschwister'?",
            options: ["Foreldrene", "Besteforeldrene", "Søsknene", "Barna"],
            correctIndex: 2
          },
          {
            question: "Hvilket possessivpronomen bruker vi med 'Mutter' (hunkjønn)?",
            options: ["mein", "meine", "meinen", "meinem"],
            correctIndex: 1
          }
        ]
      },
      {
        id: "aufgabeF",
        type: "writing",
        title: "Oppgave F: Min familie",
        badges: [{ text: "Skriving" }],
        description: "Skriv om familien din på tysk. Bruk mønsteret fra dialogen.",
        template: ["Das ist meine Familie.", "Mein Vater heißt...", "Meine Mutter heißt...", "Ich habe..."],
        placeholder: "Das ist meine Familie..."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-2-1",
        type: "interactive-flashcards",
        title: "Ekstraøvelse 1: Familieord",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 2.1" }],
        description: "Øv på familieordene med flashkort.",
        cards: [
          { front: "der Vater", back: "faren" },
          { front: "die Mutter", back: "moren" },
          { front: "der Bruder", back: "broren" },
          { front: "die Schwester", back: "søsteren" },
          { front: "die Eltern", back: "foreldrene" },
          { front: "die Großmutter", back: "bestemoren" },
          { front: "der Großvater", back: "bestefaren" }
        ]
      },
      {
        id: "ekstraovelse-2-2-1",
        type: "fill-in",
        title: "Ekstraøvelse 2: Dein oder deine?",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 2.1" }],
        description: "Fyll inn riktig possessivpronomen (dein/deine).",
        items: [
          { pre: "1. Ist das", answer: "dein", post: "Bruder?", width: "w-24" },
          { pre: "2. Ist das", answer: "deine", post: "Schwester?", width: "w-24" },
          { pre: "3. Wie heißt", answer: "dein", post: "Vater?", width: "w-24" },
          { pre: "4. Wie heißt", answer: "deine", post: "Mutter?", width: "w-24" }
        ]
      }
    ]
  },
  "2-2": {
    exercises: [
      {
        id: "aufgabeA",
        type: "matching",
        title: "Oppgave A: Tallene 1-10",
        badges: [{ text: "Vokabular" }],
        description: "Match tallene med riktig skrivemåte.",
        isIconGame: false,
        variableName: "numbers-match-2-2",
        pairs: [
          { id: 1, q: "1", a: "eins" },
          { id: 2, q: "3", a: "drei" },
          { id: 3, q: "5", a: "fünf" },
          { id: 4, q: "7", a: "sieben" },
          { id: 5, q: "10", a: "zehn" }
        ]
      },
      {
        id: "aufgabeB",
        type: "fill-in",
        title: "Oppgave B: Tall og alder",
        badges: [],
        description: "Fyll inn riktig tall på tysk.",
        items: [
          { pre: "1. Ich bin", answer: "sechzehn", post: "Jahre alt. (16)", width: "w-32" },
          { pre: "2. Mein Bruder ist", answer: "zwölf", post: ". (12)", width: "w-28" },
          { pre: "3. Meine Schwester ist", answer: "vierzehn", post: ". (14)", width: "w-32" },
          { pre: "4. Mein Vater ist", answer: "zwanzig", post: ". (20)", width: "w-32" }
        ]
      },
      {
        id: "aufgabeC",
        type: "number-grids",
        title: "Oppgave C: Tallrutenett",
        badges: [{ text: "Interaktiv" }],
        description: "Klikk på riktig tall når du hører eller leser det tyske ordet.",
        gridSize: 4,
        numbers: [
          { display: "1", value: 1 },
          { display: "2", value: 2 },
          { display: "3", value: 3 },
          { display: "4", value: 4 },
          { display: "5", value: 5 },
          { display: "6", value: 6 },
          { display: "7", value: 7 },
          { display: "8", value: 8 },
          { display: "9", value: 9 },
          { display: "10", value: 10 },
          { display: "11", value: 11 },
          { display: "12", value: 12 },
          { display: "13", value: 13 },
          { display: "14", value: 14 },
          { display: "15", value: 15 },
          { display: "16", value: 16 }
        ],
        questions: [
          { word: "drei", answer: 3 },
          { word: "sieben", answer: 7 },
          { word: "elf", answer: 11 },
          { word: "fünfzehn", answer: 15 },
          { word: "sechzehn", answer: 16 }
        ]
      },
      {
        id: "aufgabeD",
        type: "drag-drop",
        title: "Oppgave D: Spør om alder",
        badges: [],
        description: "Sett ordene i riktig rekkefølge.",
        sentences: [
          { q: "Hvor gammel er du?", words: ["Wie", "alt", "bist", "du"], svar: "Wie alt bist du", punctuation: "?" },
          { q: "Jeg er seksten år.", words: ["Ich", "bin", "sechzehn", "Jahre", "alt"], svar: "Ich bin sechzehn Jahre alt", punctuation: "." }
        ]
      },
      {
        id: "aufgabeE",
        type: "quiz",
        title: "Oppgave E: Tallquiz",
        badges: [],
        description: "Velg riktig svar.",
        questions: [
          {
            question: "Hva er 'dreizehn' på norsk?",
            options: ["Tre", "Tretten", "Tredve", "Tolv"],
            correctIndex: 1
          },
          {
            question: "Hvordan sier man 17 på tysk?",
            options: ["sechzehn", "siebzehn", "achtzehn", "fünfzehn"],
            correctIndex: 1
          }
        ]
      },
      {
        id: "aufgabeF",
        type: "writing",
        title: "Oppgave F: Alder i familien",
        badges: [{ text: "Skriving" }],
        description: "Skriv alderen til familiemedlemmene dine på tysk.",
        template: ["Ich bin ... Jahre alt.", "Mein Vater ist ... Jahre alt.", "Meine Mutter ist ... Jahre alt."],
        placeholder: "Ich bin ... Jahre alt."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-2-2",
        type: "matching",
        title: "Ekstraøvelse 1: Tallene 11-20",
        badges: [{ type: "review", text: "Repetisjon" }, { text: "Leksjon 2.2" }],
        description: "Match tallene 11-20.",
        isIconGame: false,
        variableName: "numbers-11-20-2-2",
        pairs: [
          { id: 1, q: "11", a: "elf" },
          { id: 2, q: "13", a: "dreizehn" },
          { id: 3, q: "15", a: "fünfzehn" },
          { id: 4, q: "17", a: "siebzehn" },
          { id: 5, q: "19", a: "neunzehn" },
          { id: 6, q: "20", a: "zwanzig" }
        ]
      },
      {
        id: "ekstraovelse-2-2-2",
        type: "fill-in",
        title: "Ekstraøvelse 2: Regnestykker",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 2.2" }],
        description: "Skriv svaret på regnestykket med tysk tall.",
        items: [
          { pre: "1. drei + vier =", answer: "sieben", post: "", width: "w-28" },
          { pre: "2. fünf + fünf =", answer: "zehn", post: "", width: "w-28" },
          { pre: "3. acht + sechs =", answer: "vierzehn", post: "", width: "w-32" },
          { pre: "4. neun + elf =", answer: "zwanzig", post: "", width: "w-32" }
        ]
      }
    ]
  }
};
