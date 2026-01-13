// Chat Logic for Nexus

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');

// Auto-scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add a message to the UI
function addMessage(text, sender = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble ${sender}`;
    
    // Avatar for AI
    let avatarHTML = '';
    if (sender === 'ai') {
        avatarHTML = `<div class="message-avatar">⚡</div>`;
    }

    messageDiv.innerHTML = `
        ${avatarHTML}
        <div class="message-content">
            <p>${text}</p>
            <span class="message-time">${getCurrentTime()}</span>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Simulate AI processing and typing
function simulateAIResponse(userText) {
    // Show typing indicator (optional exercise for later)
    
    // Simple logic for responses (we can expand this!)
    let responseText = "That's interesting! Tell me more. 🤔";
    
    const lowerText = userText.toLowerCase();
    
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
        responseText = "Hi there! Ready to code? 💻";
    } else if (lowerText.includes('name')) {
        responseText = "I'm Nexus, your digital companion. ⚡";
    } else if (lowerText.includes('help')) {
        responseText = "I can help you organize your tasks, learn JavaScript, or just chat! What do you need?";
    } else if (lowerText.includes('javascript') || lowerText.includes('code')) {
        responseText = "JavaScript is awesome! Did you know it powers almost everything on the web? Lets write some! 🚀";
    }

    // Delay response to feel natural
    setTimeout(() => {
        addMessage(responseText, 'ai');
    }, 1000 + Math.random() * 1000);
}

// Handle Form Submit
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = messageInput.value.trim();
    if (!text) return;

    // Add User Message
    addMessage(text, 'user');
    
    // Clear input
    messageInput.value = '';

    // Trigger AI response
    simulateAIResponse(text);
});
