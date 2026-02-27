/**
 * i18n Helper for Vocab Trainer Multi
 *
 * This module provides translation support for the vocab trainer components.
 * It can work with multiple i18n systems (webapp i18n or ordtrener i18n).
 *
 * The translation function attempts to:
 * 1. Use ordtrener i18n if available (via window.__ordtrenerI18n)
 * 2. Fall back to hardcoded translations based on detected locale
 */

// Detect current locale from HTML or body attributes
function detectLocale() {
    // Check ordtrener data attribute first
    const uiLang = document.body?.dataset?.uiLanguage;
    if (uiLang) return uiLang;

    // Check HTML lang attribute
    const htmlLang = document.documentElement?.lang;
    if (htmlLang === 'en') return 'en';

    return 'no'; // Default to Norwegian
}

// Translations for vocab trainer components
const TRANSLATIONS = {
    no: {
        // Flashcards
        "fc_card_count": "Kort {{current}} / {{total}}",
        "fc_start_fullscreen": "Start Ordkort (Fullskjerm)",
        "fc_start_review": "Gjennomgå kjente ord (Fullskjerm)",
        "fc_ready_practice": "Klar for å øve?",
        "fc_ready_review": "Klar for å gjennomgå dine {{count}} kjente ord?",
        "fc_native_label": "Norsk",
        "fc_target_label": "Tysk",
        "fc_tap_to_flip": "Trykk for å snu",
        "fc_mastery_btn": "Kan dette svært godt (Fjern fra trening)",
        "fc_correct_now": "✓ Riktig nå",
        "fc_easy": "Enkelt",
        "fc_dont_know": "Kan ikke ennå",
        "fc_hard": "Vanskelig",
        "fc_put_back": "Putt tilbake i læringsbunken",
        "fc_practice_again": "Øv på nytt",
        "fc_next": "Neste",
        "fc_keep_known": "Behold som kjent",
        "fc_mute": "Slå av lyd",
        "fc_unmute": "Slå på lyd",
        "fc_exit_save": "Avslutt og lagre",
        "fc_points": "poeng",
        "fc_session_done": "Økt ferdig!",
        "fc_session_ended": "Økt avsluttet",
        "fc_review_done": "Gjennomgang ferdig!",
        "fc_went_through": "Du gikk gjennom",
        "fc_words": "ord",
        "fc_known_words": "kjente ord",
        "fc_marked_known": "Du markerte {{count}} nye ord som kjent.",
        "fc_put_back_count": "Du la {{count}} ord tilbake i læringsbunken.",
        "fc_back_in_training": "Disse ordene vil nå dukke opp i treningen igjen.",
        "fc_all_still_known": "Alle ordene er fortsatt markert som kjente.",
        "fc_next_session": "Neste økt ({{count}} ord)",
        "fc_remaining": "{{count}} ord gjenstår – fortsett for å øve på flere!",
        "fc_review_known": "Gjennomgå kjente ord ({{count}})",
        "fc_back_to_menu": "Tilbake til menyen",
        "fc_no_known": "Ingen kjente ord",
        "fc_no_known_desc": "Du har ingen kjente ord i disse kapitlene ennå.",
        "fc_no_words_now": "Ingen ord å øve på nå 📅",
        "fc_words_scheduled": "Ordene dine er planlagt for repetisjon senere.",
        "fc_come_back": "Kom tilbake i morgen for å fortsette treningen!",
        "fc_words_waiting_write": "Du har ord som venter på skrivetrening!",
        "fc_continue_write": "Fortsett med Skriv",
        "fc_tip_match_test": "Tips: Du kan spille Kombiner eller ta en test!",
        "fc_view_known": "Se kjente ord ({{count}})",
        "fc_congratulations": "Gratulerer! 🎉",
        "fc_all_known": "Du har markert alle ordene i disse kapitlene som \"kjente\".",
        "fc_reset_info": "Du kan nullstille progresjonen hvis du vil øve på nytt, eller velge andre kapitler.",
        "fc_reset_known": "Nullstill \"kjente ord\" for disse kapitlene",
        "fc_reset_confirm": "Er du sikker?\n\nDette vil gjøre at alle ordene i disse kapitlene dukker opp som \"ukjente\" igjen.",
        "fc_reset_title": "Nullstill kjente ord?",
        "fc_more_chapters_question": "Vil du øve på ordforråd fra flere kapitler?",
        "fc_go_to_ordtrener": "Gå til Ordtrener",

        // Index/Mode selection
        "mode_flashcards": "Ord-kort",
        "mode_combine": "Kombiner",
        "mode_gender": "Substantiv-kjønn",
        "mode_write": "Skriv",
        "mode_verb_test": "Verbtrening",
        "no_words_lessons": "Fant ingen gloser for denne leksjonen.",
        "no_words_chapters": "Fant ingen gloser for de valgte kapitlene.",
        "select_method": "Velg en metode ovenfor for å øve aktivt på ordene.",

        // Training header
        "training": "Trening",

        // Write mode (skriv)
        "wr_title": "Skriv",
        "wr_question": "Spørsmål",
        "wr_no_words_now": "Ingen ord å øve på nå 📅",
        "wr_words_scheduled": "Ordene dine er planlagt for repetisjon senere.",
        "wr_come_back": "Kom tilbake i morgen for å fortsette treningen!",
        "wr_tip_match_test": "Tips: Du kan spille \"Kombiner\" for å øve på alle ord, eller ta en test.",
        "wr_back_to_menu": "Tilbake til menyen",
        "wr_all_known": "Du har markert alle ordene som kjente! Åpne flere kapitler for å få flere ord å øve på.",
        "wr_exit": "Avslutt",
        "wr_native_label": "Norsk",
        "wr_write_in": "Skriv på",
        "wr_noun_hint": " (kun substantivet)",
        "wr_select_gender": "Velg kjønn:",
        "wr_check_answer": "Sjekk svar",
        "wr_report_previous": "📝 Forrige svar burde ha vært godtatt",
        "wr_must_select_gender": "⚠ Du må velge kjønn ({{articles}}) eller skrive {{articles}} foran substantivet!",
        "wr_correct_perfect": "✓ Helt riktig!",
        "wr_correct_typo": "✓ Riktig! (Liten skrivefeil godtatt)",
        "wr_correct_word": "✓ Riktig ord!",
        "wr_wrong_gender": "Men feil kjønn. Riktig:",
        "wr_wrong_word_correct_gender": "✗ Feil ord, men riktig kjønn!",
        "wr_correct_answer": "Riktig:",
        "wr_wrong": "✗ Feil.",
        "wr_correct_answer_was": "Riktig svar:",
        "wr_other_accepted": "Andre godtatte:",
        "wr_well_done": "Godt jobbet!",
        "wr_words_correct": "Ord riktig",
        "wr_gender_correct": "Kjønn riktig",
        "wr_next_session": "Neste økt ({{count}} ord)",
        "wr_words_remaining": "{{count}} ord gjenstår – fortsett for å øve på flere!",
        "wr_start_over": "Start på nytt",
        "wr_try_again": "Prøv igjen",
        "wr_points": "poeng",
        "wr_session_ended": "Økt avsluttet",
        "wr_more_chapters_question": "Vil du øve på ordforråd fra flere kapitler?",
        "wr_go_to_ordtrener": "Gå til Ordtrener",

        // Match mode (kombiner)
        "ma_title": "Kombiner",
        "ma_round": "Runde",
        "ma_of": "av",
        "ma_connect_pairs": "Koble sammen ordpar så fort du kan!",
        "ma_points_so_far": "Poeng hittil:",
        "ma_start_round": "Start runde",
        "ma_points": "Poeng:",
        "ma_all_known": "Du har markert alle ordene som kjente! Fortsett å øve med Ord-kort for å legge til flere ord.",
        "ma_too_few_words": "For få ord tilgjengelig til å spille Kombiner (trenger minst {{count}} ord).",
        "ma_round_complete": "Runde fullført! +{{points}} poeng",
        "ma_game_complete": "Kombiner Fullført!",
        "ma_rounds_completed": "Runder fullført",
        "ma_total_time": "Total tid",
        "ma_play_again": "Spill igjen",
        "ma_back_to_menu": "Tilbake til menyen",
        "ma_error": "En feil oppstod i Kombiner-spillet:",

        // Gender mode (substantiv-kjønn)
        "ge_title": "Substantiv-kjønn",
        "ge_question": "Spørsmål",
        "ge_which_gender": "Hvilket kjønn har dette ordet?",
        "ge_no_nouns": "Ingen substantiv funnet for valgte kapitler.",
        "ge_correct": "Riktig!",
        "ge_wrong": "Feil. Riktig var",
        "ge_complete": "Fullført!",
        "ge_score": "Du fikk {{score}} av {{total}} riktige!",
        "ge_try_again": "Prøv igjen",
        "ge_points": "Poeng:",

        // Test mode
        "te_no_words_title": "Ingen ord funnet",
        "te_no_words_desc": "Fant ingen ord for de valgte kapitlene. Vennligst velg andre kapitler eller sjekk at innholdet er lastet riktig.",
        "te_go_back": "Gå tilbake",
        "te_chapter_test": "Kapitteltest",
        "te_vocab_test": "Ordforrådstest",
        "te_chapter_test_desc": "Svar på opptil 50 ord fra kapittelet. Du må ha minst 80% riktig for å bestå og låse opp neste kapittel.",
        "te_vocab_test_desc": "Test deg selv på {{count}} ord fra de valgte kapitlene!",
        "te_ongoing_found": "Pågående test funnet!",
        "te_question_of": "Du var på spørsmål {{current}} av {{total}}",
        "te_continue_test": "Fortsett test",
        "te_start_new": "Start ny test",
        "te_previous_result": "Forrige testresultat:",
        "te_score": "Poengsum",
        "te_of_words": "av {{count}} ord",
        "te_percent_correct": "Prosent riktig",
        "te_questions_count": "{{correct}}/{{total}} spørsmål",
        "te_gender_accuracy": "Kjønn nøyaktighet",
        "te_nouns_count": "{{correct}}/{{total}} substantiv",
        "te_start_test": "Start test",
        "te_exit_warning_title": "Avslutt test?",
        "te_exit_warning_desc": "Er du sikker på at du vil avslutte? Fremgangen din blir lagret, og du kan fortsette senere.",
        "te_cancel": "Avbryt",
        "te_exit": "Avslutt",
        "te_test_questions": "Test: {{count}} Spørsmål",
        "te_question": "Spørsmål",
        "te_report_previous": "Forrige svar burde ha vært godtatt",
        "te_pause_save": "Pause og lagre",
        "te_mc_what_means": "Flervalg: Hva betyr dette på {{lang}}?",
        "te_correct": "Riktig!",
        "te_wrong_correct_was": "Feil. Riktig svar: {{answer}}",
        "te_translate_to_native": "Oversett fra {{target}} til {{native}}:",
        "te_number_hint": "(du kan skrive svaret med tallet)",
        "te_your_answer": "Ditt svar:",
        "te_check_answer": "Sjekk svar",
        "te_correct_perfect": "Helt riktig!",
        "te_correct_typo": "Riktig! (Liten skrivefeil godtatt)",
        "te_correct_was": "Riktig: {{answer}}",
        "te_other_accepted": "Andre godtatte svar: {{answers}}",
        "te_translate_to_target": "Oversett fra {{native}} til {{target}}:",
        "te_number_hint_write": "(husk å skrive med bokstaver)",
        "te_select_gender": "Velg kjønn:",
        "te_answer_noun_only": "Ditt svar (kun substantivet):",
        "te_must_select_gender": "Du må velge kjønn ({{articles}}) eller skrive {{articles}} foran substantivet!",
        "te_correct_word_wrong_gender": "Riktig ord{{typo}}, men feil kjønn! Riktig: {{article}} {{answer}}",
        "te_wrong_word_correct_gender": "Feil ord, men riktig kjønn! Riktig svar: {{answer}}",
        "te_wrong_correct_answer": "Feil. Riktig svar: {{answer}}",
        "te_chapter_test_complete": "Kapitteltest fullført",
        "te_test_complete": "Test Fullført!",
        "te_passed": "Bestått! 🎉",
        "te_not_passed": "Ikke bestått",
        "te_next_unlocked": "Neste kapittel er nå låst opp.",
        "te_need_80": "Du må ha minst 80% riktig for å låse opp neste kapittel.",
        "te_points": "poeng",
        "te_correct_answers": "Riktige svar",
        "te_of_questions": "{{correct}} av {{total}} spørsmål",
        "te_total_score": "Total poengsum",
        "te_noun_gender_accuracy": "Substantivkjønn nøyaktighet",
        "te_typos_accepted": "{{count}} svar hadde små skrivefeil som ble godtatt",
        "te_words_to_practice": "Du må øve mer på disse ordene:",
        "te_words_marked_known": "Disse var markert som \"kjent\", men du svarte feil. De er nå lagt tilbake i bunken.",
        "te_retake_test": "Ta testen på nytt",
        "te_error_title": "Noe gikk galt",
        "te_error_desc": "Det oppstod en feil ved visning av resultater.",
        "te_fillers": ["ukjent", "vet ikke", "ingen anelse"]
    },
    en: {
        // Flashcards
        "fc_card_count": "Card {{current}} / {{total}}",
        "fc_start_fullscreen": "Start Flashcards (Fullscreen)",
        "fc_start_review": "Review Known Words (Fullscreen)",
        "fc_ready_practice": "Ready to practice?",
        "fc_ready_review": "Ready to review your {{count}} known words?",
        "fc_native_label": "English",
        "fc_target_label": "German",
        "fc_tap_to_flip": "Tap to flip",
        "fc_mastery_btn": "I know this very well (Remove from training)",
        "fc_correct_now": "✓ Got it",
        "fc_easy": "Easy",
        "fc_dont_know": "Don't know yet",
        "fc_hard": "Hard",
        "fc_put_back": "Put back in learning pile",
        "fc_practice_again": "Practice again",
        "fc_next": "Next",
        "fc_keep_known": "Keep as known",
        "fc_mute": "Mute",
        "fc_unmute": "Unmute",
        "fc_exit_save": "Exit and save",
        "fc_points": "points",
        "fc_session_done": "Session complete!",
        "fc_session_ended": "Session ended",
        "fc_review_done": "Review complete!",
        "fc_went_through": "You went through",
        "fc_words": "words",
        "fc_known_words": "known words",
        "fc_marked_known": "You marked {{count}} new words as known.",
        "fc_put_back_count": "You put {{count}} words back in the learning pile.",
        "fc_back_in_training": "These words will now appear in training again.",
        "fc_all_still_known": "All words are still marked as known.",
        "fc_next_session": "Next session ({{count}} words)",
        "fc_remaining": "{{count}} words remaining – keep going!",
        "fc_review_known": "Review known words ({{count}})",
        "fc_back_to_menu": "Back to menu",
        "fc_no_known": "No known words",
        "fc_no_known_desc": "You don't have any known words in these chapters yet.",
        "fc_no_words_now": "No words to practice now 📅",
        "fc_words_scheduled": "Your words are scheduled for review later.",
        "fc_come_back": "Come back tomorrow to continue training!",
        "fc_words_waiting_write": "You have words waiting for writing practice!",
        "fc_continue_write": "Continue with Write",
        "fc_tip_match_test": "Tip: Try Match or take a Test!",
        "fc_view_known": "View known words ({{count}})",
        "fc_congratulations": "Congratulations! 🎉",
        "fc_all_known": "You've marked all words in these chapters as known.",
        "fc_reset_info": "You can reset your progress to practice again, or select different chapters.",
        "fc_reset_known": "Reset known words for these chapters",
        "fc_reset_confirm": "Are you sure?\n\nThis will make all words in these chapters appear as \"unknown\" again.",
        "fc_reset_title": "Reset known words?",
        "fc_more_chapters_question": "Want to practice vocabulary from more chapters?",
        "fc_go_to_ordtrener": "Go to Word Trainer",

        // Index/Mode selection
        "mode_flashcards": "Flashcards",
        "mode_combine": "Match",
        "mode_gender": "Noun Gender",
        "mode_write": "Write",
        "mode_verb_test": "Verb Training",
        "no_words_lessons": "No words found for this lesson.",
        "no_words_chapters": "No words found for the selected chapters.",
        "select_method": "Select a method above to practice the words.",

        // Training header
        "training": "Training",

        // Write mode (skriv)
        "wr_title": "Write",
        "wr_question": "Question",
        "wr_no_words_now": "No words to practice now 📅",
        "wr_words_scheduled": "Your words are scheduled for review later.",
        "wr_come_back": "Come back tomorrow to continue training!",
        "wr_tip_match_test": "Tip: You can play \"Match\" to practice all words, or take a test.",
        "wr_back_to_menu": "Back to menu",
        "wr_all_known": "You've marked all words as known! Open more chapters to get more words to practice.",
        "wr_exit": "Exit",
        "wr_native_label": "English",
        "wr_write_in": "Write in",
        "wr_noun_hint": " (noun only)",
        "wr_select_gender": "Select gender:",
        "wr_check_answer": "Check answer",
        "wr_report_previous": "📝 Previous answer should have been accepted",
        "wr_must_select_gender": "⚠ You must select gender ({{articles}}) or write {{articles}} before the noun!",
        "wr_correct_perfect": "✓ Correct!",
        "wr_correct_typo": "✓ Correct! (Minor typo accepted)",
        "wr_correct_word": "✓ Correct word!",
        "wr_wrong_gender": "But wrong gender. Correct:",
        "wr_wrong_word_correct_gender": "✗ Wrong word, but correct gender!",
        "wr_correct_answer": "Correct:",
        "wr_wrong": "✗ Wrong.",
        "wr_correct_answer_was": "Correct answer:",
        "wr_other_accepted": "Other accepted:",
        "wr_well_done": "Well done!",
        "wr_words_correct": "Words correct",
        "wr_gender_correct": "Gender correct",
        "wr_next_session": "Next session ({{count}} words)",
        "wr_words_remaining": "{{count}} words remaining – keep going!",
        "wr_start_over": "Start over",
        "wr_try_again": "Try again",
        "wr_points": "points",
        "wr_session_ended": "Session ended",
        "wr_more_chapters_question": "Want to practice vocabulary from more chapters?",
        "wr_go_to_ordtrener": "Go to Word Trainer",

        // Match mode (kombiner)
        "ma_title": "Match",
        "ma_round": "Round",
        "ma_of": "of",
        "ma_connect_pairs": "Connect word pairs as fast as you can!",
        "ma_points_so_far": "Points so far:",
        "ma_start_round": "Start round",
        "ma_points": "Points:",
        "ma_all_known": "You've marked all words as known! Continue practicing with Flashcards to add more words.",
        "ma_too_few_words": "Too few words available to play Match (need at least {{count}} words).",
        "ma_round_complete": "Round complete! +{{points}} points",
        "ma_game_complete": "Match Complete!",
        "ma_rounds_completed": "Rounds completed",
        "ma_total_time": "Total time",
        "ma_play_again": "Play again",
        "ma_back_to_menu": "Back to menu",
        "ma_error": "An error occurred in the Match game:",

        // Gender mode (substantiv-kjønn)
        "ge_title": "Noun Gender",
        "ge_question": "Question",
        "ge_which_gender": "What gender is this word?",
        "ge_no_nouns": "No nouns found for selected chapters.",
        "ge_correct": "Correct!",
        "ge_wrong": "Wrong. Correct was",
        "ge_complete": "Complete!",
        "ge_score": "You got {{score}} of {{total}} correct!",
        "ge_try_again": "Try again",
        "ge_points": "Points:",

        // Test mode
        "te_no_words_title": "No words found",
        "te_no_words_desc": "No words found for the selected chapters. Please select different chapters or check that the content is loaded correctly.",
        "te_go_back": "Go back",
        "te_chapter_test": "Chapter Test",
        "te_vocab_test": "Vocabulary Test",
        "te_chapter_test_desc": "Answer up to 50 words from the chapter. You need at least 80% correct to pass and unlock the next chapter.",
        "te_vocab_test_desc": "Test yourself on {{count}} words from the selected chapters!",
        "te_ongoing_found": "Ongoing test found!",
        "te_question_of": "You were on question {{current}} of {{total}}",
        "te_continue_test": "Continue test",
        "te_start_new": "Start new test",
        "te_previous_result": "Previous test result:",
        "te_score": "Score",
        "te_of_words": "of {{count}} words",
        "te_percent_correct": "Percent correct",
        "te_questions_count": "{{correct}}/{{total}} questions",
        "te_gender_accuracy": "Gender accuracy",
        "te_nouns_count": "{{correct}}/{{total}} nouns",
        "te_start_test": "Start test",
        "te_exit_warning_title": "Exit test?",
        "te_exit_warning_desc": "Are you sure you want to exit? Your progress will be saved and you can continue later.",
        "te_cancel": "Cancel",
        "te_exit": "Exit",
        "te_test_questions": "Test: {{count}} Questions",
        "te_question": "Question",
        "te_report_previous": "Previous answer should have been accepted",
        "te_pause_save": "Pause and save",
        "te_mc_what_means": "Multiple choice: What does this mean in {{lang}}?",
        "te_correct": "Correct!",
        "te_wrong_correct_was": "Wrong. Correct answer: {{answer}}",
        "te_translate_to_native": "Translate from {{target}} to {{native}}:",
        "te_number_hint": "(you can write the answer with the number)",
        "te_your_answer": "Your answer:",
        "te_check_answer": "Check answer",
        "te_correct_perfect": "Correct!",
        "te_correct_typo": "Correct! (Minor typo accepted)",
        "te_correct_was": "Correct: {{answer}}",
        "te_other_accepted": "Other accepted answers: {{answers}}",
        "te_translate_to_target": "Translate from {{native}} to {{target}}:",
        "te_number_hint_write": "(remember to write with letters)",
        "te_select_gender": "Select gender:",
        "te_answer_noun_only": "Your answer (noun only):",
        "te_must_select_gender": "You must select gender ({{articles}}) or write {{articles}} before the noun!",
        "te_correct_word_wrong_gender": "Correct word{{typo}}, but wrong gender! Correct: {{article}} {{answer}}",
        "te_wrong_word_correct_gender": "Wrong word, but correct gender! Correct answer: {{answer}}",
        "te_wrong_correct_answer": "Wrong. Correct answer: {{answer}}",
        "te_chapter_test_complete": "Chapter Test Complete",
        "te_test_complete": "Test Complete!",
        "te_passed": "Passed! 🎉",
        "te_not_passed": "Not passed",
        "te_next_unlocked": "Next chapter is now unlocked.",
        "te_need_80": "You need at least 80% correct to unlock the next chapter.",
        "te_points": "points",
        "te_correct_answers": "Correct answers",
        "te_of_questions": "{{correct}} of {{total}} questions",
        "te_total_score": "Total score",
        "te_noun_gender_accuracy": "Noun gender accuracy",
        "te_typos_accepted": "{{count}} answers had minor typos that were accepted",
        "te_words_to_practice": "You need to practice these words more:",
        "te_words_marked_known": "These were marked as \"known\", but you answered wrong. They are now put back in the pile.",
        "te_retake_test": "Retake test",
        "te_error_title": "Something went wrong",
        "te_error_desc": "An error occurred while showing results.",
        "te_fillers": ["unknown", "don't know", "no idea"]
    }
};

