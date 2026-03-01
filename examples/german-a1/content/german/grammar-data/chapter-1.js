/**
 * Chapter 1 — Grammar: Verbet "sein" (to be)
 * @see schemas/grammar.schema.json
 */
export const grammarModules = {
  "1": [
    { type: "heading", text: "Verbet «sein» (å være)", level: 2 },

    {
      type: "explanation",
      text: "Det viktigste verbet i tysk er <strong>sein</strong> (å være). Du bruker det for å si hvem du er, hvor du kommer fra, og hvordan du har det."
    },

    {
      type: "rule-table",
      headers: ["Pronomen", "sein", "Norsk"],
      rows: [
        ["ich", "<strong>bin</strong>", "jeg er"],
        ["du", "<strong>bist</strong>", "du er"],
        ["er/sie/es", "<strong>ist</strong>", "han/hun/det er"],
        ["wir", "<strong>sind</strong>", "vi er"],
        ["ihr", "<strong>seid</strong>", "dere er"],
        ["sie/Sie", "<strong>sind</strong>", "de er / De er"]
      ]
    },

    {
      type: "eksempel",
      title: "Eksempler med sein",
      setninger: [
        { target: "Ich <strong>bin</strong> Anna.", native: "Jeg er Anna." },
        { target: "Du <strong>bist</strong> Max.", native: "Du er Max." },
        { target: "Er <strong>ist</strong> Lehrer.", native: "Han er lærer." },
        { target: "Wir <strong>sind</strong> Schüler.", native: "Vi er elever." }
      ]
    },

    {
      type: "info-box",
      boxType: "remember",
      title: "Husk!",
      content: "<strong>Sie</strong> (med stor S) er høflighetsformen og bruker alltid <strong>sind</strong>, akkurat som <em>sie</em> (de). Konteksten viser om det er «De» eller «de»."
    },

    { type: "heading", text: "Spørreord", level: 3 },

    {
      type: "explanation",
      text: "I tysk lager vi spørsmål ved å sette verbet foran subjektet, eller ved å bruke spørreord."
    },

    {
      type: "rule-table",
      headers: ["Spørreord", "Betydning", "Eksempel"],
      rows: [
        ["Wie", "Hvordan / Hva", "Wie heißt du?"],
        ["Woher", "Hvorfra", "Woher kommst du?"],
        ["Wo", "Hvor", "Wo wohnst du?"],
        ["Wer", "Hvem", "Wer ist das?"]
      ]
    },

    {
      type: "info-box",
      boxType: "tips",
      title: "Tips",
      content: "Spørreord som begynner med <strong>W</strong> kalles «W-Fragen» på tysk. Det er lett å huske fordi de alle starter med W!"
    }
  ]
};
