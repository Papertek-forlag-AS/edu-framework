/**
 * Lesson Template Generator
 *
 * Generates lesson HTML files from template.html and lessons-metadata.js
 *
 * Usage:
 *   node template-generator.js vg1    // Generate VG1 files (chapters 1-12)
 *   node template-generator.js us     // Generate Ungdomsskole files (chapters 1-8)
 *   node template-generator.js all    // Generate all files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import metadata (will need to adjust import based on actual structure)
const metadataPath = path.join(__dirname, 'lessons-metadata.js');
const templatePath = path.join(__dirname, 'template.html');
const templateInternationalPath = path.join(__dirname, 'template-international.html');
const publicDir = path.join(__dirname, '../../'); // Go up to public/ directory

// Read templates
const template = fs.readFileSync(templatePath, 'utf-8');
const templateInternational = fs.existsSync(templateInternationalPath)
  ? fs.readFileSync(templateInternationalPath, 'utf-8')
  : template; // Fallback to regular template if international doesn't exist

// Import lessons metadata (using dynamic import for ES modules)
const { LESSONS_METADATA } = await import('./lessons-metadata.js');

// Curriculum configuration with folder structure
const CURRICULUM_CONFIG = {
  'us-8': {
    id: 'us-8',
    filePrefix: 'us8',
    folderName: 'us-8',
    chapters: 8,
    title: 'Wir sprechen Deutsch 8',
    description: '8. klasse ungdomsskole',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'us-9': {
    id: 'us-9',
    filePrefix: 'us9',
    folderName: 'us-9',
    chapters: 8,
    title: 'Wir sprechen Deutsch 9',
    description: '9. klasse ungdomsskole',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'us-10': {
    id: 'us-10',
    filePrefix: 'us10',
    folderName: 'us-10',
    chapters: 8,
    title: 'Wir sprechen Deutsch 10',
    description: '10. klasse ungdomsskole',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'vg1-tysk1': {
    id: 'vg1-tysk1',
    filePrefix: 'vg1',
    folderName: 'vg1-tysk1',
    chapters: 12,
    title: 'Wir sprechen Deutsch 1 VG1',
    description: 'VG1 Tysk Nivå I',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'vg2-tysk1': {
    id: 'vg2-tysk1',
    filePrefix: 'vg2-t1',
    folderName: 'vg2-tysk1',
    chapters: 12,
    title: 'Wir sprechen Deutsch 1 VG2',
    description: 'VG2 Tysk Nivå I',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'vg1-tysk2': {
    id: 'vg1-tysk2',
    filePrefix: 'vg1-t2',
    folderName: 'vg1-tysk2',
    chapters: 12,
    title: 'Wir sprechen Deutsch 2 VG1',
    description: 'VG1 Tysk Nivå II',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'vg2-tysk2': {
    id: 'vg2-tysk2',
    filePrefix: 'vg2-t2',
    folderName: 'vg2-tysk2',
    chapters: 12,
    title: 'Wir sprechen Deutsch 2 VG2',
    description: 'VG2 Tysk Nivå II',
    languageDir: 'german',
    startButtonText: 'Start med tysk'
  },
  'spansk1-vg1': {
    id: 'spansk1-vg1',
    filePrefix: 'spa1',
    folderName: 'vg1-spansk1',
    chapters: 12,
    title: 'Vamos 1 VG1',
    description: 'VG1 Spansk Nivå I',
    languageDir: 'spanish',
    startButtonText: 'Start med spansk'
  },
  'international': {
    id: 'international',
    filePrefix: 'int',
    folderName: '',  // Output directly to /public/international/
    chapters: 12,
    title: 'German Level A1',
    description: 'International version with English UI',
    languageDir: 'international',  // Special: outputs to /public/international/
    startButtonText: 'Show German',
    uiLanguage: 'en',
    useInternationalTemplate: true
  }
};

/**
 * Generate HTML content for a specific lesson
 * @param {string} chapterId - Chapter ID (e.g., "1-1")
 * @param {object} config - Curriculum configuration
 * @param {object} metadata - Lesson metadata
 */
