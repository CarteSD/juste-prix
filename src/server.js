import express from "express";
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import {Server} from "socket.io";
import config from '../config.json' with { type: 'json' };
import gameSettings from '../settings.json' with { type: 'json' };
import path from 'path';
import { dirname } from 'path';
import {fileURLToPath} from "url";
import {JustePrix} from "./game/JustePrix.class.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let options = null;
if (config.SSL) {
    options = {
        key: fs.readFileSync('./privkey.pem', 'utf8'),
        cert: fs.readFileSync('./fullchain.pem', 'utf8'),
        ca: fs.readFileSync('./chain.pem', 'utf8')
    };
}

const app = express();

let server;
if (config.SSL) {
    server = createHttpsServer(options, app);
} else {
    server = createHttpServer(app);
}

const io = new Server(server);

// Stockage des différentes instances de jeu
const games = new Map();

// Constantes uniques pour l'ensemble des parties
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

// Route pour initialiser une partie
app.post('/:gameId/init', express.json(), (req, res) => {

    const gameId = req.params.gameId;
    const { token, settings, players } = req.body;
    if (players.length > MAX_PLAYERS) {
        res.status(409).json({
            success: false,
            message: 'Trop de joueurs pour la partie'
        });
        return;
    }
    if (players.length < MIN_PLAYERS) {
        res.status(409).json({
            success: false,
            message: 'Pas assez de joueurs pour la partie'
        });
        return;
    }
    Array.from(gameSettings.modifiableSettings).forEach(setting => {
        if (setting.type === "number") {
            if (settings[setting.name] <= setting.min || settings[setting.name] >= setting.max) {
                res.status(409).json({
                    success: false,
                    message: `La valeur de ${setting.name} doit être comprise entre ${setting.min} et ${setting.max}`
                });
                return;
            }
        }
        if (setting.type === "select") {
            if (!setting.options.map(option => option.value).includes(settings[setting.name])) {
                res.status(409).json({
                    success: false,
                    message: `La valeur de ${setting.name} n'est pas valide`
                });
                return;
            }
        }
    });
    try {
        games.set(gameId, new JustePrix(gameId, settings.nbRounds, players, settings.difficulty, token));
        res.status(200).json({
            success: true,
            message: 'Partie initialisée avec succès'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'initialisation de la partie'
        });
    }
});

// Route pour rejoindre une partie
app.get('/:gameId/:token', express.json(), (req, res) => {
    const gameId = req.params.gameId;
    const token = req.params.token;

    // Vérifier si la partie existe
    if (!games.has(gameId)) {
        res.redirect('/404');
        return;
    }

    // Vérifier si le token est valide en parcourant les joueurs
    let playerFound = false;
    let playerUuid = '';
    games.get(gameId)._scores.forEach((playerData, playerName) => {
        if (playerData.token === token) {
            playerFound = true;
            playerUuid = token;
        }
    });
    if (playerFound) {
        res.sendFile(path.join(__dirname, '../public', 'game.html'));
    }
    else {
        // Rediriger vers une page 403 si le token n'est pas trouvé
        res.redirect('/403');
    }
});

// Route d'erreur 404 (page introuvable)
app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '404.html'));
});

// Route d'erreur 403 (accès interdit)
app.get('/403', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '403.html'));
});

// Définition du répertoire racine du serveur
app.use(express.static('public'));

io.on('connection', (socket) => {
    // Récupération du token et de l'ID de la partie depuis la requête de connexion Socket.IO
    const token = socket.handshake.query.token;
    const gameId = socket.handshake.query.gameId;

    // Vérifier si la partie existe
    if (!games.has(gameId)) {
        return;
    }

    let currentGame = games.get(gameId);
    let pseudonyme = '';

    currentGame._scores.forEach((playerData, playerName) => {
        if (playerData.token === token) {
            pseudonyme = playerName;
            currentGame._scores.get(playerName).connected = true;
        }
    });

    // Rejoindre la room de cette partie
    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', pseudonyme);

    // Annonce dans le chat
    socket.to(gameId).emit('message', {
        playerName: 'System',
        msg: `${pseudonyme} a rejoint la partie !`,
    });

    // Envoi de la manche déjà en cours (s'il y en a une)
    if (currentGame._isRoundActive) {
        socket.emit('new round', {
            roundNumber: currentGame._currentRound,
            difficulty: currentGame._difficulty
        });
    }

    // Envoi du leaderboard à jour
    io.to(gameId).emit('update leaderboard', currentGame.getLeaderboard());

    // Vérification si la partie peut commencer
    if (Array.from(currentGame._scores.entries()).filter(([, data]) => data.connected).length >= MIN_PLAYERS && !currentGame._isRoundActive && !currentGame.isGameOver()) {
        io.to(gameId).emit('message', {
            playerName: 'System',
            msg: 'La partie commence !'
        });
        currentGame.startNewRound(currentGame.getRandomPrice());
        io.to(gameId).emit('new round', {
            roundNumber: currentGame._currentRound,
            difficulty: currentGame._difficulty
        });
    }


    // Lorsque les joueurs envoient une proposition de réponse
    socket.on('guess', async ({playerName, guess}) => {
        if (!currentGame._isRoundActive) {
            return;
        }
        let comparator = '';
        let difference = Math.abs(Number(guess) - currentGame._price); // Récupère la valeur absolue de la différence entre la proposition de le prix à deviner
        if (Number(guess) > currentGame._price) {
            comparator = difference >= 15 ? ' ⏬' : ' 🔽';
        } else if (Number(guess) < currentGame._price) {
            comparator = difference >= 15 ? ' ⏫' : ' 🔼';
        } else {
            comparator = ' ✔';
        }
        // Envoi immédiat du message du joueur
        io.to(gameId).emit('message', {
            playerName: playerName,
            msg: guess,
            comparator: comparator
        });

        if (currentGame._price === Number(guess)) {
            const sendDelayedMessageToSocket = (message, delay) => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        socket.emit('message', message);
                        resolve();
                    }, delay);
                });
            };

                    // Arrêt du round en cours pour éviter les multiples réponses
            let price = currentGame._price;
            currentGame.endRound();

            // Incrémentation du score
            currentGame._scores.get(playerName).score++;

            io.to(gameId).emit('message', {
                playerName: 'System',
                msg: `Bonne réponse de ${playerName} ! Le prix était de ${price} !`
            });

            // Envoyer la mise à jour du leaderboard à tous les clients
            io.to(gameId).emit('update leaderboard', currentGame.getLeaderboard());

            await sendDelayedMessageToSocket({
                playerName: 'System',
                msg: `Votre score : ${currentGame._scores.get(playerName).score} point(s)`
            }, 1000);

            if (currentGame.isGameOver()) {
                if (await currentGame.endGame(io)) {
                    setTimeout(() => {
                        io.to(gameId).emit('redirect', {
                            url: `${config.URL_COMUS}`,
                        });
                    }, 7500);
                    games.delete(gameId);
                }
            } else {
                setTimeout(() => {
                    currentGame.startNewRound(currentGame.getRandomPrice());
                    io.to(gameId).emit('new round', {
                        roundNumber: currentGame._currentRound,
                        difficulty: currentGame._difficulty
                    });
                }, 3000);
            }
        }
    });
})


server.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});