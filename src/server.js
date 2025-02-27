import express from "express";
import {createServer} from "http";
import {Server} from "socket.io";
import config from '../config.json' with { type: 'json' };
import path from 'path';
import { dirname } from 'path';
import {fileURLToPath} from "url";

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