// background.js (service worker)
console.log("MCQ Extractor Service Worker starting..."); // Added for debugging

// Store the Google API key here. Replace "YOUR_GEMINI_API_KEY" with your actual key.
// You can obtain one from Google AI Studio: https://aistudio.google.com/
const GOOGLE_API_KEY = "AIzaSyB0ZLgAHV6Hd0pR8ODkJnEsODGk5Zx5Kkg";

chrome.runtime.onInstalled.addListener(() => {
  console.log("MCQ Extractor installed. Please update GOOGLE_API_KEY in background.js with your key.");
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      try {
        // Inject content script programmatically to ensure it's loaded
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['contentScript.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tabs[0].id },
          files: ['ui.css']
        });
        console.log("Content script and CSS injected via scripting API.");

        if (command === "toggle-selection-mode") {
          chrome.tabs.sendMessage(tabs[0].id, { action: "toggleSelectionMode" });
        } else if (command === "clear-ui") {
          chrome.tabs.sendMessage(tabs[0].id, { action: "clearUI" });
        }
      } catch (e) {
        console.error("Failed to inject content script or send message:", e);
      }
    }
  });
});

// Listener for messages from content script (e.g., to send MCQ to LLM)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendMCQToLLM") {
    chrome.storage.local.get("googleApiKey", async (data) => {
      const apiKey = data.googleApiKey;
      if (!apiKey) {
        console.error("Google API Key not found in storage.");
        sendResponse({ success: false, error: "API Key not found." });
        return;
      }

      try {
        console.log("Sending MCQ to LLM:", request.mcqText.substring(0, 200) + "..."); // Log part of the MCQ text
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: request.mcqText }] }],
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("LLM API response not OK:", response.status, errorData); // More detailed error log
          throw new Error(`LLM API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        console.log("LLM Response (full):", result); // Log full LLM response

        // Extract the correct answer from the LLM response
        const llmAnswer = result.candidates[0]?.content?.parts[0]?.text || "No answer found.";
        console.log("Extracted LLM Answer:", llmAnswer); // Log extracted answer
        sendResponse({ success: true, answer: llmAnswer });

      } catch (error) {
        console.error("Error during LLM fetch operation:", error); // More generic error log for fetch issues
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});