function generateLessonHTML(chapterId, config, metadata) {
  const [chapter, lesson] = chapterId.split('-');
  const lessonNumber = `${chapter}.${lesson}`;
  const lessonDotNumber = lessonNumber;
  const fileName = `${config.filePrefix}-${chapterId}.html`;
  // Use config.languageDir (default to 'german' if missing for safety)
  const languageDir = config.languageDir || 'german';

  // Handle international curriculum differently - outputs directly to /public/international/
  const isInternational = config.useInternationalTemplate;
  const relativePath = isInternational
    ? `international/${fileName}`
    : `content/${languageDir}/lessons/${config.folderName}/${fileName}`;

  // Use international template for international curriculum
  let html = isInternational ? templateInternational : template;

  // Replace basic placeholders
  const title = (config.languageDir === 'spanish' && metadata.spanishTitle)
    ? metadata.spanishTitle
    : metadata.targetTitle;
  html = html.replace(/\{\{TITLE\}\}/g, title);
  html = html.replace(/\{\{LESSON_NUMBER\}\}/g, lessonNumber);
  html = html.replace(/\{\{LESSON_DOT_NUMBER\}\}/g, lessonDotNumber);
  html = html.replace(/\{\{CHAPTER_ID\}\}/g, chapterId);
  html = html.replace(/\{\{FILE_NAME\}\}/g, relativePath);
  html = html.replace(/\{\{CURRICULUM_PREFIX\}\}/g, config.filePrefix);

  // Replace language-specific UI strings
  html = html.replace(/\{\{START_BUTTON_TEXT\}\}/g, config.startButtonText || 'Start med tysk');

  // Note: Classroom dialog button is now always present in template.html
  // No conditional logic needed

  // Handle conditional extra exercises tab
  if (metadata.hasExtraExercises) {
    const ekstraTab = `
<div class="tab-content hidden space-y-8" id="extra-exercises">
  <!-- Extra exercises loaded dynamically by exercises-content-loader.js -->
  <div id="extra-exercises-content" class="space-y-8"></div>

  <div class="mt-12 p-6 bg-neutral-100/60 rounded-lg text-center">
    <div class="mb-4 text-center">
      <div class="inline-flex items-center gap-2 text-neutral-600 font-medium mb-2">
        <span class="text-2xl">🖥️</span>
        <span data-i18n="dialog_subtitle">For klasserombruk på storskjerm</span>
      </div>
    </div>
    <button class="next-tab-btn bg-primary-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-primary-600 transition-colors" data-next-tab="dialog" data-i18n="dialog_open_btn">
      Åpne klasseromsdialog (storskjerm) →
    </button>
  </div>
</div>
`;
    html = html.replace(/\{\{EKSTRAOVELSER_TAB\}\}/g, ekstraTab);
  } else {
    html = html.replace(/\{\{EKSTRAOVELSER_TAB\}\}/g, '');
  }

  // Note: Dialog tab is now always present in template.html
  // No conditional logic needed

  // Add warning comment at the top
  const warningComment = `<!DOCTYPE html>
<!--
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⚠️  WARNING: THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY  ⚠️      ║
╚═══════════════════════════════════════════════════════════════════════════╝

Curriculum: ${config.id}
Generated by: npm run generate:lessons (or generate:lessons:all)
File path: ${relativePath}
Lesson: ${chapterId} (${metadata.targetTitle})

To make changes to this file:

1. Template structure changes:
   Edit: public/js/lesson-template/template.html
   Then run: npm run generate:lessons:all

2. Lesson configuration (tabs, features):
   Edit: public/js/lesson-template/lessons-metadata.js
   Then run: npm run generate:lessons

3. Unique lesson content (dialog, exercises, vocab):
   - Dialog/goals/checklist: public/js/lessons-data.js
   - Exercises: public/js/exercises-data/chapter-${chapter}.js
   - Vocabulary: public/js/wordbanks/wordbank.js, verbbank.js, etc.
   Note: Content changes do NOT require regeneration

Verify files haven't been manually edited:
   npm run verify:lessons
-->`;

  html = html.replace('<!DOCTYPE html>', warningComment);

  return html;
}

