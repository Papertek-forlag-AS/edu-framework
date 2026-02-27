/**
 * Chapter 1 — Introduction to Variables
 * @see schemas/lesson.schema.json
 *
 * Note: For non-language courses, the "dialog" field is repurposed
 * as a step-by-step explanation with speaker roles like "Lærer" (teacher)
 * and "Elev" (student) to maintain the conversational learning format.
 */
export const lessonsData = {
  "1-1": {
    title: "Hva er en variabel?",
    subtitle: "Bokstaver som tall",
    goals: [
      "Forstå hva en variabel er",
      "Kunne sette inn tall for en variabel",
      "Kunne forenkle enkle uttrykk med variabler"
    ],
    dialog: [
      { speaker: "Lærer", text: "I dag skal vi lære om variabler. En variabel er en bokstav som står for et tall.", translation: "" },
      { speaker: "Elev", text: "Som x?", translation: "" },
      { speaker: "Lærer", text: "Akkurat! Hvis x = 3, hva er da x + 2?", translation: "" },
      { speaker: "Elev", text: "Det er 3 + 2, altså 5!", translation: "" },
      { speaker: "Lærer", text: "Riktig! Vi kan bruke hvilken som helst bokstav. a, b, x, y — alle kan være variabler.", translation: "" },
      { speaker: "Elev", text: "Hva med 2x? Betyr det 2 ganger x?", translation: "" },
      { speaker: "Lærer", text: "Ja! 2x betyr 2 · x. Hvis x = 4, så er 2x = 2 · 4 = 8.", translation: "" }
    ],
    checklist: [
      "Jeg vet hva en variabel er",
      "Jeg kan sette inn tall for x",
      "Jeg forstår at 2x betyr 2 ganger x",
      "Jeg kan regne ut verdien av enkle uttrykk"
    ],
    vocabulary: []
  },
  "1-2": {
    title: "Enkle likninger",
    subtitle: "Finn den ukjente",
    goals: [
      "Kunne løse likninger som x + a = b",
      "Forstå at vi gjør det samme på begge sider",
      "Kunne sjekke svaret ved å sette inn"
    ],
    dialog: [
      { speaker: "Lærer", text: "En likning er et regnestykke med likhetstegn. For eksempel: x + 3 = 7.", translation: "" },
      { speaker: "Elev", text: "Hva er x?", translation: "" },
      { speaker: "Lærer", text: "Det er det vi skal finne ut! Vi må isolere x. Hva kan vi gjøre?", translation: "" },
      { speaker: "Elev", text: "Trekke fra 3 på begge sider?", translation: "" },
      { speaker: "Lærer", text: "Perfekt! x + 3 - 3 = 7 - 3, altså x = 4.", translation: "" },
      { speaker: "Elev", text: "Og vi kan sjekke: 4 + 3 = 7. Stemmer!", translation: "" },
      { speaker: "Lærer", text: "Regelen er enkel: gjør alltid det samme på begge sider av likhetstegnet.", translation: "" }
    ],
    checklist: [
      "Jeg forstår hva en likning er",
      "Jeg kan løse x + a = b",
      "Jeg forstår prinsippet om å gjøre det samme på begge sider",
      "Jeg kan sjekke svaret mitt"
    ],
    vocabulary: []
  }
};
