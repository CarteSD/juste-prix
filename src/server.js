import express from "express";
import {createServer} from "http";
import {Server} from "socket.io";
import config from '../config.json' with { type: 'json' };
import path from 'path';
import { dirname } from 'path';
import {fileURLToPath} from "url";
import {JustePrix} from "./game/JustePrix.class.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Stockage des différentes instances de jeu
const games = new Map();

// Constantes uniques pour l'ensemble des parties
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

// Route pour initialiser une partie
app.post('/:gameId/init', express.json(), (req, res) => {

    const gameId = req.params.gameId;
    const { settings, players } = req.body;
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
    try {
        games.set(gameId, new JustePrix(gameId, settings.nbRounds, players));
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


server.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});