/**
 * Generate files for a specific curriculum
 */
function generateCurriculumFiles(curriculum) {
  const config = CURRICULUM_CONFIG[curriculum];
  if (!config) {
    console.error(`❌ Unknown curriculum: ${curriculum}`);
    return;
  }

  console.log(`\n🚀 Generating ${config.title} lesson files...`);
  console.log(`   File prefix: ${config.filePrefix}`);
  console.log(`   Chapters: 1-${config.chapters}`);

  // Determine output directory based on curriculum type
  let curriculumDir;
  const isInternational = config.useInternationalTemplate;

  if (isInternational) {
    // International lessons go directly to /public/international/
    curriculumDir = path.join(publicDir, 'international');
    console.log(`   Folder: international/`);
  } else {
    // Standard lessons go to /content/{language}/lessons/{curriculum}/
    const languageDir = config.languageDir || 'german';
    const lessonsDir = path.join(publicDir, `content/${languageDir}/lessons`);
    if (!fs.existsSync(lessonsDir)) {
      fs.mkdirSync(lessonsDir, { recursive: true });
    }
    curriculumDir = path.join(lessonsDir, config.folderName);
    console.log(`   Folder: content/${languageDir}/lessons/${config.folderName}/`);
  }

  // Create curriculum folder if it doesn't exist
  if (!fs.existsSync(curriculumDir)) {
    fs.mkdirSync(curriculumDir, { recursive: true });
    console.log(`   📁 Created folder: ${isInternational ? 'international/' : 'lessons/' + config.folderName + '/'}`);
  }

  let generated = 0;
  let skipped = 0;

  // Iterate through all lessons in metadata
  for (const [chapterId, metadata] of Object.entries(LESSONS_METADATA)) {
    const [chapter] = chapterId.split('-').map(Number);

    // Skip lessons beyond curriculum's chapter count
    if (chapter > config.chapters) {
      continue;
    }

    const fileName = `${config.filePrefix}-${chapterId}.html`;
    const filePath = path.join(curriculumDir, fileName);

    try {
      const html = generateLessonHTML(chapterId, config, metadata);
      fs.writeFileSync(filePath, html, 'utf-8');
      console.log(`   ✅ Generated: ${fileName}`);
      generated++;
    } catch (error) {
      console.error(`   ❌ Failed to generate ${fileName}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n📊 Summary for ${config.title}:`);
  console.log(`   Generated: ${generated} files`);
  if (skipped > 0) {
    console.log(`   Skipped: ${skipped} files`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'vg1-tysk1';

  console.log('═══════════════════════════════════════════');
  console.log('   Lesson Template Generator');
  console.log('═══════════════════════════════════════════');

  if (target === 'all') {
    // Generate all curricula
    Object.keys(CURRICULUM_CONFIG).forEach(curriculumId => {
      generateCurriculumFiles(curriculumId);
    });
  } else if (CURRICULUM_CONFIG[target]) {
    generateCurriculumFiles(target);
  } else {
    console.error(`\n❌ Invalid target: ${target}`);
    console.log('\nUsage:');
    console.log('  node template-generator.js <curriculum>');
    console.log('\nAvailable curricula:');
    Object.keys(CURRICULUM_CONFIG).forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log('\nExamples:');
    console.log('  node template-generator.js vg1-tysk1    # Generate VG1 Tysk I files');
    console.log('  node template-generator.js us-8         # Generate Ungdomsskole 8 files');
    console.log('  node template-generator.js all          # Generate all curricula');
    process.exit(1);
  }

  console.log('\n✨ Done!');
}

// Export for verification script
export { generateLessonHTML, CURRICULUM_CONFIG };

// Run if executed directly
main();
