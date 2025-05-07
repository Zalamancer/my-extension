const keyBox = document.getElementById('key');
const msg    = document.getElementById('msg');

chrome.storage.sync.get('GM_API_KEY', data => {
  if (data.GM_API_KEY) keyBox.value = data.GM_API_KEY;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({ GM_API_KEY: keyBox.value.trim() }, () => {
    msg.textContent = 'Saved!';
    setTimeout(() => (msg.textContent = ''), 2000);
  });
});

