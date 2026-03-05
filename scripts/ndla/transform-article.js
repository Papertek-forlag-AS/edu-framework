/**
 * NDLA HTML → Papertek Content Transformer
 *
 * Converts NDLA article HTML into Papertek lesson data format.
 * Uses jsdom to parse HTML and extract structured content.
 *
 * @see schemas/lesson.schema.json
 */
import { JSDOM } from 'jsdom';

/**
 * Parse an NDLA article into structured sections.
 *
 * @param {Object} article - Raw NDLA article object from API
 * @returns {Object} Parsed article with title, intro, sections[], terms[]
 */
export function parseArticle(article) {
  const dom = new JSDOM(article.content?.content || article.content || '');
  const doc = dom.window.document;

  const sections = [];
  const terms = [];

  // Extract sections from h2/h3 headings
  const headings = doc.querySelectorAll('h2, h3');
  headings.forEach(heading => {
    const sectionText = [];
    let el = heading.nextElementSibling;
    while (el && !['H2', 'H3'].includes(el.tagName)) {
      if (el.tagName === 'P') {
        sectionText.push(el.textContent.trim());
      }
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        el.querySelectorAll('li').forEach(li => {
          sectionText.push(`• ${li.textContent.trim()}`);
        });
      }
      // Extract definition lists
      if (el.tagName === 'DL') {
        const dts = el.querySelectorAll('dt');
        const dds = el.querySelectorAll('dd');
        dts.forEach((dt, i) => {
          const dd = dds[i];
          if (dd) {
            terms.push({ term: dt.textContent.trim(), definition: dd.textContent.trim() });
          }
        });
      }
      el = el.nextElementSibling;
    }

    if (sectionText.length > 0) {
      sections.push({
        heading: heading.textContent.trim(),
        level: heading.tagName === 'H2' ? 2 : 3,
        paragraphs: sectionText,
      });
    }
  });

  // Extract ndlaembed concept references
  const embeds = doc.querySelectorAll('ndlaembed[data-resource="concept"]');
  embeds.forEach(embed => {
    const title = embed.getAttribute('data-title') || '';
    const content = embed.getAttribute('data-content') || embed.textContent.trim();
    if (title) {
      terms.push({ term: title, definition: content });
    }
  });

  // If no h2/h3 sections, treat the whole body as one section
  if (sections.length === 0) {
    const allText = [];
    doc.querySelectorAll('p').forEach(p => {
      allText.push(p.textContent.trim());
    });
    if (allText.length > 0) {
      sections.push({
        heading: article.title?.title || 'Innhold',
        level: 2,
        paragraphs: allText,
      });
    }
  }

  return {
    id: article.id,
    title: article.title?.title || '',
    introduction: article.introduction?.introduction || '',
    license: article.copyright?.license?.license || article.license || 'CC-BY-SA-4.0',
    sections,
    terms,
  };
}

/**
 * Transform a parsed article + lesson config into a Papertek lesson data object.
 *
 * @param {Object} parsed - Output from parseArticle()
 * @param {Object} lessonConfig - Lesson config from articles.json
 * @param {string[]} [lessonConfig.sections] - Which sections to include (by heading match)
 * @returns {Object} Papertek lesson data: { title, subtitle, goals[], dialog[], checklist[], vocabulary[] }
 */
export function transformToLesson(parsed, lessonConfig) {
  // Filter sections if specific ones are requested
  let relevantSections = parsed.sections;
  if (lessonConfig.sections && lessonConfig.sections.length > 0) {
    relevantSections = parsed.sections.filter(s =>
      lessonConfig.sections.some(requested =>
        s.heading.toLowerCase().includes(requested.toLowerCase())
      )
    );
    // Fallback: if no matches, use all sections
    if (relevantSections.length === 0) {
      relevantSections = parsed.sections;
    }
  }

  // Build dialog from sections (teacher/student conversational format)
  const dialog = [];

  // Opening: teacher introduces the topic
  dialog.push({
    speaker: 'Lærer',
    text: `I dag skal vi lære om ${lessonConfig.title.toLowerCase()}. ${parsed.introduction}`,
    translation: '',
  });

  // Convert each section into teacher explanation + student question
  for (const section of relevantSections) {
    // Student asks about the topic
    dialog.push({
      speaker: 'Elev',
      text: `Hva betyr «${section.heading.replace(/[–—]/g, '-').trim()}»?`,
      translation: '',
    });

    // Teacher explains using the first 2-3 paragraphs
    const explanation = section.paragraphs.slice(0, 3).join(' ');
    // Trim to reasonable length for dialog
    const trimmed = explanation.length > 400
      ? explanation.slice(0, 400).replace(/\s\S*$/, '') + '...'
      : explanation;

    dialog.push({
      speaker: 'Lærer',
      text: trimmed,
      translation: '',
    });
  }

  // Build learning goals from section headings + intro
  const goals = relevantSections.map(s => `Forstå hva «${s.heading}» betyr`);
  if (parsed.terms.length > 0) {
    goals.push(`Kunne forklare ${Math.min(parsed.terms.length, 5)} viktige begreper`);
  }

  // Build checklist from goals
  const checklist = goals.map(g => `Jeg kan ${g.toLowerCase().replace('forstå', 'forklare')}`);
  checklist.push('Jeg kan oppsummere det viktigste fra leksjonen');

  return {
    title: lessonConfig.title,
    subtitle: parsed.title,
    goals,
    dialog,
    checklist,
    vocabulary: [],
  };
}

/**
 * Generate grammar/theory modules from a parsed article.
 * Repurposes the grammar module system for science theory.
 *
 * @param {Object} parsed - Output from parseArticle()
 * @param {Object} lessonConfig - Lesson config
 * @returns {Array} Grammar module entries (heading, explanation, rule-table, info-box)
 */
export function generateTheoryModules(parsed, lessonConfig) {
  const modules = [];

  // Filter sections if specified
  let relevantSections = parsed.sections;
  if (lessonConfig.sections && lessonConfig.sections.length > 0) {
    relevantSections = parsed.sections.filter(s =>
      lessonConfig.sections.some(r =>
        s.heading.toLowerCase().includes(r.toLowerCase())
      )
    );
    if (relevantSections.length === 0) relevantSections = parsed.sections;
  }

  // Add heading
  modules.push({
    type: 'heading',
    level: 3,
    text: lessonConfig.title,
  });

  // Add explanations from sections
  for (const section of relevantSections) {
    modules.push({
      type: 'heading',
      level: 4,
      text: section.heading,
    });
    modules.push({
      type: 'explanation',
      text: section.paragraphs.slice(0, 2).join(' '),
    });
  }

  // Add term table if there are definitions
  if (parsed.terms.length > 0) {
    const termsForLesson = parsed.terms.slice(0, 8);
    modules.push({
      type: 'rule-table',
      headers: ['Begrep', 'Forklaring'],
      rows: termsForLesson.map(t => [t.term, t.definition]),
    });
  }

  // Add info-box summary
  const keyPoints = relevantSections
    .map(s => s.paragraphs[0])
    .filter(Boolean)
    .slice(0, 3);
  if (keyPoints.length > 0) {
    modules.push({
      type: 'info-box',
      boxType: 'remember',
      title: 'Husk!',
      content: keyPoints.join(' '),
    });
  }

  return modules;
}
