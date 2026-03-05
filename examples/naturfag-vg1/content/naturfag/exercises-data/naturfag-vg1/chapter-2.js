/**
 * Chapter 2 — Exercises: Fotosyntese og energi
 * Content based on NDLA articles 9806, 38328 (CC-BY-SA-4.0)
 * @see schemas/exercise.schema.json
 */
export const exercisesData = {
  "2-1": {
    exercises: [
      {
        id: "oppgaveA",
        type: "matching",
        title: "Oppgave A: Fotosyntesens begreper",
        badges: [{ text: "Fotosyntese" }],
        description: "Koble hvert begrep med riktig forklaring.",
        isIconGame: false,
        variableName: "photo-match-2-1",
        pairs: [
          { id: 1, q: "Fotosyntese", a: "Omdanner lysenergi til kjemisk energi" },
          { id: 2, q: "Klorofyll", a: "Grønt fargestoff som fanger sollys" },
          { id: 3, q: "Kloroplaster", a: "Organeller der fotosyntesen skjer" },
          { id: 4, q: "Produsenter", a: "Organismer som lager sukker (planter og alger)" },
          { id: 5, q: "Kompensasjonspunktet", a: "Der O₂-forbruk = O₂-produksjon" }
        ]
      },
      {
        id: "oppgaveB",
        type: "true-false",
        title: "Oppgave B: Riktig eller galt om fotosyntesen?",
        badges: [],
        description: "Avgjør om påstandene stemmer.",
        variableName: "tf-photo-2-1",
        statements: [
          { q: "Fotosyntesen er den viktigste livsprosessen på jorda.", a: true },
          { q: "Alle organismer kan utføre fotosyntese.", a: false },
          { q: "Fotosyntesen produserer oksygen.", a: true },
          { q: "Planter bruker sukker bare som energikilde.", a: false },
          { q: "Cellulose i trestammer er bygget av sukker fra fotosyntesen.", a: true }
        ]
      },
      {
        id: "oppgaveC",
        type: "fill-in",
        title: "Oppgave C: Fotosyntesens likning",
        badges: [{ text: "Kjemi" }],
        description: "Fyll inn det som mangler i fotosyntesens likning.",
        items: [
          { pre: "1. Fotosyntesen trenger karbondioksid, vann og", answer: "lys", post: ".", width: "w-20" },
          { pre: "2. Fotosyntesen produserer sukker og", answer: "oksygen", post: ".", width: "w-28" },
          { pre: "3. Det grønne fargestoffet i plantene heter", answer: "klorofyll", post: ".", width: "w-28" },
          { pre: "4. Vi kaller planter og alger for", answer: "produsenter", post: ".", width: "w-32" }
        ]
      },
      {
        id: "oppgaveD",
        type: "categorize",
        title: "Oppgave D: Hva trengs og hva produseres?",
        badges: [{ text: "Sortering" }],
        description: "Sorter stoffene: hva bruker fotosyntesen, og hva produserer den?",
        categories: [
          { label: "Brukes i fotosyntesen", items: ["Karbondioksid (CO₂)", "Vann (H₂O)", "Lysenergi"] },
          { label: "Produseres av fotosyntesen", items: ["Sukker (glukose)", "Oksygen (O₂)"] }
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
            question: "Hva omdanner fotosyntesen?",
            options: ["Sukker til lys", "Lysenergi til kjemisk energi", "Oksygen til karbondioksid", "Varme til elektrisitet"],
            correctIndex: 1
          },
          {
            question: "Hvor foregår fotosyntesen i plantecella?",
            options: ["I mitokondrier", "I cellekjernen", "I kloroplastene", "I cellemembranen"],
            correctIndex: 2
          },
          {
            question: "Hvorfor er fotosyntesen viktig for dyr og mennesker?",
            options: [
              "Den lager varme",
              "Den produserer oksygen og mat",
              "Den renser jorda for giftstoffer",
              "Den lager vann"
            ],
            correctIndex: 1
          }
        ]
      },
      {
        id: "oppgaveF",
        type: "interactive-flashcards",
        title: "Oppgave F: Viktige begreper",
        badges: [{ text: "Begreper" }],
        description: "Øv på de viktigste begrepene om fotosyntesen.",
        cards: [
          { front: "Fotosyntese", back: "Prosess der planter omdanner lysenergi til sukker og oksygen" },
          { front: "Klorofyll", back: "Grønt fargestoff som fanger lysenergi — fungerer som solcellepanel" },
          { front: "Kloroplaster", back: "Organeller i planteceller der fotosyntesen foregår" },
          { front: "Produsenter", back: "Planter og alger — de eneste som kan lage sukker via fotosyntese" },
          { front: "Celleånding", back: "Prosessen der celler bruker oksygen for å frigjøre energi fra sukker" }
        ]
      },
      {
        id: "oppgaveG",
        type: "writing",
        title: "Oppgave G: Forklar fotosyntesen",
        badges: [{ text: "Skriving" }],
        description: "Forklar med egne ord hvorfor fotosyntesen er viktig for livet på jorda.",
        template: [
          "Fotosyntesen er viktig fordi...",
          "Planter bruker lysenergi til å...",
          "Uten fotosyntese ville..."
        ],
        placeholder: "Fotosyntesen er viktig fordi..."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-2-1",
        type: "chronology",
        title: "Ekstraøvelse 1: Fotosyntesens historie",
        badges: [{ type: "review", text: "Repetisjon" }, { text: "Leksjon 2.1" }],
        description: "Sett hendelsene i riktig historisk rekkefølge.",
        items: [
          "De første organismene med fotosyntese oppsto i havet",
          "Oksygen begynte å samle seg i atmosfæren",
          "Ozonlaget dannet seg og beskyttet mot UV-stråling",
          "Liv ble mulig på land",
          "Planter og dyr utviklet seg på landjorda"
        ]
      }
    ]
  },
  "2-2": {
    exercises: [
      {
        id: "oppgaveA",
        type: "matching",
        title: "Oppgave A: Energiformer",
        badges: [{ text: "Energi" }],
        description: "Koble hver energiform med riktig forklaring.",
        isIconGame: false,
        variableName: "energy-match-2-2",
        pairs: [
          { id: 1, q: "Kinetisk energi", a: "Energi fra bevegelse" },
          { id: 2, q: "Potensiell energi", a: "Lagret energi pga. posisjon" },
          { id: 3, q: "Kjemisk energi", a: "Energi lagret i kjemiske bindinger" },
          { id: 4, q: "Varmeenergi", a: "Energi fra molekylbevegelser" },
          { id: 5, q: "Strålingsenergi", a: "Energi som spres via lys" },
          { id: 6, q: "Elektrisk energi", a: "Energi fra ladninger i bevegelse" }
        ]
      },
      {
        id: "oppgaveB",
        type: "true-false",
        title: "Oppgave B: Riktig eller galt om energi?",
        badges: [],
        description: "Avgjør om påstandene stemmer.",
        variableName: "tf-energy-2-2",
        statements: [
          { q: "Energi kan verken oppstå eller forsvinne.", a: true },
          { q: "Energi kan bare finnes i én form om gangen.", a: false },
          { q: "En energikjede viser hvordan energi overføres.", a: true },
          { q: "Sola er den viktigste energikilden for jorda.", a: true },
          { q: "Når vi bruker energi, forsvinner den.", a: false }
        ]
      },
      {
        id: "oppgaveC",
        type: "fill-in",
        title: "Oppgave C: Fyll inn riktig begrep",
        badges: [],
        description: "Fyll inn det manglende energibegrepet.",
        items: [
          { pre: "1. Energi fra bevegelse kalles", answer: "kinetisk energi", post: ".", width: "w-36" },
          { pre: "2. Energi lagret i posisjonen kalles", answer: "potensiell energi", post: ".", width: "w-36" },
          { pre: "3. Energi kan ikke forsvinne, bare gå over i andre", answer: "former", post: ".", width: "w-24" },
          { pre: "4. En oversikt over energioverføringer kalles en", answer: "energikjede", post: ".", width: "w-32" }
        ]
      },
      {
        id: "oppgaveD",
        type: "categorize",
        title: "Oppgave D: Energikilder",
        badges: [{ text: "Sortering" }],
        description: "Sorter energikildene i riktig kategori.",
        categories: [
          { label: "Fornybare energikilder", items: ["Solenergi", "Vindenergi", "Vannkraft"] },
          { label: "Ikke-fornybare energikilder", items: ["Olje", "Kull", "Naturgass"] }
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
            question: "Hva er energibevaring?",
            options: [
              "Energi kan oppstå fra ingenting",
              "Energi kan verken oppstå eller forsvinne, bare endre form",
              "Energi forsvinner når vi bruker den",
              "Energi kan bare brukes én gang"
            ],
            correctIndex: 1
          },
          {
            question: "En ball som ligger på toppen av en bakke har mest...",
            options: ["Kinetisk energi", "Varmeenergi", "Potensiell energi", "Lydenergi"],
            correctIndex: 2
          },
          {
            question: "Hva skjer med energien når du ruller ballen ned bakken?",
            options: [
              "Den forsvinner",
              "Potensiell energi omdannes til kinetisk energi",
              "Kinetisk energi omdannes til potensiell energi",
              "Ingenting"
            ],
            correctIndex: 1
          }
        ]
      },
      {
        id: "oppgaveF",
        type: "interactive-flashcards",
        title: "Oppgave F: Energibegreper",
        badges: [{ text: "Begreper" }],
        description: "Øv på de viktigste energibegrepene.",
        cards: [
          { front: "Energi", back: "Det som får noe til å skje — kan ikke oppstå eller forsvinne" },
          { front: "Kinetisk energi", back: "Bevegelsesenergi — avhenger av fart og masse" },
          { front: "Potensiell energi", back: "Stillingsenergi — lagret energi pga. posisjon" },
          { front: "Kjemisk energi", back: "Energi lagret i kjemiske bindinger (mat, bensin, batteri)" },
          { front: "Energikjede", back: "Oversikt over hvordan energi overføres mellom gjenstander" },
          { front: "Energibevaring", back: "Energi kan ikke oppstå eller forsvinne, bare endre form" }
        ]
      },
      {
        id: "oppgaveG",
        type: "writing",
        title: "Oppgave G: Beskriv en energikjede",
        badges: [{ text: "Skriving" }],
        description: "Beskriv en energikjede fra hverdagen med egne ord.",
        template: [
          "Energikilden er...",
          "Energien overføres til...",
          "Til slutt ender energien som..."
        ],
        placeholder: "Energikilden er..."
      }
    ],
    extraExercises: [
      {
        id: "ekstraovelse-1-2-2",
        type: "matching",
        title: "Ekstraøvelse 1: Energiomdanninger",
        badges: [{ type: "strengthening", text: "Styrking" }, { text: "Leksjon 2.2" }],
        description: "Koble situasjonen med energiomdanningen.",
        isIconGame: false,
        variableName: "energy-transforms-2-2",
        pairs: [
          { id: 1, q: "Solcellepanel", a: "Strålingsenergi → elektrisk energi" },
          { id: 2, q: "Fyrstikk tenner", a: "Kjemisk energi → varmeenergi" },
          { id: 3, q: "Ball ruller ned bakke", a: "Potensiell energi → kinetisk energi" },
          { id: 4, q: "Lade mobiltelefon", a: "Elektrisk energi → kjemisk energi" }
        ]
      },
      {
        id: "ekstraovelse-2-2-2",
        type: "true-false",
        title: "Ekstraøvelse 2: Mer om energi",
        badges: [{ type: "review", text: "Repetisjon" }, { text: "Leksjon 2.2" }],
        description: "Test deg selv på flere påstander om energi.",
        variableName: "tf-energy-extra-2-2",
        statements: [
          { q: "Solenergi er en fornybar energikilde.", a: true },
          { q: "Olje er en fornybar energikilde.", a: false },
          { q: "Varme er en form for energi.", a: true },
          { q: "Lyd er ikke en form for energi.", a: false }
        ]
      }
    ]
  }
};
