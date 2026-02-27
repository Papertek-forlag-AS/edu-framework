/**
 * Verification Script for Generated Lesson Files
 *
 * Checks if lesson HTML files have been manually edited by comparing
 * them to freshly generated versions from the template.
 *
 * Usage:
 *   npm run verify:lessons
 *
 * Exit codes:
 *   0 - All files match template (no manual edits)
 *   1 - One or more files have been manually edited
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLessonHTML, CURRICULUM_CONFIG } from './template-generator.js';
import { LESSONS_METADATA } from './lessons-metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../');

/**
 * Verify files for a specific curriculum
 */
function verifyFiles(curriculum) {
  const config = CURRICULUM_CONFIG[curriculum];
  if (!config) {
    console.error(`❌ Unknown curriculum: ${curriculum}`);
    return 0;
  }

  console.log(`\n🔍 Verifying ${config.title} files...`);

  let errors = 0;
  let verified = 0;
  let skipped = 0;

  for (const [chapterId, metadata] of Object.entries(LESSONS_METADATA)) {
    const [chapter] = chapterId.split('-').map(Number);

    // Skip lessons beyond curriculum's chapter count
    if (chapter > config.chapters) {
      continue;
    }

    const fileName = `${config.filePrefix}-${chapterId}.html`;
    const curriculumDir = path.join(publicDir, 'lessons', config.folderName);
    const filePath = path.join(curriculumDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⏭️  ${fileName} - Does not exist (skipped)`);
      skipped++;
      continue;
    }

    const diskContent = fs.readFileSync(filePath, 'utf-8');
    const expectedContent = generateLessonHTML(chapterId, config, metadata);

    // Normalize line endings for comparison
    const normalizedDisk = diskContent.replace(/\r\n/g, '\n');
    const normalizedExpected = expectedContent.replace(/\r\n/g, '\n');

    if (normalizedDisk !== normalizedExpected) {
      console.error(`   ❌ ${fileName} - MANUALLY MODIFIED!`);
      errors++;
    } else {
      console.log(`   ✅ ${fileName} - Matches template`);
      verified++;
    }
  }

  console.log(`\n📊 Summary for ${config.title}:`);
  console.log(`   ✅ Verified: ${verified} files`);
  if (errors > 0) {
    console.log(`   ❌ Modified: ${errors} files`);
  }
  if (skipped > 0) {
    console.log(`   ⏭️  Skipped: ${skipped} files`);
  }

  return errors;
}

/**
 * Main execution
 */
function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   Lesson Files Verification');
  console.log('═══════════════════════════════════════════');

  let totalErrors = 0;
  const curricula = Object.keys(CURRICULUM_CONFIG);

  // Verify all curricula
  for (const curriculumId of curricula) {
    const errors = verifyFiles(curriculumId);
    totalErrors += errors;
  }

  console.log('\n═══════════════════════════════════════════');

  if (totalErrors === 0) {
    console.log('✅ SUCCESS: All lesson files match templates!');
    console.log('   No manual edits detected.');
    process.exit(0);
  } else {
    console.log(`❌ FAILURE: ${totalErrors} file(s) have been manually edited!`);
    console.log('\n🔧 To fix this, regenerate the modified files:');
    console.log('   npm run generate:lessons:all');
    console.log('\n⚠️  WARNING: Regeneration will overwrite manual changes!');
    console.log('   If you need to preserve changes, move them to:');
    console.log('   - Template: public/js/lesson-template/template.html');
    console.log('   - Content: public/js/lessons-data.js or exercises-data/');
    process.exit(1);
  }
}

main();
