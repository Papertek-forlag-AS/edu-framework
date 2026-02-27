# Vocab Trainer Multi - Documentation

## Overview

The `vocab-trainer-multi` module is a comprehensive vocabulary training system for the Tysk08 German language learning application. It provides three distinct learning modes with fullscreen support, progress tracking, and cloud synchronization.

## Architecture

### Module Structure

```
vocab-trainer-multi/
├── write.js         # Writing exercise mode (Skriv)
├── flashcards.js    # Flashcard review mode (Ord-kort)
├── test.js          # 50-question test mode (Test)
├── utils.js         # Shared utility functions
└── README.md        # This file
```

### Design Principles

1. **Container-based Rendering**: Each mode renders into a provided container element
2. **Fullscreen-first**: All modes support native and fallback fullscreen
3. **Context-driven**: Configuration passed via context object
4. **State Isolation**: Each mode manages its own state
5. **Progressive Enhancement**: Works offline, better with authentication

## Modes

### 1. Write Mode (Skriv)

**File**: `write.js`

**Purpose**: Practice translating from Norwegian to German with written input

**Features**:
- Word-by-word translation practice
- Automatic gender selection for nouns
- Typed article support (students can type "der Rock" instead of clicking)
- Typo tolerance
- Real-time feedback
- Progress tracking
- Answer reporting for incorrect answers

**Flow**:
1. Display Norwegian word
2. Student writes German translation
3. For nouns: select or type article (der/die/das)
4. Auto-advance after feedback (1.5-2 seconds)
5. Completion screen with statistics

**State Variables**:
```javascript
currentIndex         // Current question index
score                // Correct answers count
genderAnswers        // Array of gender correctness
lastWrongAnswer      // Data for answer reporting
```

### 2. Flashcard Mode (Ord-kort)

**File**: `flashcards.js`

**Purpose**: Spaced repetition flashcard review with audio

**Features**:
- Card flipping animation
- Audio pronunciation (fallback chain)
- 2-second delay after flip (prevents accidental clicks)
- Two modes: Normal (mark known) and Review (unmark known)
- Mute/unmute toggle
- Session-based progress
- Fullscreen-optimized UI

**Flow**:
1. Show Norwegian word (front)
2. Click to flip → show German word (back) + play audio
3. Wait 2 seconds (timer visualization)
4. Choose action:
   - Normal mode: "Denne kan jeg!" or "Neste"
   - Review mode: "Fjern fra kjente ord" or "Behold som kjent"
5. Auto-advance to next card
6. Completion summary

**Audio System**:
```javascript
// Priority order for audio files:
1. Explicit audio field: word.audio
2. Type-based prefix: verb_*, substantiv_*, adjektiv_*, etc.
3. Generic prefix: ord_*
4. No prefix: {word}.mp3
5. Legacy folder: audiofiles/{word}.mp3
```

**State Variables**:
```javascript
currentIndex         // Current card index
isFlipped            // Card flip state
hasFlipped           // Has user flipped this card?
canProceed           // Has 2-second delay passed?
sessionKnownWords    // Words marked in this session
sessionRemovedWords  // Words unmarked in this session
isAudioMuted         // Persistent mute state
```

### 3. Test Mode (Test)

**File**: `test.js`

**Purpose**: Comprehensive 50-question assessment

**Features**:
- 50 questions across 3 types
- Pause/resume functionality
- Progress saving to localStorage
- Chapter validation (prevents mixing different chapter sets)
- Detailed result statistics
- Forgotten words tracking
- Answer reporting

**Question Types**:
1. **Multiple Choice** (10 questions): German → Norwegian
2. **German to Norwegian** (10 questions): Translation input
3. **Norwegian to German** (30 questions): Translation + gender for nouns

**Question Distribution**:
```javascript
// Generated from vocabulary pool:
- 10 Multiple Choice (verbs + regular words)
- 10 German → Norwegian (all types)
- 30 Norwegian → German (20 nouns, 10 verbs/words)
```

