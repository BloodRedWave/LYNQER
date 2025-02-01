const socket = io(); // Assuming you're using socket.io for real-time communication

// Get username from localStorage
const username = localStorage.getItem("username");
if (!username) {
    window.location.href = "login.html";
} else {
    document.getElementById("username").innerText = username;
}

// WebRTC variables
let localStream;
let peerConnection;
let currentFriend;

// WebRTC configuration
const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// Handle logout
document.getElementById("logoutBtn").addEventListener("click", function() {
    localStorage.removeItem("username");
    window.location.href = "login.html";
});

// Add Friend Button Event (open Add Friend Popup)
document.getElementById("addContactBtn").addEventListener("click", function() {
    document.getElementById("addContactPopup").classList.add("show");
});

// Close Add Contact Popup
document.getElementById("closeAddContactPopup").addEventListener("click", function() {
    document.getElementById("addContactPopup").classList.remove("show");
});

// Submit Add Contact form
document.getElementById("addContactSubmitBtn").addEventListener("click", function() {
    const usernameOrID = document.getElementById("usernameInput").value || document.getElementById("userIdInput").value;
    
    if (!usernameOrID) return;

    fetch(`/getUser?query=${encodeURIComponent(usernameOrID)}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                document.getElementById("errorMessage").style.display = "block";
            } else {
                document.getElementById("errorMessage").style.display = "none";
                alert("Kontakt hinzugefügt: " + data.username);
                socket.emit("addFriend", { username: username, friendID: data.id });
                document.getElementById("addContactPopup").classList.remove("show");
            }
        })
        .catch(err => alert("Fehler bei der Suche nach dem Benutzer: " + err));
});

// Add Friend Button Event (Inside Profile Popup)
document.getElementById("addFriendBtn").addEventListener("click", function() {
    const friendID = document.getElementById("profileID").innerText.split(": ")[1]; // Extract ID from profile
    fetch("/addFriend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendID })
    })
    .then(res => res.json())
    .then(response => {
        alert(response.message);
        document.getElementById("profilePopup").style.display = "none";
    })
    .catch(err => alert("Fehler beim Hinzufügen des Freundes: " + err));
});

// Close Profile Popup
document.getElementById("closeProfilePopup").addEventListener("click", function() {
    document.getElementById("profilePopup").style.display = "none";
});

// Event to receive friend list and populate contacts
socket.on("updateContactList", (contacts) => {
    const contactsList = document.getElementById("friendsContainer");
    contactsList.innerHTML = "";
    contacts.forEach(contact => {
        const contactElement = document.createElement("div");
        contactElement.className = "contact-item";
        contactElement.innerHTML = `
            <div class="contact-avatar"></div>
            <p class="contact-name">${contact.username}</p>
            <button class="callBtn" onclick="startCall('${contact.username}')">📞</button>
        `;
        contactsList.appendChild(contactElement);
    });
});

// Start Call function (WebRTC)
function startCall(friendUsername) {
    currentFriend = friendUsername;

    // Avoid starting multiple calls
    if (peerConnection) {
        alert("Du bist bereits in einem Anruf.");
        return;
    }

    // Set up WebRTC peer connection
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("iceCandidate", { candidate: event.candidate, to: currentFriend });
        }
    };

    // Get user's media (video/audio)
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            document.getElementById("localVideo").srcObject = stream;
            peerConnection.addStream(stream);

            // Send the offer to the friend to start a call
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit("videoOffer", { offer: peerConnection.localDescription, to: currentFriend });
                })
                .catch(err => alert("Fehler beim Erstellen des Anrufs: " + err));
        })
        .catch(err => alert("Fehler beim Zugriff auf die Mediengeräte: " + err));
}

// Receive the video offer
socket.on("videoOffer", (data) => {
    if (data.to === username) {
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("iceCandidate", { candidate: event.candidate, to: data.from });
            }
        };

        peerConnection.createAnswer()
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit("videoAnswer", { answer: peerConnection.localDescription, to: data.from });
            })
            .catch(err => alert("Fehler beim Beantworten des Anrufs: " + err));
    }
});

// Handle video answer from the friend
socket.on("videoAnswer", (data) => {
    if (data.to === username) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
            .catch(err => alert("Fehler beim Setzen der Antwort: " + err));
    }
});

// Handle ICE Candidate
socket.on("iceCandidate", (data) => {
    if (data.to === username) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(err => alert("Fehler beim Hinzufügen des ICE-Kandidaten: " + err));
    }
});

// Receive chat messages
socket.on("receiveMessage", (message) => {
    const chatArea = document.getElementById("messageArea");
    const messageElement = document.createElement("div");
    messageElement.className = "message";
    messageElement.innerHTML = `<strong>${message.from}:</strong> ${message.message}`;
    chatArea.appendChild(messageElement);
});

// Send chat messages
document.getElementById("sendBtn").addEventListener("click", () => {
    const message = document.getElementById("messageInput").value;
    if (message) {
        socket.emit("sendMessage", { to: currentFriend, message });
        const chatArea = document.getElementById("messageArea");
        const messageElement = document.createElement("div");
        messageElement.className = "message";
        messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;
        chatArea.appendChild(messageElement);
        document.getElementById("messageInput").value = "";
    }
});

// Cleanup resources on call end
function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    peerConnection = null;
    currentFriend = null;
    document.getElementById("localVideo").srcObject = null;
}
