/**
 * Lesson Template Metadata
 *
 * This file defines which lessons exist and their configuration.
 * Titles are read dynamically from lessons-data.js at generation time.
 *
 * Configuration:
 * - hasExtraExercises: Based on EXERCISE_DATABASE (extraExercises > 0)
 * - hasDialog: Lessons with classroom dialog content
 * - nextLesson: Link to next lesson (null for last lesson in chapter)
 */

export const LESSONS_METADATA = {
  // Chapter 1
  "1-1": {
    targetTitle: "Hallo! Wie heißt du?",
    spanishTitle: "¡Hola! ¿Cómo te llamas?",
    frenchTitle: "Salut! Comment tu t'appelles?",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "1-2"
  },
  "1-2": {
    targetTitle: "Meine Familie",
    spanishTitle: "Mi familia",
    frenchTitle: "Ma famille",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "1-3"
  },
  "1-3": {
    targetTitle: "Meine Freunde",
    spanishTitle: "Mis amigos",
    frenchTitle: "Mes amis",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 2
  "2-1": {
    targetTitle: "In der Schule",
    spanishTitle: "En la escuela",
    frenchTitle: "À l'école",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "2-2"
  },
  "2-2": {
    targetTitle: "Meine Hobbys",
    spanishTitle: "Mis pasatiempos",
    frenchTitle: "Mes loisirs",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "2-3"
  },
  "2-3": {
    targetTitle: "Am Wochenende",
    spanishTitle: "El fin de semana",
    frenchTitle: "Le week-end",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 3
  "3-1": {
    targetTitle: "Im Supermarkt",
    spanishTitle: "En el supermercado",
    frenchTitle: "Au supermarché",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "3-2"
  },
  "3-2": {
    targetTitle: "Was kochen wir?",
    spanishTitle: "¿Qué cocinamos?",
    frenchTitle: "Qu'est-ce qu'on cuisine?",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "3-3"
  },
  "3-3": {
    targetTitle: "Im Restaurant",
    spanishTitle: "En el restaurante",
    frenchTitle: "Au restaurant",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 4
  "4-1": {
    targetTitle: "Was trägst du heute?",
    spanishTitle: "¿Qué llevas puesto?",
    frenchTitle: "Que portes-tu aujourd'hui ?",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "4-2"
  },
  "4-2": {
    targetTitle: "Aussehen",
    spanishTitle: "Apariencia",
    frenchTitle: "L'apparence",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "4-3"
  },
  "4-3": {
    targetTitle: "Persönlichkeit und Charakter",
    spanishTitle: "Personalidad",
    frenchTitle: "La personnalité",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 5
  "5-1": {
    targetTitle: "Ein typischer Tag",
    spanishTitle: "Un día típico",
    frenchTitle: "Ma journée",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "5-2"
  },
  "5-2": {
    targetTitle: "Wann treffen wir uns?",
    spanishTitle: "¿Cuándo nos encontramos?",
    frenchTitle: "On se retrouve quand ?",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "5-3"
  },
  "5-3": {
    targetTitle: "Ein Plan für Samstag",
    spanishTitle: "Planes para el sábado",
    frenchTitle: "Un plan pour samedi",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 6
  "6-1": {
    targetTitle: "Ich will ein Haustier!",
    spanishTitle: "¡Quiero una mascota!",
    frenchTitle: "Je veux un animal !",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "6-2"
  },
  "6-2": {
    targetTitle: "Mein Tier ist das beste!",
    spanishTitle: "¡Mi animal es el mejor!",
    frenchTitle: "Qui a le meilleur animal ?",
    hasExtraExercises: true,
    hasDialog: true,  // Has Tier-Rennen classroom game
    nextLesson: "6-3"
  },
  "6-3": {
    targetTitle: "Tiere im Zoo",
    spanishTitle: "Animales en el zoológico",
    frenchTitle: "Une super journée au zoo !",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 7
  "7-1": {
    targetTitle: "Wohin willst du fahren?",
    spanishTitle: "¿A dónde quieres ir?",
    frenchTitle: "Mes rêves de vacances",
    hasExtraExercises: true,
    hasDialog: true,
    nextLesson: "7-2"
  },
  "7-2": {
    targetTitle: "Was müssen wir mitnehmen?",
    spanishTitle: "¿Qué necesitamos llevar?",
    frenchTitle: "Nous partons en France !",
    hasExtraExercises: true,
    hasDialog: true,
    nextLesson: "7-3"
  },
  "7-3": {
    targetTitle: "In den Alpen",
    spanishTitle: "En los Alpes",
    frenchTitle: "Carte postale de Nice",
    hasExtraExercises: true,
    hasDialog: true,
    nextLesson: null
  },

  // Chapter 8
  "8-1": {
    targetTitle: "Das Jahr hat zwölf Monate",
    spanishTitle: "El año tiene doce meses",
    frenchTitle: "Quel est ton mois préféré ?",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "8-2"
  },
  "8-2": {
    targetTitle: "Pläne für den Sommer",
    spanishTitle: "Planes para el verano",
    frenchTitle: "Quelle fête préfères-tu ?",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "8-3"
  },
  "8-3": {
    targetTitle: "Die Geburtstagsparty",
    spanishTitle: "La fiesta de cumpleaños",
    frenchTitle: "On organise une fête surprise !",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 9
  "9-1": {
    targetTitle: "Ich mag dich!",
    spanishTitle: "¡Me gustas!",
    frenchTitle: "Nouveaux amis",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "9-2"
  },
  "9-2": {
    targetTitle: "Wir treffen uns!",
    spanishTitle: "¡Nos encontramos!",
    frenchTitle: "L'invitation",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "9-3"
  },
  "9-3": {
    targetTitle: "Wen kennst du?",
    spanishTitle: "¿A quién conoces?",
    frenchTitle: "L'interview",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 10
  "10-1": {
    targetTitle: "Meine Morgenroutine",
    spanishTitle: "Mi rutina de mañana",
    frenchTitle: "Le corps humain",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "10-2"
  },
  "10-2": {
    targetTitle: "Wie fühlst du dich?",
    spanishTitle: "¿Cómo te sientes?",
    frenchTitle: "Chez le médecin",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "10-3"
  },
  "10-3": {
    targetTitle: "Mein Wochenende",
    spanishTitle: "Mi fin de semana",
    frenchTitle: "En forme !",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 11
  "11-1": {
    targetTitle: "Was sollst du machen?",
    spanishTitle: "¿Qué vas a hacer?",
    frenchTitle: "Mon dernier voyage",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "11-2"
  },
  "11-2": {
    targetTitle: "Das ist unser Haus!",
    spanishTitle: "¡Esta es nuestra casa!",
    frenchTitle: "Une journée en ville",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "11-3"
  },
  "11-3": {
    targetTitle: "Wer ist am schnellsten?",
    spanishTitle: "¿Quién es el más rápido?",
    frenchTitle: "Au restaurant",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  },

  // Chapter 12
  "12-1": {
    targetTitle: "Kannst du mir helfen?",
    spanishTitle: "¿Puedes ayudarme?",
    frenchTitle: "L'avenir",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "12-2"
  },
  "12-2": {
    targetTitle: "Nach der Schule",
    spanishTitle: "Después de la escuela",
    frenchTitle: "Mes rêves",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: "12-3"
  },
  "12-3": {
    targetTitle: "Was hast du gemacht?",
    spanishTitle: "¿Qué hiciste?",
    frenchTitle: "Mon avenir",
    hasExtraExercises: true,
    hasDialog: false,
    nextLesson: null
  }
};
