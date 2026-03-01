/**
 * Chapter 2 — Grammar: Possessivpronomen & Zahlen
 * @see schemas/grammar.schema.json
 */
export const grammarModules = {
  "2": [
    { type: "heading", text: "Possessivpronomen: mein/dein", level: 2 },

    {
      type: "explanation",
      text: "Possessivpronomen viser hvem noe tilhører. <strong>Mein</strong> betyr «min» og <strong>dein</strong> betyr «din». Endelsen avhenger av substantivets kjønn."
    },

    {
      type: "rule-table",
      headers: ["Kjønn", "mein", "dein", "Eksempel"],
      rows: [
        ["Maskulin (der)", "<strong>mein</strong>", "<strong>dein</strong>", "mein Vater"],
        ["Feminin (die)", "<strong>meine</strong>", "<strong>deine</strong>", "meine Mutter"],
        ["Nøytrum (das)", "<strong>mein</strong>", "<strong>dein</strong>", "mein Kind"],
        ["Flertall (die)", "<strong>meine</strong>", "<strong>deine</strong>", "meine Eltern"]
      ]
    },

    {
      type: "eksempel",
      title: "Eksempler med mein/dein",
      setninger: [
        { target: "Das ist <strong>mein</strong> Bruder.", native: "Det er broren min." },
        { target: "Das ist <strong>meine</strong> Schwester.", native: "Det er søsteren min." },
        { target: "Wie heißt <strong>dein</strong> Vater?", native: "Hva heter faren din?" },
        { target: "Ist das <strong>deine</strong> Mutter?", native: "Er det moren din?" }
      ]
    },

    {
      type: "info-box",
      boxType: "remember",
      title: "Husk!",
      content: "Regelen er enkel: <strong>mein/dein</strong> for maskulin og nøytrum, <strong>meine/deine</strong> for feminin og flertall. Det er samme mønster som artikkelendelsene!"
    },

    { type: "heading", text: "Tallene 1-20", level: 3 },

    {
      type: "explanation",
      text: "De tyske tallene 1-12 er unike ord du må lære utenat. Tallene 13-19 er bygget opp av <strong>enertall + zehn</strong> (f.eks. drei + zehn = dreizehn). 20 er <strong>zwanzig</strong>."
    },

    {
      type: "rule-table",
      headers: ["Tall", "Tysk", "Tall", "Tysk"],
      rows: [
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
      type: "info-box",
      boxType: "tips",
      title: "Tips",
      content: "Legg merke til at <strong>sechzehn</strong> mister s-en i sechs, og <strong>siebzehn</strong> mister en-endelsen i sieben. Det er de to unntakene!"
    },

    {
      type: "eksempel",
      title: "Snakke om alder",
      setninger: [
        { target: "Wie alt <strong>bist</strong> du?", native: "Hvor gammel er du?" },
        { target: "Ich <strong>bin</strong> sechzehn Jahre alt.", native: "Jeg er seksten år gammel." },
        { target: "Mein Bruder <strong>ist</strong> zwölf.", native: "Broren min er tolv." }
      ]
    }
  ]
};
