/**
 * Chapter 1 — Greetings and Introductions
 * @see schemas/lesson.schema.json
 */
export const lessonsData = {
  "1-1": {
    title: "Hallo! Ich bin Anna.",
    subtitle: "Hilsener og presentasjon",
    goals: [
      "Kunne hilse på tysk (Hallo, Guten Morgen, Tschüss)",
      "Kunne presentere seg selv (Ich bin..., Ich heiße...)",
      "Forstå enkel presentasjon av andre"
    ],
    dialog: [
      { speaker: "Anna", text: "Hallo! Ich bin Anna.", translation: "Hei! Jeg er Anna." },
      { speaker: "Max", text: "Hallo Anna! Ich bin Max.", translation: "Hei Anna! Jeg er Max." },
      { speaker: "Anna", text: "Wie heißt du?", translation: "Hva heter du?" },
      { speaker: "Max", text: "Ich heiße Max. Und du?", translation: "Jeg heter Max. Og du?" },
      { speaker: "Anna", text: "Ich heiße Anna. Woher kommst du?", translation: "Jeg heter Anna. Hvor kommer du fra?" },
      { speaker: "Max", text: "Ich komme aus Berlin.", translation: "Jeg kommer fra Berlin." },
      { speaker: "Anna", text: "Ich komme aus München. Tschüss, Max!", translation: "Jeg kommer fra München. Ha det, Max!" },
      { speaker: "Max", text: "Tschüss, Anna!", translation: "Ha det, Anna!" }
    ],
    checklist: [
      "Jeg kan hilse på tysk",
      "Jeg kan si hva jeg heter",
      "Jeg kan spørre noen hva de heter",
      "Jeg kan si hvor jeg kommer fra"
    ],
    vocabulary: ["Hallo", "Tschüss", "Ich bin", "Ich heiße", "Wie heißt du?", "Woher kommst du?", "Ich komme aus"]
  },
  "1-2": {
    title: "Guten Morgen! Wie geht es Ihnen?",
    subtitle: "Formelle hilsener og høflighetsfraser",
    goals: [
      "Kunne bruke formelle hilsener (Guten Morgen/Tag/Abend)",
      "Kunne spørre hvordan det går (Wie geht es Ihnen/dir?)",
      "Kunne svare på hvordan det går (Gut/Schlecht/Es geht)"
    ],
    dialog: [
      { speaker: "Frau Schmidt", text: "Guten Morgen! Wie geht es Ihnen?", translation: "God morgen! Hvordan har De det?" },
      { speaker: "Herr Müller", text: "Guten Morgen! Mir geht es gut, danke.", translation: "God morgen! Jeg har det bra, takk." },
      { speaker: "Frau Schmidt", text: "Das freut mich.", translation: "Det gleder meg." },
      { speaker: "Herr Müller", text: "Und Ihnen?", translation: "Og Dem?" },
      { speaker: "Frau Schmidt", text: "Auch gut, danke!", translation: "Også bra, takk!" },
      { speaker: "Herr Müller", text: "Auf Wiedersehen, Frau Schmidt!", translation: "På gjensyn, fru Schmidt!" },
      { speaker: "Frau Schmidt", text: "Auf Wiedersehen!", translation: "På gjensyn!" }
    ],
    checklist: [
      "Jeg kan bruke formelle hilsener",
      "Jeg kan spørre hvordan noen har det (formelt)",
      "Jeg kan svare på hvordan jeg har det",
      "Jeg kjenner forskjellen mellom du og Sie"
    ],
    vocabulary: ["Guten Morgen", "Guten Tag", "Guten Abend", "Auf Wiedersehen", "Wie geht es Ihnen?", "Mir geht es gut", "danke"]
  }
};