**State Variables**:
```javascript
currentQuestionIndex  // Current question (0-49)
answers               // Array of answer results
genderAnswers         // Array of gender results (nouns only)
questions             // Generated question array
forgottenWords        // Set of known words that were incorrect
```

**Save/Resume System**:
```javascript
// Saved to localStorage on pause/exit:
{
  currentQuestionIndex: number,
  answers: Array,
  genderAnswers: Array,
  chapters: Set,
  totalVocab: number
}
```

## Common Features

### Fullscreen Management

All modes implement a consistent fullscreen pattern:

```javascript
// Three fullscreen states:
1. Native fullscreen (requestFullscreen API)
2. Fake fullscreen (CSS-based)
3. Exit fullscreen

// Listeners:
- fullscreenchange events
- ESC key for fake fullscreen
- Exit button in UI
```

### Gender Handling (Nouns)

**Data Structure**:
```javascript
// Vocabulary data has two possible fields:
{
  artikel: "der" | "die" | "das",  // Direct article
  genus: "m" | "f" | "n"            // Gender code
}

// Helper function converts genus to article:
genusToArticle(genus) {
  if (genus === 'm') return 'der';
  if (genus === 'f') return 'die';
  if (genus === 'n') return 'das';
  return null;
}
```

**User Input Options**:
1. Click gender buttons (der/die/das)
2. Type article before word: "der Rock"

**Detection Pattern**:
```javascript
const articleMatch = userAnswer.match(/^(der|die|das)\s+/i);
if (articleMatch) {
  typedArticle = articleMatch[1].toLowerCase();
  userAnswer = userAnswer.substring(articleMatch[0].length).trim();
}
const userGender = typedArticle || selectedGender;
```

### Answer Validation

**Utility**: `utils.js` - `isAnswerCorrect()`

**Parameters**:
```javascript
isAnswerCorrect(
  userAnswer,      // Student's input
  correctAnswer,   // Expected answer
  isVerb,          // Enable verb conjugation tolerance
  isNoun,          // Enable noun-specific rules
  allowNumbers,    // Accept numeric input for number words
  synonyms         // Array of accepted alternatives
)
```

**Returns**:
```javascript
{
  correct: boolean,   // Is answer acceptable?
  partial: boolean    // Was typo tolerance applied?
}
```

**Tolerance Rules**:
1. Case-insensitive comparison
2. Levenshtein distance ≤ 1 (typos)
3. Synonym matching
4. Number/word equivalence (e.g., "7" ↔ "sieben")

### Answer Reporting System

**Purpose**: Allow students to report incorrect grading

**Trigger**: Wrong answer in write.js or test.js

**Flow**:
1. Student gets answer wrong
2. Answer data stored in `lastWrongAnswer`
3. On next question: "📝 Forrige svar burde ha vært godtatt" button appears
4. Click button → modal opens with:
   - Answer details (question, user answer, correct answer)
   - Gender info (for nouns)
   - Required student comment field
   - Login status warning (if not authenticated)
5. Report saved to localStorage
6. Auto-sync to Firestore every 5 minutes (if logged in)

**Report Data Structure**:
```javascript
{
  timestamp: number,
  lessonId: string,
  exerciseType: 'skriv' | 'test',
  questionType: string,
  prompt: string,
  userAnswer: string,
  correctAnswer: string,
  userGender?: string,
  correctGender?: string,
  wordType?: string,
  existingSynonyms: Array,
  studentComment: string,
  isNoun: boolean,
  isVerb: boolean,
  userAgent: string,
  url: string
}
```

**Storage**:
- **localStorage**: `answer-reports` key (array)
- **Firestore User Subcollection**: `user_data/{userId}/answer_reports/{reportId}`
- **Firestore Global Collection**: `all_answer_reports/{reportId}` (for admin access)
- **Sync**: Handled by `cloud-sync.js` every 300 seconds (dual write to both Firestore locations)
- **Admin Panel**: `/admin/reports.html` - View and manage all reports

