const keyBox   = document.getElementById('key');
const sumBox   = document.getElementById('summary');
const msg      = document.getElementById('msg');

chrome.storage.sync.get('GM_API_KEY', d => {
if (d.GM_API_KEY) keyBox.value = d.GM_API_KEY;
});
    chrome.storage.local.get('BOOK_SUMMARY', d => {
      if (d.BOOK_SUMMARY) sumBox.value = d.BOOK_SUMMARY;
});

/* ------- save both fields with one click ------- */
document.getElementById('save').addEventListener('click', () => {
      chrome.storage.sync.set({ GM_API_KEY: keyBox.value.trim() });
      chrome.storage.local.set({ BOOK_SUMMARY: sumBox.value.trim() }, () => {
      msg.textContent = 'Saved ✓';
      setTimeout(() => (msg.textContent = ''), 2000);
    }
  );
});
