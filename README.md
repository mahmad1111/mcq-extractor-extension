# MCQ Extractor Chrome Extension

This Chrome extension allows you to quickly extract Multiple Choice Questions (MCQs) from any web page, send them to the Google Gemini 2.5 Flash Preview LLM, and display the correct answer in a non-intrusive UI widget.

## Features

- **Selection Mode:** Activate a resizable, draggable selection box to capture content.
- **Content Detection:** Automatically detects if the selected content is text or an image.
- **Text Parsing:** Parses selected text directly into an MCQ format (question + options).
- **Image OCR:** Performs OCR on selected images to extract text, then parses it as an MCQ.
- **LLM Integration:** Sends parsed MCQs to the Google Gemini 2.5 Flash Preview model for answer generation.
- **Answer Display:** Displays the correct answer in a lightweight, native-looking Chrome overlay.
- **Anti-Cheat Conscious:** Designed with minimal and obfuscated code, injecting UIs via content scripts to avoid detection by proctoring scripts.
- **Hotkeys:**
    - `Ctrl + Shift + X`: Toggle selection mode.
    - `Ctrl + Shift + Z`: Clear any active selection box, OCR results, and answer widgets.
- **UI Activation:** Click the extension icon in the Chrome toolbar to open a popup with a "Toggle Selection Mode" button.

## Installation (Load Unpacked Extension)

1.  **Download the Extension:** Copy the entire `mcq-extractor` folder (which contains `manifest.json`, `background.js`, `contentScript.js`, `ui.css`, `popup.html`, `popup.js`, and the `icons` folder) to a location on your computer, for example, directly onto a USB drive or your Desktop.

2.  **Open Chrome Extensions Page:**
    - Open Google Chrome.
    - Type `chrome://extensions` in the address bar and press Enter.

3.  **Enable Developer Mode:**
    - In the top-right corner of the Extensions page, toggle on the "Developer mode" switch.

4.  **Load Unpacked Extension:**
    - Click the "Load unpacked" button that appears on the left side of the page.
    - A file dialog will open. Navigate to the `mcq-extractor` folder you copied in step 1 and select it.

5.  **Verify Installation:**
    - The "MCQ Extractor" extension should now appear on your Extensions page.
    - If there are any errors, they will be displayed. Ensure all files are in the correct locations.

## Usage

1.  **Activate Selection Mode:**
    - Go to any web page where you want to extract an MCQ.
    - **Option 1 (Hotkey):** Press `Ctrl + Shift + X` (or `Command + Shift + X` on Mac).
    - **Option 2 (UI):** Click the MCQ Extractor icon in your Chrome toolbar, then click the "Toggle Selection Mode" button in the popup.
    - A dashed blue selection box will appear on the page.

2.  **Select MCQ Content:**
    - **For Text:** Click and drag your mouse to draw the selection box around the MCQ text (question and options).
    - **For Images:** Draw the selection box around the image containing the MCQ.
    - You can also drag and resize the selection box after drawing it.

3.  **Get Answer:**
    - Release the mouse button after making your selection.
    - The extension will automatically process the content (OCR if it's an image, parse if it's text) and send it to the LLM.
    - The LLM's concise answer will appear in a small, non-intrusive widget at the bottom-right corner of your screen.

4.  **Clear UI:**
    - To clear the selection box and the answer widget at any time, press `Ctrl + Shift + Z` (or `Command + Shift + Z` on Mac).

## Error Handling

- If the LLM API encounters an error or the API key is missing, an error message will be displayed in the answer widget.
- Check the browser's developer console (F12 -> Console tab) for more detailed error messages from the extension's background script or content script.

## Development Notes

- **Google Gemini API Key:** The extension requires a Google Gemini API key to function. You can obtain one from the Google AI Studio: [https://aistudio.google.com/](https://aistudio.google.com/). Once you have your key, open the `background.js` file in the extension folder and replace `"YOUR_GEMINI_API_KEY"` with your actual API key.
- **LLM Integration:** The extension uses the Google Gemini 2.5 Flash Preview model (`gemini-2.5-flash-preview-05-20`). The prompt to the LLM has been refined to request only the concise answer.
- **OCR:** For image-based MCQs, the current implementation includes a placeholder for OCR. For a production-ready version, you would integrate a client-side OCR library (e.g., Tesseract.js) or send the image data to a cloud-based OCR service.
- **UI Injection:** UI elements are injected directly into the DOM via content scripts to minimize the extension's footprint and reduce the likelihood of detection by anti-cheat systems.
- **Permissions:** Only essential permissions (`activeTab`, `storage`, `scripting`) are requested. `clipboardRead` is optional.
- **Icons:** The `icons/` directory contains placeholder images. For a polished extension, replace these with custom 16x16, 48x48, and 128x128 PNG icons.

## Contributing

Contributions are welcome! If you have suggestions for improvements, bug fixes, or new features, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits & Support

This extension was developed by Mital Talhan.

If this extension has been helpful to you, consider supporting its continued development and maintenance. Any contribution is greatly appreciated!

## Screenshots

Here are some screenshots demonstrating the extension's functionality:

### Selection Mode
![Selection Mode](screenshots/SS1.png)

### Answer Display
![Answer Display](screenshots/SS2.png)

### Extension Popup
![Extension Popup](screenshots/SS3.png)

## Disclaimer

This extension is provided for educational and personal use. While it is designed with anti-cheat considerations to minimize detection by common proctoring scripts, no method is foolproof against highly sophisticated monitoring systems. Users are responsible for understanding and complying with the rules and regulations of any online exams or platforms they use. The developers are not responsible for any consequences resulting from the use of this extension.