### Progress Tracking

**Integration**: `public/js/progress/index.js`

**Functions Used**:
```javascript
loadData(key)          // Load from localStorage
saveData(key, value)   // Save to localStorage
logVocabTestResult()   // Log test completion
```

**Known Words Management**:
```javascript
// Loaded from context:
context.knownWords      // Set of known German words
context.saveKnownWords  // Function to persist changes

// Flashcards modify this set:
sessionKnownWords.add(word)     // Mark as known
sessionRemovedWords.add(word)   // Unmark as known
```

## Context Object

All modes receive a standardized context object:

```javascript
{
  vocabulary: Array,           // Word objects to practice
  knownWords: Set,             // Set of known German words
  saveKnownWords: Function,    // Persist known words
  lessonId?: string,           // Optional lesson identifier
  chapters?: Set,              // Chapter numbers (for tests)
  onExit?: Function,           // Callback on exit
  savedState?: Object          // Resume state (test only)
}
```

## Vocabulary Data Structure

```javascript
{
  native: string,              // Norwegian word
  target: string,              // German word (with article for nouns)
  targetRaw?: string,          // German word without article
  type: string,                // 'verb', 'substantiv', 'adjektiv', etc.
  artikel?: string,            // 'der', 'die', 'das' (nouns)
  genus?: string,              // 'm', 'f', 'n' (alternative to artikel)
  synonymer?: Array,           // Accepted synonyms
  synonym_forklaringer?: Object, // Explanations for synonyms
  audio?: string               // Explicit audio filename
}
```

## Integration Points

### 1. Lesson Pages

Modes are loaded dynamically on lesson pages:

```javascript
import { renderSkriv } from './vocab-trainer-multi/write.js';

renderSkriv(containerElement, {
  vocabulary: lessonVocabulary,
  knownWords: knownWordsSet,
  saveKnownWords: saveFunction,
  lessonId: '1-2'
});
```

### 2. Cloud Sync

Reports are automatically synced via `cloud-sync.js`:

```javascript
// Auto-sync every 5 minutes
import { syncAnswerReports } from './sync/cloud-sync.js';

// Called by auto-sync routine
await syncAnswerReports();
```

### 3. Authentication

Login state affects answer reporting:

```javascript
import { isAuthAvailable, getCurrentUser } from './auth/firebase-client.js';

const isLoggedIn = isAuthAvailable() && getCurrentUser() !== null;

// Non-logged-in users:
// - Reports save to localStorage only
// - Warning message displayed
// - No cloud sync
```

## Development Guidelines

### Adding a New Exercise Type

1. Create new file in `vocab-trainer-multi/`
2. Export main render function: `export function renderNewMode(container, context)`
3. Implement fullscreen pattern (see existing modes)
4. Handle context data (vocabulary, knownWords, etc.)
5. Add progress tracking
6. Support answer reporting (if applicable)
7. Clean up on exit

### Modifying Vocabulary Structure

If adding new fields to vocabulary objects:

1. Update loader in `vocab-loader.js`
2. Update `Vocabulary Data Structure` in this doc
3. Update relevant modes to handle new field
4. Test with existing lessons

### Modifying Answer Validation

Changes to `utils.js` → `isAnswerCorrect()` affect all modes:

1. Test thoroughly in all three modes
2. Consider backward compatibility
3. Update documentation
4. Consider impact on existing student progress

### Fullscreen Best Practices

```javascript
// Always use this pattern:
const container = /* provided container */;

// Enter fullscreen
enterFullscreen(); // Native API
applyFakeFullscreen(); // CSS fallback

// Exit fullscreen
exitFullscreen(); // Both native and fake

// Event listeners
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('keydown', onKeyDown); // ESC for fake

// Cleanup on exit
document.removeEventListener('fullscreenchange', onFullscreenChange);
```

### Modal in Fullscreen

When showing modals from fullscreen mode:

