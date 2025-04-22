// DOM elements
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUpload = document.querySelector(".file-upload");
const fileCancel = document.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggle");
const closeChatbot = document.querySelector("#close");

// Camera elements
const cameraContainer = document.getElementById("camera-container");
const cameraStream = document.getElementById("camera-stream");
const captureBtn = document.getElementById("capture-photo");
const closeCameraBtn = document.getElementById("close-camera");
const canvas = document.getElementById("capture-canvas");
const cameraButton = document.querySelector(".material-symbols-outlined"); // camera icon

// Gemini API setup
const API_KEY = "AIzaSyCZvtdH5EBZCX4kZUQ4Epk582-GlKeGT2Q";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Data structure for storing message and image file
const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null
  }
};

// Store message history
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

// Create a message bubble (user or bot)
const createMessageElement = (content,...classes) => {
  const div = document.createElement("div");
  div.classList.add("message",...classes);
  div.innerHTML=content;
  return div;
}

// Generate Gemini API response
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  // Push user input into chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{inline_data: userData.file}] : [])]
  });

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: chatHistory
    })
  }

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error.message);

    // Extract text response from Gemini
    const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\**/g, "$1").trim();
    messageElement.innerText = apiResponseText;

    // Push bot response to chat history
    chatHistory.push({
      role: "model",
      parts: [{ text: userData.message }]
    });
  } catch (error) {
    console.log(error);
    messageElement.innerText = error.message;
    messageElement.style.color = "#ff0000";
  } finally {
    userData.file = {}; // Clear image after use
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
}

// Handle user message send
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  fileUpload.classList.remove("file-uploaded");
  messageInput.dispatchEvent(new Event("input"));

  // Add outgoing message
  const messageContent = `<div class="message-text"></div>
             ${userData.file.data ?`<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}`;

  const outgoingMessageDiv = createMessageElement(messageContent,"user-message");
  outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  // Create bot loading animation
  setTimeout(() => {
    const messageContent = `  <svg class="avatar" ...>...</svg>
          <div class="message-text">
           <div class="thinking-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
           </div>
          </div>`;
    
    const incomingMessageDiv = createMessageElement(messageContent,"bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    generateBotResponse(incomingMessageDiv);
  }, 600);
}

// Send on Enter key (desktop only)
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if(e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 768){
    handleOutgoingMessage(e);
  }
});

// Auto-resize input box
messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = 
    messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
})

// Handle image upload
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fileUpload.querySelector("img").src = e.target.result;
    fileUpload.classList.add("file-uploaded");

    const base64String = e.target.result.split(",")[1];

    userData.file = {
      data: base64String,
      mime_type: file.type
    }

    fileInput.value = "";
  }

  reader.readAsDataURL(file);
});

// Cancel image upload
fileCancel.addEventListener("click", () => {
  userData.file = {};
  fileUpload.classList.remove("file-uploaded");
});

// Send message on button click
sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));

// Trigger file input on click
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

// Show/hide chatbot popup
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));


let mediaStream = null;

// Open camera on icon click
cameraButton.addEventListener("click", async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraStream.srcObject = mediaStream;
    cameraContainer.style.display = "block";
    cameraContainer.style.pointerEvents = "auto";
  } catch (err) {
    alert("Camera access denied or not available.");
    console.error(err);
  }
});

// Capture photo and attach to chat
captureBtn.addEventListener("click", () => {
  const context = canvas.getContext("2d");
  canvas.width = cameraStream.videoWidth;
  canvas.height = cameraStream.videoHeight;
  context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

  const imageDataUrl = canvas.toDataURL("image/png");
  fileUpload.querySelector("img").src = imageDataUrl;
  fileUpload.classList.add("file-uploaded");

  userData.file = {
    data: imageDataUrl.split(",")[1],
    mime_type: "image/png"
  };

  stopCamera();
  cameraContainer.style.display = "none";
});

// Close camera manually
closeCameraBtn.addEventListener("click", () => {
  stopCamera();
  cameraContainer.style.display = "none";
  cameraContainer.style.pointerEvents = "none"; 
});

// Stop the video stream
function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}
