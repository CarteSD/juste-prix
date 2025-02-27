// Récupérer le gameId depuis l'URL
const gameId = window.location.pathname.split('/')[1];
const token = window.location.pathname.split('/')[2];

// Connexion au serveur Socket.IO en envoyant le gameId
const socket = io({
    query: {
        gameId: gameId,
        token: token
    }
});

// Récupération de tous les éléments du DOM qui sont manipulés
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');

// Initialisation de la variable playerName
let playerName = null;

// Fonction permettant l'envoi du message au serveur via le socket
function sendMessage() {
    const guess = messageInput.value.trim();
    if (guess) {
        if (!isNaN(Number(guess))) {
            socket.emit('guess', {playerName, guess});
        }
        messageInput.value = '';
    }
}

// Les deux moyens différents d'envoyer un message (le bouton ou la touche "Enter")
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Fonction traitant la réception du signal 'join' provenant du serveur
socket.on('join', (pseudonyme) => {
    messagesDiv.innerHTML += `<p class="text-center">Vous avez rejoint la partie...</p>`;
    playerName = pseudonyme;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

// Fonction traitant la réception du signal 'message' provenant du serveur
socket.on('message', ({playerName, msg}) => {
    let messageParagraph = document.createElement('p');
    // Vérification si le message est envoyé par le système
    if (playerName === 'System') {
        messageParagraph.classList.add("text-center");

        // Ajoute le contenu du message au paragraphe et ajoute le paragraphe à la div des messages
        messageParagraph.innerText = msg;
        messagesDiv.appendChild(messageParagraph);
    }
    else { // Si ce n'est pas le système (donc un joueur)
        // Affichage du pseudonyme du joueur dans un span en gras
        let span = document.createElement('span');
        span.classList.add('font-bold');
        span.innerText = playerName;
        messageParagraph.appendChild(span);

        // Affichage du message du joueur à la suite du pseudonyme
        let message = document.createTextNode(` : ${msg}`);
        messageParagraph.appendChild(message);

        // Ajout du message entier à la div des messages
        messagesDiv.appendChild(messageParagraph);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

socket.on('new round', ({roundNumber}) => {
    messagesDiv.innerHTML += `<p class="font-bold">Manche n°${roundNumber}</p>`; // Affiche le numéro de la manche
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});