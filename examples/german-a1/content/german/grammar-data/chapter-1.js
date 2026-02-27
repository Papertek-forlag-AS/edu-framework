/**
 * Chapter 1 — Grammar: Verbet "sein" (to be)
 * @see schemas/grammar.schema.json
 */
export const grammarModules = {
  "1": [
    { type: "tittel", tekst: "Verbet «sein» (å være)", nivå: 2 },

    {
      type: "forklaring",
      tekst: "Det viktigste verbet i tysk er <strong>sein</strong> (å være). Du bruker det for å si hvem du er, hvor du kommer fra, og hvordan du har det."
    },

    {
      type: "regel-tabell",
      overskrifter: ["Pronomen", "sein", "Norsk"],
      rader: [
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
      tittel: "Eksempler med sein",
      setninger: [
        { tysk: "Ich <strong>bin</strong> Anna.", norsk: "Jeg er Anna." },
        { tysk: "Du <strong>bist</strong> Max.", norsk: "Du er Max." },
        { tysk: "Er <strong>ist</strong> Lehrer.", norsk: "Han er lærer." },
        { tysk: "Wir <strong>sind</strong> Schüler.", norsk: "Vi er elever." }
      ]
    },

    {
      type: "infoboks",
      boksType: "husk",
      tittel: "Husk!",
      innhold: "<strong>Sie</strong> (med stor S) er høflighetsformen og bruker alltid <strong>sind</strong>, akkurat som <em>sie</em> (de). Konteksten viser om det er «De» eller «de»."
    },

    { type: "tittel", tekst: "Spørreord", nivå: 3 },

    {
      type: "forklaring",
      tekst: "I tysk lager vi spørsmål ved å sette verbet foran subjektet, eller ved å bruke spørreord."
    },

    {
      type: "regel-tabell",
      overskrifter: ["Spørreord", "Betydning", "Eksempel"],
      rader: [
        ["Wie", "Hvordan / Hva", "Wie heißt du?"],
        ["Woher", "Hvorfra", "Woher kommst du?"],
        ["Wo", "Hvor", "Wo wohnst du?"],
        ["Wer", "Hvem", "Wer ist das?"]
      ]
    },

    {
      type: "infoboks",
      boksType: "tips",
      tittel: "Tips",
      innhold: "Spørreord som begynner med <strong>W</strong> kalles «W-Fragen» på tysk. Det er lett å huske fordi de alle starter med W!"
    }
  ]
};
