import { getProgressData, EXERCISE_DATABASE } from '../progress/index.js';
import { showStarWarningModal } from '../ui.js';

/**
 * Unified reset handler with star warning modal for all exercise types.
 * @param {string} containerId
 * @param {Function} performReset
 * @param {boolean|null} wasCompleted
 */
export function handleReset(containerId, performReset, wasCompleted = null) {
  const progress = getProgressData();
  const lessonId = document.body.dataset.chapterId;
  const lessonProgress = progress[lessonId] || { exercises: {} };

  if (wasCompleted === null) {
    wasCompleted = lessonProgress.exercises[containerId] === true;
  }

  console.log('🔄 handleReset called:', {
    containerId,
    lessonId,
    wasCompleted,
    allCompletedExercises: lessonProgress.exercises
  });

  let willRemoveStar = false;
  let willRemovePencil = false;

  // Sjekk om vi fjerner stjerne (ekstraøvelser)
  if (containerId.includes('ekstraovelse') && wasCompleted) {
    const requiredExtra = EXERCISE_DATABASE[lessonId]?.ekstraovelser || 0;
    // Count exercises that are explicitly TRUE (not just keys)
    const completedExtraCount = Object.entries(lessonProgress.exercises)
      .filter(([id, completed]) => completed === true && id.includes('ekstraovelse'))
      .length;

    console.log('⭐ Checking star removal:', {
      requiredExtra,
      completedExtraCount,
      willRemove: completedExtraCount === requiredExtra && requiredExtra > 0
    });

    if (completedExtraCount === requiredExtra && requiredExtra > 0) {
      willRemoveStar = true;
    }
  }

  // Sjekk om vi fjerner blyant (vanlige øvelser)
  if (!containerId.includes('ekstraovelse') && wasCompleted) {
    const requiredRegular = EXERCISE_DATABASE[lessonId]?.ovelser || 0;
    // Count exercises that are explicitly TRUE (not just keys)
    const completedRegularCount = Object.entries(lessonProgress.exercises)
      .filter(([id, completed]) => completed === true && !id.includes('ekstraovelse'))
      .length;

    console.log('✏️ Checking pencil removal:', {
      requiredRegular,
      completedRegularCount,
      willRemove: completedRegularCount === requiredRegular && requiredRegular > 0
    });

    if (completedRegularCount === requiredRegular && requiredRegular > 0) {
      willRemovePencil = true;
    }
  }

  if (willRemoveStar) {
    console.log('⚠️ Showing star warning modal');
    showStarWarningModal(
      'Å starte denne øvelsen på nytt vil fjerne stjerne-ikonet for denne leksjonen. Er du sikker på at du vil fortsette?',
      performReset,
      () => {}
    );
  } else if (willRemovePencil) {
    console.log('⚠️ Showing pencil warning modal');
    showStarWarningModal(
      'Å starte denne øvelsen på nytt vil fjerne blyant-ikonet for denne leksjonen. Er du sikker på at du vil fortsette?',
      performReset,
      () => {}
    );
  } else {
    console.log('✅ No warning needed, performing reset directly');
    performReset();
  }
}
