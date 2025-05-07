(() => {
    const QUESTION_DIV   = '[class*="takeQuestionDiv"]';   // works even when the LMS adds a space
    const QUESTION_TEXT = '.legend-visible';
    const CHOICE_ROWS   = '.multiple-choice-table tr';
  
    console.log('[GeminiAutoAnswer] selector working, found',
        document.querySelectorAll(QUESTION_DIV).length, 'questions');

    const norm = t => t.replace(/\s+/g, ' ').trim();
  
    /** Scrape once */
    function scan() {
      document.querySelectorAll(QUESTION_DIV).forEach(div => {
        const q = norm(div.querySelector(QUESTION_TEXT)?.innerText || '');
        const rows = [...div.querySelectorAll(CHOICE_ROWS)];
        if (!q || rows.length === 0 || div.dataset.scanned) return; // skip if done
        div.dataset.scanned = 'yes';
  
        const choices = rows.map((row, i) => {
          const label = row.querySelector('label');
          const radio = row.querySelector('input[type="radio"]');
          return {
            letter: String.fromCharCode(65 + i),
            text: norm(label?.innerText || ''),
            radioSelector: `#${radio.id}`
          };
        });


        console.log('[GeminiAutoAnswer] sending to BG →', {question: q, choices});

        chrome.runtime.sendMessage({
          action: 'getAnswer',
          payload: { containerId: div.id, question: q, choices }
        });
      });
    }
  
    /** Tick radio when background replies */
    chrome.runtime.onMessage.addListener(msg => {
      if (msg?.action !== 'answerResult') return;
      const { containerId, answerLetter } = msg;
      const idx = answerLetter.charCodeAt(0) - 65;
      const row = document
        .getElementById(containerId)
        ?.querySelectorAll(CHOICE_ROWS)[idx];
      const radio = row?.querySelector('input[type="radio"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
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
  