/**
 * forum.js - Expert Community Forum Chat Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    appendMessage(msg, 'user');
    input.value = '';

    // Show typing indicator or simulate delay
    setTimeout(() => {
        const responses = [
            "Based on the symptoms you're describing, it looks like early blight. I recommend applying a copper-based fungicide and ensuring good air circulation around the plants.",
            "That's a common issue this season due to the recent humidity. Reduce your watering schedule slightly and check the soil moisture sensor logs on your dashboard.",
            "It might be a nitrogen deficiency. Have you checked the latest NPK readings from your SmartFarm robot? A balanced organic fertilizer should help.",
            "I've seen this before. It's likely pest-related, possibly aphids. Try a neem oil application early in the morning.",
            "Great question! Keep monitoring it closely for the next 48 hours. If the yellowing spreads, let's look into a soil pH test."
        ];
        
        // Pick a random expert response
        const randomReply = responses[Math.floor(Math.random() * responses.length)];
        appendMessage(randomReply, 'expert');
    }, 1500 + Math.random() * 2000); // 1.5s to 3.5s delay
}

function appendMessage(text, type) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const content = document.createElement('p');

    if (type === 'expert') {
        const title = document.createElement('strong');
        title.innerHTML = '<i class="fas fa-user-md"></i> Expert Dr. Sharma';
        title.querySelector('i').style.color = 'var(--primary-color)';
        title.style.display = 'inline-flex';
        title.style.alignItems = 'center';
        title.style.gap = '6px';
        content.appendChild(title);
        content.appendChild(document.createElement('br'));
    } else if (type === 'user') {
        const title = document.createElement('strong');
        title.textContent = 'You';
        content.appendChild(title);
        content.appendChild(document.createElement('br'));
    }

    const messageText = document.createElement('span');
    messageText.textContent = text;
    content.appendChild(messageText);

    msgDiv.appendChild(content);
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = time;
    msgDiv.appendChild(timeSpan);
    
    chatMessages.appendChild(msgDiv);
    
    // Auto scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
