/**
 * Exercise Auto-Generator
 *
 * Generates Papertek exercises from transformed NDLA content.
 * Produces matching, true-false, fill-in, quiz, flashcards, categorize, and writing exercises.
 *
 * @see schemas/exercise.schema.json
 */

/**
 * Generate exercises for a lesson from parsed article data.
 *
 * @param {Object} parsed - Output from parseArticle() with sections[] and terms[]
 * @param {Object} lessonConfig - Lesson config from articles.json
 * @param {string} lessonId - Lesson ID (e.g., "1-1")
 * @returns {{ exercises: Object[], extraExercises: Object[] }}
 */
export function generateExercises(parsed, lessonConfig, lessonId) {
  const exercises = [];
  const extraExercises = [];
  const letters = 'ABCDEFGH';
  let idx = 0;

  // Filter sections relevant to this lesson
  let sections = parsed.sections;
  if (lessonConfig.sections?.length > 0) {
    const filtered = parsed.sections.filter(s =>
      lessonConfig.sections.some(r => s.heading.toLowerCase().includes(r.toLowerCase()))
    );
    if (filtered.length > 0) sections = filtered;
  }

  // Collect terms from the relevant sections
  const terms = parsed.terms.slice(0, 10);

  // ── 1. Matching exercise (if we have term/definition pairs) ──────
  if (terms.length >= 3) {
    const pairs = terms.slice(0, 6).map((t, i) => ({
      id: i + 1,
      q: t.term,
      a: t.definition.length > 60 ? t.definition.slice(0, 57) + '...' : t.definition,
    }));
    exercises.push({
      id: `oppgave${letters[idx]}`,
      type: 'matching',
      title: `Oppgave ${letters[idx]}: Koble begrep og forklaring`,
      badges: [{ text: 'Begreper' }],
      description: 'Koble hvert fagbegrep med riktig forklaring.',
      isIconGame: false,
      variableName: `terms-match-${lessonId}`,
      pairs,
    });
    idx++;
  }

  // ── 2. True/False from section content ───────────────────────────
  const statements = buildTrueFalseStatements(sections, terms);
  if (statements.length >= 3) {
    exercises.push({
      id: `oppgave${letters[idx]}`,
      type: 'true-false',
      title: `Oppgave ${letters[idx]}: Riktig eller galt?`,
      badges: [],
      description: 'Avgjør om påstandene stemmer med det du har lest.',
      variableName: `tf-${lessonId}`,
      statements: statements.slice(0, 5),
    });
    idx++;
  }

  // ── 3. Fill-in-the-blank from key sentences ──────────────────────
  const fillItems = buildFillInItems(sections, terms);
  if (fillItems.length >= 2) {
    exercises.push({
      id: `oppgave${letters[idx]}`,
      type: 'fill-in',
      title: `Oppgave ${letters[idx]}: Fyll inn riktig begrep`,
      badges: [],
      description: 'Fyll inn det manglende fagbegrepet.',
      items: fillItems.slice(0, 5),
    });
    idx++;
  }

  // ── 4. Quiz from section headings and key concepts ───────────────
  const questions = buildQuizQuestions(sections, terms);
  if (questions.length >= 2) {
    exercises.push({
      id: `oppgave${letters[idx]}`,
      type: 'quiz',
      title: `Oppgave ${letters[idx]}: Velg riktig svar`,
      badges: [],
      description: 'Velg det riktige alternativet.',
      questions: questions.slice(0, 4),
    });
    idx++;
  }

  // ── 5. Flashcards from terms ─────────────────────────────────────
  if (terms.length >= 3) {
    exercises.push({
      id: `oppgave${letters[idx]}`,
      type: 'interactive-flashcards',
      title: `Oppgave ${letters[idx]}: Repetisjonsord`,
      badges: [{ text: 'Begreper' }],
      description: 'Øv på de viktigste begrepene med flashkort.',
      cards: terms.slice(0, 8).map(t => ({
        front: t.term,
        back: t.definition,
      })),
    });
    idx++;
  }

  // ── 6. Writing prompt ────────────────────────────────────────────
  exercises.push({
    id: `oppgave${letters[idx]}`,
    type: 'writing',
    title: `Oppgave ${letters[idx]}: Forklar med egne ord`,
    badges: [{ text: 'Skriving' }],
    description: `Forklar det du har lært om ${lessonConfig.title.toLowerCase()} med egne ord.`,
    template: [
      `${lessonConfig.title} handler om...`,
      'Det viktigste jeg har lært er...',
      'En ting jeg vil lære mer om er...',
    ],
    placeholder: `${lessonConfig.title} handler om...`,
  });
  idx++;

  // ── Extra exercises ──────────────────────────────────────────────
  // Extra matching with different terms if we have enough
  if (terms.length >= 5) {
    extraExercises.push({
      id: `ekstraovelse-1-${lessonId}`,
      type: 'interactive-flashcards',
      title: 'Ekstraøvelse 1: Flere begreper',
      badges: [{ type: 'strengthening', text: 'Styrking' }, { text: `Leksjon ${lessonId.replace('-', '.')}` }],
      description: 'Øv på flere begreper fra dette emnet.',
      cards: terms.map(t => ({
        front: t.term,
        back: t.definition,
      })),
    });
  }

  return { exercises, extraExercises };
}

/**
 * Build true/false statements from section content.
 */
function buildTrueFalseStatements(sections, terms) {
  const statements = [];

  // From terms: create true statements
  for (const term of terms.slice(0, 3)) {
    statements.push({
      q: `${term.term} er ${term.definition.toLowerCase().slice(0, 80)}.`,
      a: true,
    });
  }

  // Create false statements by mixing terms
  if (terms.length >= 2) {
    statements.push({
      q: `${terms[0].term} er det samme som ${terms[terms.length - 1].term}.`,
      a: false,
    });
  }

  return statements;
}

/**
 * Build fill-in-the-blank items from sections and terms.
 */
function buildFillInItems(sections, terms) {
  const items = [];

  for (let i = 0; i < Math.min(terms.length, 4); i++) {
    const t = terms[i];
    items.push({
      pre: `${i + 1}. ${t.definition} kalles`,
      answer: t.term.toLowerCase(),
      post: '.',
      width: 'w-32',
    });
  }

  return items;
}

/**
 * Build quiz questions from sections and terms.
 */
function buildQuizQuestions(sections, terms) {
  const questions = [];

  // From terms: "What is X?"
  for (const term of terms.slice(0, 3)) {
    const wrongAnswers = terms
      .filter(t => t.term !== term.term)
      .slice(0, 3)
      .map(t => t.definition.length > 50 ? t.definition.slice(0, 47) + '...' : t.definition);

    if (wrongAnswers.length >= 2) {
      const correctAnswer = term.definition.length > 50
        ? term.definition.slice(0, 47) + '...'
        : term.definition;
      const options = [correctAnswer, ...wrongAnswers.slice(0, 3)];

      questions.push({
        question: `Hva er ${term.term.toLowerCase()}?`,
        options,
        correctIndex: 0,
      });
    }
  }

  return questions;
}
