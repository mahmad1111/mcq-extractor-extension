// contentScript.js

(function() {
  // Check if the script has already been initialized in this execution context
  // This flag is primarily for logging, the IIFE handles the scoping.
  if (window.mcqExtractorInitialized) {
    console.log("MCQ Extractor content script already initialized in this context. Skipping re-initialization.");
    return; // Exit if already initialized
  }
  window.mcqExtractorInitialized = true;
  console.log("MCQ Extractor content script initializing...");

  // Inject UI elements and handle selection, OCR, parsing, and display

  let selectionBox = null;
  let isSelecting = false;
  let startX, startY;
  let answerWidget = null;

  // Function to create and append the selection box
  function createSelectionBox() {
    // Only create if it doesn't exist in the DOM
    if (document.getElementById('mcq-extractor-selection-box')) {
      selectionBox = document.getElementById('mcq-extractor-selection-box');
      return;
    }

    selectionBox = document.createElement('div');
    selectionBox.id = 'mcq-extractor-selection-box'; // Add an ID for easier lookup
    selectionBox.style.cssText = `
      position: absolute;
      border: 2px dashed #007bff;
      background-color: rgba(0, 123, 255, 0.1);
      z-index: 99999;
      cursor: crosshair;
      display: none; /* Hidden initially */
    `;
    document.body.appendChild(selectionBox);

    // Make the selection box draggable
    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    // This mousedown listener initiates dragging the existing selection box
    selectionBox.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || isSelecting) return; // Only left-click, and not when creating a new selection

        isDragging = true;
        // Calculate offset from the element's top-left corner, accounting for page scroll
        dragOffsetX = e.clientX - selectionBox.getBoundingClientRect().left;
        dragOffsetY = e.clientY - selectionBox.getBoundingClientRect().top;

        selectionBox.style.cursor = 'grabbing';
        e.stopPropagation(); // Prevent the page's mousedown listener from firing

        // Attach listeners to the window to capture events anywhere on the page
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd, { once: true });
    });

    function handleDragMove(e) {
        if (!isDragging) return;
        // Calculate new position based on initial offset and current mouse position
        const newLeft = e.clientX - dragOffsetX + window.scrollX;
        const newTop = e.clientY - dragOffsetY + window.scrollY;
        selectionBox.style.left = newLeft + 'px';
        selectionBox.style.top = newTop + 'px';
    }

    function handleDragEnd() {
        isDragging = false;
        selectionBox.style.cursor = 'grab';
        window.removeEventListener('mousemove', handleDragMove); // Clean up the listener
    }
  }

  // Function to create and append the answer widget
  function createAnswerWidget() {
    // Only create if it doesn't exist in the DOM
    if (document.getElementById('mcq-extractor-answer-widget')) {
      answerWidget = document.getElementById('mcq-extractor-answer-widget');
      return;
    }

    answerWidget = document.createElement('div');
    answerWidget.id = 'mcq-extractor-answer-widget';
    answerWidget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #333;
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 100000;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 14px;
      max-width: 300px;
      display: none; /* Hidden initially */
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    `;
    document.body.appendChild(answerWidget);
  }

  // Initialize UI elements
  createSelectionBox();
  createAnswerWidget();

  // Toggle selection mode
  function toggleSelectionMode() {
    if (selectionBox.style.display === 'none') {
      selectionBox.style.display = 'block';
      document.body.style.cursor = 'crosshair';
      isSelecting = true;
      console.log("Selection mode activated.");
    } else {
      clearUI();
    }
  }

  // Clear UI elements
  function clearUI() {
    if (selectionBox) {
      selectionBox.style.display = 'none';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      selectionBox.style.left = '0px';
      selectionBox.style.top = '0px';
    }
    if (answerWidget) {
      answerWidget.style.opacity = '0';
      setTimeout(() => {
        answerWidget.style.display = 'none';
        answerWidget.innerHTML = '';
      }, 300); // Allow fade-out transition
    }
    document.body.style.cursor = 'default';
    isSelecting = false;
    console.log("UI cleared.");
  }

  // Function to encapsulate the selection processing logic
  async function processSelection() {
    isSelecting = false; // Selection complete
    document.body.style.cursor = 'default';

    const rect = selectionBox.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      clearUI();
      return;
    }

    // Capture content within the selection box
    const selectedContent = await captureContentInBox(rect);
    console.log("Captured content:", selectedContent);

    if (selectedContent) {
      // Send to background script for LLM processing
      chrome.runtime.sendMessage({ action: "sendMCQToLLM", mcqText: selectedContent }, (response) => {
        console.log("Response from background script:", response);
        if (response.success) {
          displayAnswer(response.answer);
        } else {
          displayAnswer(`Error: ${response.error}`);
        }
      });
    } else {
      displayAnswer("No content detected in selection.");
    }
  }

  // This mousedown listener initiates drawing a new selection box
  document.addEventListener('mousedown', (e) => {
    // Only run if in selection mode, with a left-click, and not on the box itself
    if (!isSelecting || e.button !== 0 || e.target.id === 'mcq-extractor-selection-box') {
        return;
    }

    startX = e.clientX + window.scrollX;
    startY = e.clientY + window.scrollY;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';

    // Attach listeners to the window for robust drag-selection
    window.addEventListener('mousemove', handleSelectionResize);
    window.addEventListener('mouseup', handleSelectionEnd, { once: true });
  });

  function handleSelectionResize(e) {
    // This check is important because the listener is on the window.
    // It ensures we only resize when the mouse button is actually pressed.
    if (!isSelecting || e.buttons === 0) {
        // As a fallback, if mouseup is missed (e.g., leaving the window), clean up.
        window.removeEventListener('mousemove', handleSelectionResize);
        window.removeEventListener('mouseup', handleSelectionEnd); // Ensure both are cleaned up
        processSelection(); // Process what we have
        return;
    }

    const currentX = e.clientX + window.scrollX;
    const currentY = e.clientY + window.scrollY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  }

  function handleSelectionEnd() {
    window.removeEventListener('mousemove', handleSelectionResize); // Clean up
    processSelection(); // Finalize the selection
  }

  // Function to capture content (text or image) within the selection box
  async function captureContentInBox(rect) {
    let content = '';
    let isImage = false;

    // Check for text nodes first
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const nodeRect = range.getBoundingClientRect();

      // Check for intersection with selection box
      if (
        nodeRect.left < rect.right &&
        nodeRect.right > rect.left &&
        nodeRect.top < rect.bottom &&
        nodeRect.bottom > rect.top
      ) {
        content += node.textContent + ' ';
      }
    }

    // If no significant text, check for images
    if (content.trim().length < 10) { // Arbitrary threshold for "significant text"
      const images = document.querySelectorAll('img');
      for (const img of images) {
        const imgRect = img.getBoundingClientRect();
        if (
          imgRect.left < rect.right &&
          imgRect.right > rect.left &&
          imgRect.top < rect.bottom &&
          imgRect.bottom > rect.top
        ) {
          // Found an image within the selection. Now, capture it as an image.
          isImage = true;
          content = await captureImageFromElement(img, rect); // Pass rect to crop
          break; // Only capture the first image found for simplicity
        }
      }
    }

    if (isImage) {
      // Perform OCR on the captured image data (base64)
      // This requires an OCR library. For now, we'll simulate or use a placeholder.
      // In a real scenario, you'd integrate Tesseract.js or send to a cloud OCR API.
      console.log("Image detected. Simulating OCR...");
      return `[IMAGE_DATA_FOR_OCR]${content}`; // Placeholder for image data
    } else {
      // Parse text directly into MCQ format (simple heuristic)
      return parseTextAsMCQ(content);
    }
  }

  // Function to capture an image from an element within a specific rect
  async function captureImageFromElement(element, cropRect) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.crossOrigin = 'Anonymous'; // Needed for cross-origin images
      img.src = element.src;

      img.onload = () => {
        // Calculate the intersection of the image and the cropRect
        const imgRect = element.getBoundingClientRect();

        const intersectLeft = Math.max(cropRect.left, imgRect.left);
        const intersectTop = Math.max(cropRect.top, imgRect.top);
        const intersectRight = Math.min(cropRect.right, imgRect.right);
        const intersectBottom = Math.min(cropRect.bottom, imgRect.bottom);

        const intersectWidth = intersectRight - intersectLeft;
        const intersectHeight = intersectBottom - intersectTop;

        if (intersectWidth <= 0 || intersectHeight <= 0) {
          resolve(''); // No intersection
          return;
        }

        // Calculate source coordinates on the original image
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;

        const sx = (intersectLeft - imgRect.left) * scaleX;
        const sy = (intersectTop - imgRect.top) * scaleY;
        const sWidth = intersectWidth * scaleX;
        const sHeight = intersectHeight * scaleY;

        canvas.width = intersectWidth;
        canvas.height = intersectHeight;

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, intersectWidth, intersectHeight);
        resolve(canvas.toDataURL('image/png')); // Returns base64 image data
      };
      img.onerror = () => {
        console.error("Failed to load image for capture:", element.src);
        resolve('');
      };
    });
  }


  // Simple heuristic to parse text as MCQ
  function parseTextAsMCQ(text) {
    // This is a very basic parser. A more robust solution would use NLP.
    // For now, it assumes a question followed by options (A, B, C, D or 1, 2, 3, 4)
    let mcq = {
      question: '',
      options: []
    };

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return '';

    mcq.question = lines[0]; // Assume first line is the question

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Look for common option prefixes
      if (/^[A-D]\.\s|^[1-4]\.\s|^[a-d]\)\s/.test(line)) {
        mcq.options.push(line);
      } else if (mcq.options.length > 0) {
        // If options have started, append subsequent lines to the last option
        // This handles multi-line options
        mcq.options[mcq.options.length - 1] += ' ' + line;
      } else {
        // If no options yet, append to question
        mcq.question += ' ' + line;
      }
    }

    // Format for LLM:
    let formattedMCQ = `Question: ${mcq.question}\n`;
    if (mcq.options.length > 0) {
      formattedMCQ += "Options:\n" + mcq.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n');
    }
    formattedMCQ += "\n\nProvide ONLY the correct answer option (e.g., 'A', 'B', 'C', 'D') or the exact correct answer text (e.g., 'd) Array', '40'). Do NOT provide any reasoning or additional text. If you cannot determine, state 'Uncertain'.";

    return formattedMCQ;
  }


  // Display the answer in the UI widget
  function displayAnswer(answer) {
    console.log("Attempting to display answer:", answer); // Add this log
    if (answerWidget) {
      answerWidget.innerHTML = `<strong>Answer:</strong> ${answer}`;
      answerWidget.style.display = 'block';
      answerWidget.style.opacity = '1';
      console.log("Answer widget displayed."); // Add this log
    } else {
      console.error("Answer widget not found."); // Add this log
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleSelectionMode") {
      toggleSelectionMode();
    } else if (request.action === "clearUI") {
      clearUI();
    }
  });

  // Initial setup for UI elements
  document.addEventListener('DOMContentLoaded', () => {
    createSelectionBox();
    createAnswerWidget();
  });
})(); // Immediately Invoked Function Expression ends here
