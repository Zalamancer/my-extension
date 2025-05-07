const apiKey = "YOUR_GEMINI_API_KEY";  // Use your actual API key
const quizElement = document.querySelector(".quiz-question"); // adjust selector

if (quizElement) {
  const question = quizElement.innerText;

  fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Answer this quiz question: ${question}` }] }]
    })
  })
  .then(response => response.json())
  .then(data => {
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No answer";
    alert("Gemini Answer: " + answer);  // You can inject it into the page instead
  })
  .catch(err => console.error("Gemini API Error:", err));
}
