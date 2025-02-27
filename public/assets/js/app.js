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