/**
 * Chapter 2 — Grammar: Possessivpronomen & Zahlen
 * @see schemas/grammar.schema.json
 */
export const grammarModules = {
  "2": [
    { type: "tittel", tekst: "Possessivpronomen: mein/dein", nivå: 2 },

    {
      type: "forklaring",
      tekst: "Possessivpronomen viser hvem noe tilhører. <strong>Mein</strong> betyr «min» og <strong>dein</strong> betyr «din». Endelsen avhenger av substantivets kjønn."
    },

    {
      type: "regel-tabell",
      overskrifter: ["Kjønn", "mein", "dein", "Eksempel"],
      rader: [
        ["Maskulin (der)", "<strong>mein</strong>", "<strong>dein</strong>", "mein Vater"],
        ["Feminin (die)", "<strong>meine</strong>", "<strong>deine</strong>", "meine Mutter"],
        ["Nøytrum (das)", "<strong>mein</strong>", "<strong>dein</strong>", "mein Kind"],
        ["Flertall (die)", "<strong>meine</strong>", "<strong>deine</strong>", "meine Eltern"]
      ]
    },

    {
      type: "eksempel",
      tittel: "Eksempler med mein/dein",
      setninger: [
        { tysk: "Das ist <strong>mein</strong> Bruder.", norsk: "Det er broren min." },
        { tysk: "Das ist <strong>meine</strong> Schwester.", norsk: "Det er søsteren min." },
        { tysk: "Wie heißt <strong>dein</strong> Vater?", norsk: "Hva heter faren din?" },
        { tysk: "Ist das <strong>deine</strong> Mutter?", norsk: "Er det moren din?" }
      ]
    },

    {
      type: "infoboks",
      boksType: "husk",
      tittel: "Husk!",
      innhold: "Regelen er enkel: <strong>mein/dein</strong> for maskulin og nøytrum, <strong>meine/deine</strong> for feminin og flertall. Det er samme mønster som artikkelendelsene!"
    },

    { type: "tittel", tekst: "Tallene 1-20", nivå: 3 },

    {
      type: "forklaring",
      tekst: "De tyske tallene 1-12 er unike ord du må lære utenat. Tallene 13-19 er bygget opp av <strong>enertall + zehn</strong> (f.eks. drei + zehn = dreizehn). 20 er <strong>zwanzig</strong>."
    },

    {
      type: "regel-tabell",
      overskrifter: ["Tall", "Tysk", "Tall", "Tysk"],
      rader: [
        ["1", "eins", "11", "elf"],
        ["2", "zwei", "12", "zwölf"],
        ["3", "drei", "13", "dreizehn"],
        ["4", "vier", "14", "vierzehn"],
        ["5", "fünf", "15", "fünfzehn"],
        ["6", "sechs", "16", "<strong>sechzehn</strong>"],
        ["7", "sieben", "17", "<strong>siebzehn</strong>"],
        ["8", "acht", "18", "achtzehn"],
        ["9", "neun", "19", "neunzehn"],
        ["10", "zehn", "20", "zwanzig"]
      ]
    },

    {
      type: "infoboks",
      boksType: "tips",
      tittel: "Tips",
      innhold: "Legg merke til at <strong>sechzehn</strong> mister s-en i sechs, og <strong>siebzehn</strong> mister en-endelsen i sieben. Det er de to unntakene!"
    },

    {
      type: "eksempel",
      tittel: "Snakke om alder",
      setninger: [
        { tysk: "Wie alt <strong>bist</strong> du?", norsk: "Hvor gammel er du?" },
        { tysk: "Ich <strong>bin</strong> sechzehn Jahre alt.", norsk: "Jeg er seksten år gammel." },
        { tysk: "Mein Bruder <strong>ist</strong> zwölf.", norsk: "Broren min er tolv." }
      ]
    }
  ]
};
