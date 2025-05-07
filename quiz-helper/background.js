// background.js  ─── Manifest V3 service‑worker
console.log('[GeminiAutoAnswer] service‑worker alive');

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    console.log('[BG] got message', msg);           //  << add

  if (msg?.action !== 'getAnswer') return;

  const { question, choices, containerId } = msg.payload;
  console.log('[BG] got message', question.slice(0, 60) + '…');

  // ── 1.  get the key
  const apiKey = await new Promise(r =>
    chrome.storage.sync.get('GM_API_KEY', d => r(d.GM_API_KEY))
  );
  console.log('[BG] apiKey is', apiKey ? 'present' : 'missing');
  if (!apiKey) {
    sendResponse({ error: 'no‑api‑key' });
    return true; // keep port open even on error
  }

  // ── 2.  build prompt
  const prompt =
`You are an expert test taker.
Return ONLY the single letter (A, B, C, …) you believe is correct.

${question}

${choices.map(c => `${c.letter}) ${c.text}`).join('\n')}
`;

  // ── 3.  call Gemini
  let letter = null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[BG] fetch failed', res.status, body);
      sendResponse({ error: 'fetch-fail', status: res.status });
      return true;
    }

    const json = await res.json();
    console.log('[BG] gemini raw', json);

    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const m = rawText.match(/[A-D]/i);
    letter = m ? m[0].toUpperCase() : null;
  } catch (e) {
    console.error('[BG] fetch threw', e);
    sendResponse({ error: 'fetch-exception', message: e.message });
    return true;
  }

  // ── 4.  send answer back (or report we couldn’t parse)
  if (letter) {
    console.log('[BG] answerResult', letter);
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'answerResult',
      containerId,
      answerLetter: letter
    });
    sendResponse({ ok: true });
  } else {
    console.warn('[BG] could not extract letter from Gemini output');
    sendResponse({ error: 'no-letter' });
  }

  return true;          // ✅ keep the message port alive
});