/**
 * Get translated string
 * @param {string} key - Translation key
 * @param {object} params - Parameters to replace (e.g., { count: 5, current: 1 })
 * @returns {string} Translated string
 */
export function vt(key, params = {}) {
    const locale = detectLocale();
    const dict = TRANSLATIONS[locale] || TRANSLATIONS['no'];

    let text = dict[key];

    // Fallback to English if not found
    if (!text && locale !== 'en') {
        text = TRANSLATIONS['en'][key];
    }

    // Final fallback to key
    if (!text) {
        console.warn(`[vt] Missing translation: ${key}`);
        return key;
    }

    // Replace parameters
    if (params && typeof params === 'object') {
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        });
    }

    return text;
}

/**
 * Get current locale
 * @returns {string} Current locale ('no' or 'en')
 */
export function getVTLocale() {
    return detectLocale();
}

/**
 * Get the native language label based on UI language
 * Norwegian UI → "Norsk", English UI → "English"
 */
export function getNativeLabel() {
    return detectLocale() === 'en' ? 'English' : 'Norsk';
}

/**
 * Get the target language label based on portal language
 * @param {string} targetLang - Target language ('german', 'spanish')
 */
export function getTargetLabel(targetLang = 'german') {
    const locale = detectLocale();
    const labels = {
        german: locale === 'en' ? 'German' : 'Tysk',
        tysk: locale === 'en' ? 'German' : 'Tysk',       // Norwegian key alias
        spanish: locale === 'en' ? 'Spanish' : 'Spansk',
        spansk: locale === 'en' ? 'Spanish' : 'Spansk'   // Norwegian key alias
    };
    return labels[targetLang] || targetLang;
}

/**
 * Get the translation language code for word banks
 * Maps UI locale to word bank translation key
 * @returns {string} Language code ('nb' or 'en')
 */
export function getTranslationLangCode() {
    const locale = detectLocale();
    // Map UI locale to wordbank translation key
    // 'no' UI locale → 'nb' translations (Norwegian Bokmål)
    // 'en' UI locale → 'en' translations (English)
    return locale === 'en' ? 'en' : 'nb';
}
