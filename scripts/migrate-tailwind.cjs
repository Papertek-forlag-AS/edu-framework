#!/usr/bin/env node
/**
 * migrate-tailwind.cjs — Tailwind → Papertek CSS Migration Script
 *
 * Phase 2.4 of the Papertek Framework for Education master plan.
 *
 * This script:
 *   1. Renames Tailwind color classes to Papertek naming convention
 *   2. Replaces common multi-class patterns with semantic component classes
 *   3. Reports changes made per file
 *
 * Color mapping:
 *   stone  → neutral     (neutrals, backgrounds, borders, body text)
 *   amber  → primary     (accent, headers, buttons, highlights)
 *   green  → success     (correct answers, completion)
 *   red    → error       (incorrect answers, validation errors)
 *   blue   → info        (links, info panels, secondary actions)
 *   sky    → accent2     (progress bars, training modes)
 *   gray   → neutral     (legacy, phase out)
 *   white  → (kept as-is, mapped in CSS)
 *
 * Run: node scripts/migrate-tailwind.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ─── Color Renaming Map ────────────────────────────────────────────
// Maps Tailwind color names to Papertek semantic names
const COLOR_MAP = {
  'stone': 'neutral',
  'amber': 'primary',
  'green': 'success',
  'red': 'error',
  'blue': 'info',
  'sky': 'accent2',
  'gray': 'neutral',
  'indigo': 'accent3',
  'purple': 'accent4',
  'orange': 'warning',
};

// ─── Patterns that should NOT be renamed ───────────────────────────
// These are CSS class names / identifiers, not color utilities
const SKIP_PATTERNS = [
  /\bstone\b(?!-)/,      // bare "stone" not followed by dash
  /['"]stone['"]/,        // quoted "stone" (likely a string value)
  /className.*stone\b/,   // only skip if bare word, not prefix
];

// ─── Files to process ──────────────────────────────────────────────
const JS_DIR = path.join(__dirname, '..', 'public', 'js');
const TEMPLATE_DIR = path.join(__dirname, '..', 'public', 'js', 'lesson-template');

function getAllJsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Step 1: Color Class Renaming ──────────────────────────────────
// Replaces Tailwind color names with Papertek names in class contexts
function renameColors(content) {
  let modified = content;
  let changeCount = 0;

  for (const [twName, ptName] of Object.entries(COLOR_MAP)) {
    // Match color in class contexts: bg-COLOR-N, text-COLOR-N, border-COLOR-N, etc.
    // Also handles: hover:bg-COLOR-N, focus:border-COLOR-N, ring-COLOR-N
    // And with opacity: bg-COLOR-N/NN
    const colorRegex = new RegExp(
      `((?:hover:|focus:|active:|group-hover:)?(?:bg|text|border|ring|from|to|via|placeholder|shadow|outline|decoration)-)(${twName})(-)`,
      'g'
    );
    const before = modified;
    modified = modified.replace(colorRegex, `$1${ptName}$3`);
    if (modified !== before) {
      const count = (before.match(colorRegex) || []).length;
      changeCount += count;
    }
  }

  return { content: modified, changeCount };
}

// ─── Step 2: Component Pattern Replacements ────────────────────────
// Replaces long multi-class strings with semantic component classes

// Pattern: card container
// bg-white p-6 rounded-xl shadow-sm → card
// Note: We look for the exact pattern in class strings
const COMPONENT_PATTERNS = [
  // Feedback icons
  {
    // feedback-icon ml-2 text-success-600 font-bold text-lg → feedback-icon correct
    find: /feedback-icon\s+ml-2\s+text-success-\d+\s+font-bold\s+text-lg/g,
    replace: 'feedback-icon correct',
    desc: 'feedback-icon correct',
  },
  {
    // feedback-icon ml-2 text-error-600 font-bold text-lg → feedback-icon incorrect
    find: /feedback-icon\s+ml-2\s+text-error-\d+\s+font-bold\s+text-lg/g,
    replace: 'feedback-icon incorrect',
    desc: 'feedback-icon incorrect',
  },
  {
    // feedback-icon ml-2 text-xl → feedback-icon (neutral)
    find: /feedback-icon\s+ml-2\s+text-xl/g,
    replace: 'feedback-icon',
    desc: 'feedback-icon neutral',
  },
  {
    // feedback-icon ml-2 → feedback-icon (base)
    find: /feedback-icon\s+ml-2(?=["'\s`])/g,
    replace: 'feedback-icon',
    desc: 'feedback-icon base',
  },

  // Feedback messages
  {
    // feedback mt-4 font-semibold text-center h-6 text-success-600 → feedback-message correct
    find: /(?:quiz-)?feedback\s+mt-4\s+font-(?:semi)?bold\s+text-center\s+h-\d+\s+text-success-\d+/g,
    replace: 'feedback-message correct',
    desc: 'feedback-message correct',
  },
  {
    find: /(?:quiz-)?feedback\s+mt-4\s+font-(?:semi)?bold\s+text-center\s+h-\d+\s+text-error-\d+/g,
    replace: 'feedback-message incorrect',
    desc: 'feedback-message incorrect',
  },
  {
    find: /(?:quiz-)?feedback\s+mt-4\s+font-(?:semi)?bold\s+text-center\s+h-\d+\s+text-primary-\d+/g,
    replace: 'feedback-message pending',
    desc: 'feedback-message pending',
  },
  {
    find: /(?:quiz-)?feedback\s+mt-4\s+font-(?:semi)?bold\s+text-center\s+h-\d+\s+text-neutral-\d+/g,
    replace: 'feedback-message neutral',
    desc: 'feedback-message neutral',
  },
  {
    // Generic feedback without color
    find: /(?:quiz-)?feedback\s+mt-4\s+font-(?:semi)?bold\s+text-center\s+h-\d+/g,
    replace: 'feedback-message',
    desc: 'feedback-message base',
  },
  {
    find: /(?:quiz-)?feedback\s+mt-4\s+font-(?:semi)?bold\s+text-center(?=["'\s`])/g,
    replace: 'feedback-message',
    desc: 'feedback-message minimal',
  },

  // Exercise select (dilemma)
  {
    find: /dilemma-select\s+px-3\s+py-2\s+border-2\s+border-neutral-300\s+rounded-lg\s+bg-white\s+font-semibold\s+text-neutral-800\s+cursor-pointer\s+hover:border-primary-400\s+focus:border-primary-500\s+focus:outline-none\s+transition-colors/g,
    replace: 'exercise-select',
    desc: 'exercise-select',
  },

  // Clickable word
  {
    find: /clickable-word\s+bg-primary-100\s+hover:bg-primary-200\s+cursor-pointer\s+px-3\s+py-2\s+rounded-lg\s+font-semibold\s+text-primary-800\s+transition-colors/g,
    replace: 'clickable-word',
    desc: 'clickable-word',
  },
];

function replaceComponentPatterns(content) {
  let modified = content;
  let changeCount = 0;

  for (const pattern of COMPONENT_PATTERNS) {
    const before = modified;
    modified = modified.replace(pattern.find, pattern.replace);
    if (modified !== before) {
      const count = (before.match(pattern.find) || []).length;
      changeCount += count;
      if (VERBOSE) {
        console.log(`    → ${pattern.desc}: ${count} replacements`);
      }
    }
  }

  return { content: modified, changeCount };
}

// ─── Step 3: Specific one-off replacements ─────────────────────────
function specificReplacements(content) {
  let modified = content;
  let changeCount = 0;

  // Replace bg-white with bg-surface (but not bg-white/80 etc.)
  const bgWhiteBefore = modified;
  modified = modified.replace(/\bbg-white\b(?!\/)/g, 'bg-surface');
  if (modified !== bgWhiteBefore) {
    changeCount += (bgWhiteBefore.match(/\bbg-white\b(?!\/)/g) || []).length;
  }

  // Replace text-white (keep as-is, it's a standard CSS concept)
  // No change needed — we'll add .text-white to papertek.css

  // Replace bg-black
  const bgBlackBefore = modified;
  modified = modified.replace(/\bbg-black\b/g, 'bg-neutral-900');
  if (modified !== bgBlackBefore) {
    changeCount += (bgBlackBefore.match(/\bbg-black\b/g) || []).length;
  }

  // Replace bg-transparent
  // Keep as-is, will add to papertek.css

  // Replace border-transparent
  // Keep as-is, will add to papertek.css

  // Replace focus:outline-none (already handled by exercise-input/select)
  // Keep for standalone usage, handled in CSS

  return { content: modified, changeCount };
}

// ─── Main ──────────────────────────────────────────────────────────
function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Papertek CSS Migration — Tailwind → Papertek Design System  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no files will be modified\n');
  }

  const files = getAllJsFiles(JS_DIR);
  console.log(`Found ${files.length} files to process\n`);

  let totalChanges = 0;
  let filesModified = 0;
  const report = [];

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, 'utf-8');
    let content = original;
    let fileChanges = 0;

    // Step 1: Rename colors
    const colorResult = renameColors(content);
    content = colorResult.content;
    fileChanges += colorResult.changeCount;

    // Step 2: Component pattern replacements
    const componentResult = replaceComponentPatterns(content);
    content = componentResult.content;
    fileChanges += componentResult.changeCount;

    // Step 3: Specific replacements
    const specificResult = specificReplacements(content);
    content = specificResult.content;
    fileChanges += specificResult.changeCount;

    if (content !== original) {
      filesModified++;
      totalChanges += fileChanges;
      const relPath = path.relative(path.join(__dirname, '..'), filePath);
      report.push({ file: relPath, changes: fileChanges });

      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }

      console.log(`  ✓ ${path.relative(path.join(__dirname, '..'), filePath)} — ${fileChanges} changes`);
    }
  }

  console.log('\n────────────────────────────────────────────');
  console.log(`  Files modified: ${filesModified}/${files.length}`);
  console.log(`  Total changes:  ${totalChanges}`);
  console.log('────────────────────────────────────────────\n');

  if (DRY_RUN) {
    console.log('💡 Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Migration complete! Run your app to verify.');
  }

  // Write report
  const reportPath = path.join(__dirname, '..', 'MIGRATION_REPORT.md');
  const reportContent = [
    '# Tailwind → Papertek CSS Migration Report',
    '',
    `**Date**: ${new Date().toISOString().split('T')[0]}`,
    `**Files Modified**: ${filesModified}/${files.length}`,
    `**Total Changes**: ${totalChanges}`,
    '',
    '## Color Renaming',
    '',
    '| Tailwind | Papertek |',
    '|----------|----------|',
    ...Object.entries(COLOR_MAP).map(([tw, pt]) => `| ${tw} | ${pt} |`),
    '',
    '## Files Changed',
    '',
    '| File | Changes |',
    '|------|---------|',
    ...report.map(r => `| ${r.file} | ${r.changes} |`),
    '',
  ].join('\n');

  if (!DRY_RUN) {
    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`📋 Report written to MIGRATION_REPORT.md`);
  }
}

main();
