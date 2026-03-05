/**
 * Chapter 1 — Exercises: Celler og celledeling
 * Content based on NDLA article 6454 (CC-BY-SA-4.0)
 * @see schemas/exercise.schema.json
 */
export const exercisesData = {
  "1-1": {
    exercises: [
      {
        id: "oppgaveA",
        type: "matching",
        title: "Oppgave A: Cellestrukturer",
        badges: [{ text: "Cellebiologi" }],
        description: "Koble hver cellestruktur med riktig funksjon.",
        isIconGame: false,
        variableName: "cell-parts-1-1",
        pairs: [
          { id: 1, q: "Cellekjernen", a: "Inneholder arvestoffet (DNA)" },
          { id: 2, q: "Mitokondrier", a: "Produserer energi for cella" },
          { id: 3, q: "Ribosomer", a: "Bygger proteiner" },
          { id: 4, q: "Cytoplasma", a: "Geléaktig væske inne i cella" },
          { id: 5, q: "Cellemembranen", a: "Beskytter cella og styrer transport" }
        ]
      },
      {
        id: "oppgaveB",
        type: "true-false",
        title: "Oppgave B: Riktig eller galt om celledeling?",
        badges: [],
        description: "Avgjør om påstandene stemmer.",
        variableName: "tf-cells-1-1",
        statements: [
          { q: "Alle levende organismer er bygd opp av celler.", a: true },
          { q: "Når en organisme vokser, er det fordi cellene bare blir større.", a: false },
          { q: "Ved mitose dannes to identiske datterceller.", a: true },
          { q: "Dattercellene har ulikt arvestoff etter mitose.", a: false },
          { q: "Morcella deler mitokondrier og ribosomer mellom dattercellene.", a: true }
        ]
      },
      {
        id: "oppgaveC",
        type: "fill-in",
        title: "Oppgave C: Fyll inn riktig begrep",
        badges: [],
        description: "Fyll inn det manglende begrepet.",
        items: [
          { pre: "1. Vanlig celledeling kalles", answer: "mitose", post: ".", width: "w-28" },
          { pre: "2. Den opprinnelige cella kalles", answer: "morcelle", post: ".", width: "w-28" },
          { pre: "3. De to nye cellene kalles", answer: "datterceller", post: ".", width: "w-32" },
          { pre: "4. Arvestoffet er organisert i", answer: "kromosomer", post: ".", width: "w-32" }
        ]
      },
      {
        id: "oppgaveD",
        type: "categorize",
        title: "Oppgave D: Vekstfase eller delingsfase?",
        badges: [{ text: "Sortering" }],
        description: "Plasser hendelsene i riktig fase av cellesyklusen.",
        categories: [
          { label: "Vekstfasen", items: ["Cella vokser til normal størrelse", "Produserer flere mitokondrier", "Utfører spesialiserte oppgaver"] },
          { label: "Delingsfasen", items: ["Arvestoffet kopieres", "Kromosomene fordeles", "Cella avsnøres på midten"] }
        ]
      },
      {
        id: "oppgaveE",
        type: "quiz",
        title: "Oppgave E: Velg riktig svar",
        badges: [],
        description: "Velg det riktige alternativet.",
        questions: [
          {
            question: "Hva skjer under mitose?",
            options: ["Cella dør", "Cella deler seg i to like deler", "Cella krymper", "Cella slutter å vokse"],
            correctIndex: 1
          },
          {
            question: "Hva må skje med arvestoffet før cella kan dele seg?",
            options: ["Det må fjernes", "Det må kopieres", "Det må halveres", "Det må flyttes ut av kjernen"],
            correctIndex: 1
          },
          {
            question: "Mennesker har normalt hvor mange kromosomer?",
            options: ["23", "46", "92", "12"],
            correctIndex: 1
          }
        ]
      },
      {
        id: "oppgaveF",
        type: "interactive-flashcards",
        title: "Oppgave F: Viktige begreper",
        badges: [{ text: "Begreper" }],
        description: "Øv på de viktigste begrepene om celler og celledeling.",
        cards: [
          { front: "Mitose", back: "Vanlig celledeling — gir to identiske datterceller" },
          { front: "Morcelle", back: "Den opprinnelige cella som deler seg" },
          { front: "Datterceller", back: "De to nye cellene etter celledeling" },
          { front: "Kromosomer", back: "Trådformede biter av arvestoff i cellekjernen" },
          { front: "Vekstfase", back: "Perioden der cella vokser og utfører oppgaver" },
          { front: "Delingsfase", back: "Perioden der arvestoffet kopieres og cella deler seg" }
        ]
      },
      {
        id: "oppgaveG",
        type: "writing",
        title: "Oppgave G: Forklar celledeling",
        badges: [{ text: "Skriving" }],
        description: "Forklar med egne ord hva som skjer når en celle deler seg.",
        template: [
          "Celledeling er viktig fordi...",
          "Først må cella...",
          "Deretter..."
        ],
        placeholder: "Celledeling er viktig fordi..."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-1-1",
        type: "chronology",
        title: "Ekstraøvelse 1: Cellesyklusen i rekkefølge",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.1" }],
        description: "Sett stegene i cellesyklusen i riktig rekkefølge.",
        items: [
          "Cella vokser til normal størrelse",
          "Cella produserer flere mitokondrier og ribosomer",
          "Arvestoffet (DNA) kopieres",
          "Kromosomene fordeles til hver side av cella",
          "Cella avsnøres på midten",
          "To nye datterceller oppstår"
        ]
      },
      {
        id: "ekstraovelse-2-1-1",
        type: "matching",
        title: "Ekstraøvelse 2: Celletyper og funksjoner",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.1" }],
        description: "Koble celletypen med funksjonen.",
        isIconGame: false,
        variableName: "cell-types-1-1",
        pairs: [
          { id: 1, q: "Betaceller", a: "Produserer insulin" },
          { id: 2, q: "Tarmceller", a: "Produserer fordøyelsesenzymer" },
          { id: 3, q: "Hudceller", a: "Utvikler pigment" },
          { id: 4, q: "Gjærceller", a: "Encellede organismer som deler seg" }
        ]
      }
    ]
  },
  "1-2": {
    exercises: [
      {
        id: "oppgaveA",
        type: "matching",
        title: "Oppgave A: Meiose og arvestoff",
        badges: [{ text: "Genetikk" }],
        description: "Koble begrepene med riktig forklaring.",
        isIconGame: false,
        variableName: "meiosis-match-1-2",
        pairs: [
          { id: 1, q: "Meiose", a: "Celledeling som gir kjønnsceller" },
          { id: 2, q: "Kromosomer", a: "Trådformede biter av arvestoff" },
          { id: 3, q: "Gener", a: "Oppskrifter på proteiner i arvestoffet" },
          { id: 4, q: "Kjønnsceller", a: "Egg- og sædceller med 23 kromosomer" },
          { id: 5, q: "Befruktning", a: "Egg- og sædcelle smelter sammen" }
        ]
      },
      {
        id: "oppgaveB",
        type: "true-false",
        title: "Oppgave B: Riktig eller galt om meiose?",
        badges: [],
        description: "Avgjør om påstandene stemmer.",
        variableName: "tf-meiosis-1-2",
        statements: [
          { q: "Kjønnsceller har 23 kromosomer.", a: true },
          { q: "Meiose gir to identiske celler, akkurat som mitose.", a: false },
          { q: "Ved befruktning får den nye cella 46 kromosomer.", a: true },
          { q: "Alle celler i kroppen har samme arvestoff.", a: true },
          { q: "Genene bestemmer hvilke proteiner en celle lager.", a: true }
        ]
      },
      {
        id: "oppgaveC",
        type: "fill-in",
        title: "Oppgave C: Tall i genetikken",
        badges: [],
        description: "Fyll inn riktig tall eller begrep.",
        items: [
          { pre: "1. Menneskets kroppsceller har", answer: "46", post: "kromosomer.", width: "w-16" },
          { pre: "2. Kjønnsceller (egg/sæd) har", answer: "23", post: "kromosomer.", width: "w-16" },
          { pre: "3. Produksjon av kjønnsceller kalles", answer: "meiose", post: ".", width: "w-28" },
          { pre: "4. En oppskrift på et protein kalles et", answer: "gen", post: ".", width: "w-20" }
        ]
      },
      {
        id: "oppgaveD",
        type: "categorize",
        title: "Oppgave D: Mitose eller meiose?",
        badges: [{ text: "Sortering" }],
        description: "Plasser kjennetegnene i riktig kategori.",
        categories: [
          { label: "Mitose", items: ["Gir to identiske celler", "46 kromosomer i dattercellene", "Vanlig celledeling"] },
          { label: "Meiose", items: ["Gir kjønnsceller", "23 kromosomer i dattercellene", "Foregår i eggstokker og testikler"] }
        ]
      },
      {
        id: "oppgaveE",
        type: "quiz",
        title: "Oppgave E: Velg riktig svar",
        badges: [],
        description: "Velg det riktige alternativet.",
        questions: [
          {
            question: "Hva er forskjellen mellom mitose og meiose?",
            options: [
              "Mitose gir fire celler, meiose gir to",
              "Mitose gir identiske celler, meiose gir kjønnsceller med halvt kromosomtall",
              "Det er ingen forskjell",
              "Meiose skjer bare hos planter"
            ],
            correctIndex: 1
          },
          {
            question: "Hva styrer alt som skjer i en celle?",
            options: ["Cellemembranen", "Mitokondrier", "Arvestoffet (DNA)", "Ribosomene"],
            correctIndex: 2
          }
        ]
      },
      {
        id: "oppgaveF",
        type: "writing",
        title: "Oppgave F: Sammenlign mitose og meiose",
        badges: [{ text: "Skriving" }],
        description: "Forklar likheter og forskjeller mellom mitose og meiose.",
        template: [
          "Mitose og meiose er begge former for celledeling, men...",
          "I mitose...",
          "I meiose..."
        ],
        placeholder: "Mitose og meiose er begge former for celledeling, men..."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-1-2",
        type: "interactive-flashcards",
        title: "Ekstraøvelse 1: Genetikk-begreper",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 1.2" }],
        description: "Øv på begreper om arvestoff og genetikk.",
        cards: [
          { front: "DNA", back: "Arvestoffet som finnes i cellekjernen" },
          { front: "Gen", back: "En oppskrift på et protein — en bit av en kromosomtråd" },
          { front: "Kromosom", back: "Trådformet struktur av arvestoff — mennesker har 46" },
          { front: "Meiose", back: "Celledeling som halverer kromosomtallet — gir kjønnsceller" },
          { front: "Befruktning", back: "Egg og sædcelle smelter sammen — gir 46 kromosomer igjen" }
        ]
      }
    ]
  }
};
