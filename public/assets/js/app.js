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

const messagesDiv = document.getElementById('messages');
let playerName = null;

// Fonction traitant la réception du signal 'join' provenant du serveur
socket.on('join', (pseudonyme) => {
    messagesDiv.innerHTML += `<p class="text-center">Vous avez rejoint la partie...</p>`;
    playerName = pseudonyme;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});