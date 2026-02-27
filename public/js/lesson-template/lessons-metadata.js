/**
 * Lesson Template Metadata
 *
 * This file defines which lessons exist and their configuration.
 * Titles are read dynamically from lessons-data.js at generation time.
 *
 * Configuration:
 * - hasEkstraovelser: Based on EXERCISE_DATABASE (ekstraovelser > 0)
 * - hasDialog: Lessons with classroom dialog content
 * - nextLesson: Link to next lesson (null for last lesson in chapter)
 */

export const LESSONS_METADATA = {
  // Chapter 1
  "1-1": {
    germanTitle: "Hallo! Wie heißt du?",
    spanishTitle: "¡Hola! ¿Cómo te llamas?",
    frenchTitle: "Salut! Comment tu t'appelles?",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "1-2"
  },
  "1-2": {
    germanTitle: "Meine Familie",
    spanishTitle: "Mi familia",
    frenchTitle: "Ma famille",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "1-3"
  },
  "1-3": {
    germanTitle: "Meine Freunde",
    spanishTitle: "Mis amigos",
    frenchTitle: "Mes amis",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 2
  "2-1": {
    germanTitle: "In der Schule",
    spanishTitle: "En la escuela",
    frenchTitle: "À l'école",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "2-2"
  },
  "2-2": {
    germanTitle: "Meine Hobbys",
    spanishTitle: "Mis pasatiempos",
    frenchTitle: "Mes loisirs",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "2-3"
  },
  "2-3": {
    germanTitle: "Am Wochenende",
    spanishTitle: "El fin de semana",
    frenchTitle: "Le week-end",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 3
  "3-1": {
    germanTitle: "Im Supermarkt",
    spanishTitle: "En el supermercado",
    frenchTitle: "Au supermarché",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "3-2"
  },
  "3-2": {
    germanTitle: "Was kochen wir?",
    spanishTitle: "¿Qué cocinamos?",
    frenchTitle: "Qu'est-ce qu'on cuisine?",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "3-3"
  },
  "3-3": {
    germanTitle: "Im Restaurant",
    spanishTitle: "En el restaurante",
    frenchTitle: "Au restaurant",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 4
  "4-1": {
    germanTitle: "Was trägst du heute?",
    spanishTitle: "¿Qué llevas puesto?",
    frenchTitle: "Que portes-tu aujourd'hui ?",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "4-2"
  },
  "4-2": {
    germanTitle: "Aussehen",
    spanishTitle: "Apariencia",
    frenchTitle: "L'apparence",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "4-3"
  },
  "4-3": {
    germanTitle: "Persönlichkeit und Charakter",
    spanishTitle: "Personalidad",
    frenchTitle: "La personnalité",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 5
  "5-1": {
    germanTitle: "Ein typischer Tag",
    spanishTitle: "Un día típico",
    frenchTitle: "Ma journée",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "5-2"
  },
  "5-2": {
    germanTitle: "Wann treffen wir uns?",
    spanishTitle: "¿Cuándo nos encontramos?",
    frenchTitle: "On se retrouve quand ?",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "5-3"
  },
  "5-3": {
    germanTitle: "Ein Plan für Samstag",
    spanishTitle: "Planes para el sábado",
    frenchTitle: "Un plan pour samedi",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 6
  "6-1": {
    germanTitle: "Ich will ein Haustier!",
    spanishTitle: "¡Quiero una mascota!",
    frenchTitle: "Je veux un animal !",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "6-2"
  },
  "6-2": {
    germanTitle: "Mein Tier ist das beste!",
    spanishTitle: "¡Mi animal es el mejor!",
    frenchTitle: "Qui a le meilleur animal ?",
    hasEkstraovelser: true,
    hasDialog: true,  // Has Tier-Rennen classroom game
    nextLesson: "6-3"
  },
  "6-3": {
    germanTitle: "Tiere im Zoo",
    spanishTitle: "Animales en el zoológico",
    frenchTitle: "Une super journée au zoo !",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 7
  "7-1": {
    germanTitle: "Wohin willst du fahren?",
    spanishTitle: "¿A dónde quieres ir?",
    frenchTitle: "Mes rêves de vacances",
    hasEkstraovelser: true,
    hasDialog: true,
    nextLesson: "7-2"
  },
  "7-2": {
    germanTitle: "Was müssen wir mitnehmen?",
    spanishTitle: "¿Qué necesitamos llevar?",
    frenchTitle: "Nous partons en France !",
    hasEkstraovelser: true,
    hasDialog: true,
    nextLesson: "7-3"
  },
  "7-3": {
    germanTitle: "In den Alpen",
    spanishTitle: "En los Alpes",
    frenchTitle: "Carte postale de Nice",
    hasEkstraovelser: true,
    hasDialog: true,
    nextLesson: null
  },

  // Chapter 8
  "8-1": {
    germanTitle: "Das Jahr hat zwölf Monate",
    spanishTitle: "El año tiene doce meses",
    frenchTitle: "Quel est ton mois préféré ?",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "8-2"
  },
  "8-2": {
    germanTitle: "Pläne für den Sommer",
    spanishTitle: "Planes para el verano",
    frenchTitle: "Quelle fête préfères-tu ?",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "8-3"
  },
  "8-3": {
    germanTitle: "Die Geburtstagsparty",
    spanishTitle: "La fiesta de cumpleaños",
    frenchTitle: "On organise une fête surprise !",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 9
  "9-1": {
    germanTitle: "Ich mag dich!",
    spanishTitle: "¡Me gustas!",
    frenchTitle: "Nouveaux amis",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "9-2"
  },
  "9-2": {
    germanTitle: "Wir treffen uns!",
    spanishTitle: "¡Nos encontramos!",
    frenchTitle: "L'invitation",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "9-3"
  },
  "9-3": {
    germanTitle: "Wen kennst du?",
    spanishTitle: "¿A quién conoces?",
    frenchTitle: "L'interview",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 10
  "10-1": {
    germanTitle: "Meine Morgenroutine",
    spanishTitle: "Mi rutina de mañana",
    frenchTitle: "Le corps humain",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "10-2"
  },
  "10-2": {
    germanTitle: "Wie fühlst du dich?",
    spanishTitle: "¿Cómo te sientes?",
    frenchTitle: "Chez le médecin",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "10-3"
  },
  "10-3": {
    germanTitle: "Mein Wochenende",
    spanishTitle: "Mi fin de semana",
    frenchTitle: "En forme !",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 11
  "11-1": {
    germanTitle: "Was sollst du machen?",
    spanishTitle: "¿Qué vas a hacer?",
    frenchTitle: "Mon dernier voyage",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "11-2"
  },
  "11-2": {
    germanTitle: "Das ist unser Haus!",
    spanishTitle: "¡Esta es nuestra casa!",
    frenchTitle: "Une journée en ville",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "11-3"
  },
  "11-3": {
    germanTitle: "Wer ist am schnellsten?",
    spanishTitle: "¿Quién es el más rápido?",
    frenchTitle: "Au restaurant",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 12
  "12-1": {
    germanTitle: "Kannst du mir helfen?",
    spanishTitle: "¿Puedes ayudarme?",
    frenchTitle: "L'avenir",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "12-2"
  },
  "12-2": {
    germanTitle: "Nach der Schule",
    spanishTitle: "Después de la escuela",
    frenchTitle: "Mes rêves",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: "12-3"
  },
  "12-3": {
    germanTitle: "Was hast du gemacht?",
    spanishTitle: "¿Qué hiciste?",
    frenchTitle: "Mon avenir",
    hasEkstraovelser: true,
    hasDialog: false,
    nextLesson: null
  }
};