```javascript
// Pass container to ensure modal appears inside fullscreen
showReportModal(answerData, container);

// Modal will append to container instead of document.body
```

## Testing Checklist

### Write Mode
- [ ] Nouns: gender buttons work
- [ ] Nouns: typed articles work (der Rock)
- [ ] Verbs: conjugation tolerance
- [ ] Regular words: typo tolerance
- [ ] Synonyms accepted
- [ ] Progress tracking works
- [ ] Answer reporting works
- [ ] Fullscreen enter/exit
- [ ] Completion statistics accurate

### Flashcard Mode
- [ ] Card flips
- [ ] Audio plays (if unmuted)
- [ ] 2-second delay enforced
- [ ] Mute toggle persists
- [ ] Normal mode: marks words as known
- [ ] Review mode: unmarks words
- [ ] Session summary accurate
- [ ] Fullscreen works
- [ ] Exit saves progress

### Test Mode
- [ ] 50 questions generated correctly
- [ ] Question distribution (10/10/30)
- [ ] Multiple choice validation
- [ ] German→Norwegian input
- [ ] Norwegian→German with gender
- [ ] Pause/resume works
- [ ] Chapter validation prevents mixing
- [ ] Results statistics accurate
- [ ] Forgotten words tracked
- [ ] Answer reporting works

### Answer Reporting
- [ ] Button appears after wrong answer
- [ ] Modal shows in fullscreen
- [ ] Login warning shows (non-authenticated)
- [ ] Required comment enforced
- [ ] Report saves to localStorage
- [ ] Report syncs to Firestore (authenticated)
- [ ] Button hides after reporting

## Performance Considerations

### Memory Management

```javascript
// Always clean up event listeners on exit
document.removeEventListener('fullscreenchange', handler);
document.removeEventListener('keydown', handler);

// Clear large data structures
vocabulary = null;
questions = null;
```

### Fullscreen Optimization

```javascript
// Minimize DOM updates in fullscreen
// Use CSS transforms for animations
// Avoid layout thrashing

// Good:
element.style.transform = 'scale(1.1)';

// Avoid:
element.style.width = '100px'; // triggers layout
```

### Audio Optimization

```javascript
// Flashcards: Create audio in click handler for autoplay policy
card.addEventListener('click', () => {
  const audio = new Audio(path);
  audio.play(); // Must be in synchronous block
});
```

## Troubleshooting

### "Gender undefined" Issue

**Cause**: Vocabulary has `genus` field but code checks `artikel`

**Fix**: Use helper function
```javascript
const correctArticle = word.artikel || genusToArticle(word.genus);
```

### Modal Not Showing in Fullscreen

**Cause**: Modal appended to `document.body` instead of fullscreen container

**Fix**: Pass container to modal
```javascript
showReportModal(answerData, container);
```

### Test Resume Not Working

**Cause**: Chapter validation failing or invalid saved state

**Fix**: Check console for validation messages
```javascript
if (currentChapters !== savedChapters) {
  console.log('Chapter mismatch, ignoring saved progress');
}
```

### Audio Not Playing

**Cause**: Browser autoplay policy or incorrect file paths

**Fix**:
1. Ensure audio created in user interaction
2. Check audio file exists
3. Verify fallback chain

## Version History

- **v1.0** (Initial): Basic write, flashcard, test modes
- **v1.1**: Added answer reporting system
- **v1.2**: Added typed article support
- **v1.3**: Added fullscreen modal support
- **v1.4**: Added typo info display for partial matches

## Related Documentation

- [Production Checklist](../../../production_checklist.md)
- [CLAUDE.md](../../../CLAUDE.md)
- [Cloud Sync Documentation](../sync/README.md) *(if exists)*
- [Progress System](../progress/README.md) *(if exists)*

## Support

For issues or questions:
1. Check this documentation
2. Review related code files
3. Check browser console for errors
4. Test in different browsers
5. Verify vocabulary data structure
