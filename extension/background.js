// background.js – Manifest V3 service‑worker
console.log('[GeminiAutoAnswer] service‑worker alive');

async function countTokens(apiKey, modelName, promptText) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:countTokens?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents:[{ parts:[{ text: promptText }] }] })
      }
    );
    if (!resp.ok) return null;
    const j = await resp.json();
    return j.totalTokens;                // integer
  }

  
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg?.action !== 'getAnswer') return;

  const { question, choices, containerId, isMultiple } = msg.payload;
  console.log('[BG] got message', question.slice(0, 60) + '…');

  /* ---- API key -------------------------------------------------- */
  const apiKey      = (await chrome.storage.sync.get('GM_API_KEY')).GM_API_KEY;
  const bookSummary = (await chrome.storage.local.get('BOOK_SUMMARY')).BOOK_SUMMARY || '';

  if (!apiKey) {
    console.warn('[BG] no API key');
    sendResponse({ error: 'no-api-key' });
    return true;
  }

  /* ---- build prompt -------------------------------------------- */
  const prompt = `${bookSummary}

You are an expert test taker.
Return ONLY the letter(s) you believe are correct.
If more than one, separate them with commas or spaces (e.g. "A,C" or "B D").

${question}

${choices.map(c => `${c.letter}) ${c.text}`).join('\n')}
`;

const model = 'gemini-1.5-flash';

const promptTokens = await countTokens(apiKey, model, prompt)
                         .catch(() => null);

if (promptTokens !== null)
  console.log('[BG] prompt tokens =', promptTokens);


  /* ---- call Gemini --------------------------------------------- */
  let letters = [];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
        contents:[{ parts:[{ text: prompt }] }],
        })
      }
    );

    if (!res.ok) {
      console.error('[BG] fetch failed', res.status);
      sendResponse({ error:'fetch', status:res.status });
      return true;
    }

    const json     = await res.json();
    if (json.usageMetadata) {
          console.log(
            `[BG] tokens prompt=${json.usageMetadata.promptTokenCount}  ` +
            `answer=${json.usageMetadata.candidatesTokenCount}`
          );
        }
    const rawText  = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    letters        = [...new Set((rawText.match(/[A-Z]/gi) || [])
                                 .map(x => x.toUpperCase()))];
  } catch (e) {
    console.error('[BG] fetch threw', e);
    sendResponse({ error:'exception', msg:e.message });
    return true;
  }

  /* ---- send result back ---------------------------------------- */
  if (letters.length) {
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'answerResult',
      containerId,
      answerLetters: letters
    });
    sendResponse({ ok:true });
  } else {
    console.warn('[BG] could not extract letter(s) from Gemini output');
    sendResponse({ error:'no-letter' });
  }

  return true;  // keep port alive
});
