(() => {
    const QUESTION_DIV   = '[class*="takeQuestionDiv"]';   // works even when the LMS adds a space
    const QUESTION_TEXT = '.legend-visible';
    const CHOICE_ROWS = `
        .multiple-choice-table tr,
        .multiple-answer-table tr,
        .true-false-table tr,
        p          
    `;
    const CHOICE_INPUTS = 'input[type="radio"], input[type="checkbox"]';


    console.log('[GeminiAutoAnswer] selector working, found',
        document.querySelectorAll(QUESTION_DIV).length, 'questions');

    const norm = t => t.replace(/\s+/g, ' ').trim();
  
    function scan() {
        document.querySelectorAll(QUESTION_DIV).forEach(div => {
          /* 1. collect all radio / checkbox inputs */
          const inputs = Array.from(
            div.querySelectorAll('input[type="radio"], input[type="checkbox"]')
          );
          if (inputs.length === 0 || div.dataset.scanned) return;
          div.dataset.scanned = 'yes';
      
          /* 2. build choices */
          const choices = inputs.map((input, i) => {
            const label = div.querySelector(`label[for="${input.id}"]`);
            return {
              letter: String.fromCharCode(65 + i),
              text: norm(label?.innerText || ''),
              selector: `#${input.id}`
            };
          });
      
          /* 3. send to background */
          const questionText = norm(
            div.querySelector(QUESTION_TEXT)?.innerText || ''
          );
      
          chrome.runtime.sendMessage({
            action: 'getAnswer',
            payload: {
              containerId: div.id,
              question: questionText,
              choices,
              isMultiple: inputs[0].type === 'checkbox'
            }
          });
        });
      }
      
      
  
    /** Tick radio when background replies */
/* ------------------------------------------------------------------ */
/*  answerResult handler – ticks every letter the BG returns          */
/* ------------------------------------------------------------------ */
chrome.runtime.onMessage.addListener(msg => {
    if (msg?.action !== 'answerResult') return;
  
    const { containerId, answerLetters } = msg;
    const questionDiv = document.getElementById(containerId);
    if (!questionDiv) return;
  
    answerLetters.forEach(ltr => {
      const index = ltr.charCodeAt(0) - 65;           // A→0, B→1, …
      /* find the N‑th input (radio OR checkbox) inside this question */
      const input = questionDiv.querySelectorAll(
        'input[type="radio"], input[type="checkbox"]'
      )[index];
  
      if (input && !input.checked) {
        input.checked = true;
        /* Blackboard listens for 'change' to enable Save Answer */
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  

    // Run once after load, then watch for dynamically added questions
    window.addEventListener('load', () => {
      scan();
      new MutationObserver(scan).observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  
    // Helper so you can type runQuestionsScraper() in DevTools
    window.runQuestionsScraper = scan;
  })();
