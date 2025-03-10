// Récupérer le gameId depuis l'URL
const gameId = window.location.pathname.split('/').at(-2);
const token = window.location.pathname.split('/').at(-1);

// Connexion au serveur Socket.IO en envoyant le gameId
const socket = io(
    {
        query: {
            gameId: gameId,
            token: token
        },
        path: `/${window.location.pathname.split('/').at(1)}/socket.io`
    }
);

// Récupération de tous les éléments du DOM qui sont manipulés
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');
const leaderboard_players = document.getElementById('leaderboard-players');


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
socket.on('message', ({playerName, msg, comparator}) => {
    let messageDiv = document.createElement('div');
    // Vérification si le message est envoyé par le système
    if (playerName === 'System') {
        messageDiv.classList.add("text-center");

        // Vérification du cas où le serveur annonce d'une bonne réponse proposée
        if (msg.includes("Bonne réponse")) {
            messageInput.disabled = true;
            sendBtn.disabled = true;
            sendBtn.classList.add("btn-disabled");
            sendBtn.classList.remove("btn-primary");
        }

        // Ajoute le contenu du message au paragraphe et ajoute le paragraphe à la div des messages
        messageDiv.innerText = msg;
        messagesDiv.appendChild(messageDiv);
    }
    else { // Si ce n'est pas le système (donc un joueur)
        messageDiv.classList.add("flex", "justify-between");
        let messageParagraph = document.createElement('p');

        // Affichage du pseudonyme du joueur dans un span en gras
        let span = document.createElement('span');
        span.classList.add('font-bold');
        span.innerText = playerName;
        messageParagraph.appendChild(span);

        // Affichage du message du joueur à la suite du pseudonyme
        let message = document.createElement('span');
        message.innerText = ` : ${msg}`;
        messageParagraph.appendChild(message);

        let comparatorSpan = document.createElement('span');
        comparatorSpan.innerText = comparator;

        messageDiv.appendChild(messageParagraph);
        messageDiv.appendChild(comparatorSpan);

        // Ajout du message entier à la div des messages
        messagesDiv.appendChild(messageDiv);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

socket.on('new round', ({roundNumber}) => {
    messagesDiv.innerHTML += `<p class="font-bold">Manche n°${roundNumber}</p>`; // Affiche le numéro de la manche
    messagesDiv.innerHTML += `<p>Entrez votre proposition de prix...</p>`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove("btn-disabled");
    sendBtn.classList.add("btn-primary");
    messageInput.focus();
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

// Fonction traitant la réception du signal 'update leaderboard' provenant du serveur
socket.on('update leaderboard', (leaderboard) => {
    leaderboard_players.innerHTML = ''; // Réinitialise le contenu

    // Parcours le tableau des joueurs et les ajoute à la liste
    leaderboard.forEach((player, index) => {
        let rowP = document.createElement('p');
        let medal = '';

        // Attribue les émojis de médailles selon la position
        switch (index) {
            case 0:
                medal = '🥇・';
                break;
            case 1:
                medal = '🥈・';
                break;
            case 2:
                medal = '🥉・';
                break;
        }

        // Ajoute le contenu du message au paragraphe et ajoute le paragraphe à la div des messages
        rowP.innerText = `${medal}${player.username} : ${player.score} point(s)`;
        leaderboard_players.appendChild(rowP);
    });
});