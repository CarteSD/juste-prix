import config from '../../config.json' with { type: 'json' };

/**
 * @brief Classe JustePrix
 * @details Classe permettant de gérer une partie de juste prix
 */
export class JustePrix {
    constructor(id, nbRounds = 5, players = [], difficulty = "easy") {
        this._id = id;                          // Identifiant de la partie
        this._currentRound = 0;                 // Numéro de la manche actuelle
        this._isRoundActive = false;            // Indique si une manche est en cours
        this._nbRounds = nbRounds;               // Nombre de manches
        this._scores = new Map();               // Scores et autres informations à propos des participants
        this._price = null;                     // Prix à deviner
        this._difficulty = difficulty;          // Difficulté de la partie

        // Initialisation des joueurs
        players.forEach(player => this.addPlayer(player));
    }

    /**
     * @brief Ajoute un joueur à la partie
     * @param player Joueur à ajouter
     */
    addPlayer(player) {
        this._scores.set(player.username, {
            uuid: player.uuid,      // Identifiant unique du joueur
            token: player.token,    // Token unique pour identifier le joueur dans la partie
            score: 0,               // Score du joueur
            connected: false        // Indique si le joueur est connecté
        });
    }

    /**
     * @brief Supprime un joueur de la partie
     * @param playerUsername Nom d'utilisateur du joueur à supprimer
     */
    removePlayer(playerUsername) {
        this._scores.delete(playerUsername);
    }

    /**
     * @brief Démarre une nouvelle manche
     * @param price Prix à deviner pour la manche
     */
    startNewRound(price) {
        this._price = price;
        this._isRoundActive = true;
        this._currentRound++;
    }

    /**
     * @brief Termine une manche
     */
    endRound() {
        this._price = null;
        this._isRoundActive = false;
    }

    /**
     * @brief Vérifie si la partie est terminée
     * @returns {boolean} Vrai si la partie est terminée, faux sinon
     */
    isGameOver() {
        // Vérifie si le numéro de la manche courante est supérieur ou égale au nombre de manches total
        return this._currentRound >= this._nbRounds;
    }

    /**
     * @brief Retourne le classement des joueurs de la partie
     * @returns {{score: *, uuid: *, username: *}[]} Tableau des scores triés par ordre décroissant
     */
    getLeaderboard() {
        return Array.from(this._scores.entries())                                   // Convertit le Map en tableau
            .filter(([, data]) => data.connected)                                   // Filtre et garde les joueurs connectés
            .sort(([, dataA], [, dataB]) => dataB.score - dataA.score)    // Tri par ordre décroissant des scores
            .map(([username, data]) => ({                                      // Convertit chaque joueur en tableau associatif
                username: username,
                score: data.score,
                uuid: data.uuid
            }));
    }

    /**
     * @brief Retourne un nombre aléatoire entre 0 et 1000
     * @returns {number|float} Nombre aléatoire
     */
    getRandomPrice() {
        switch (this._difficulty) {
            case "easy":
                return Math.floor(Math.random() * 100);
            case "medium":
                return Math.floor(Math.random() * 500);
            case "hard":
                return parseFloat((Math.random() * 1000).toFixed(2));
        }
    }

    /**
     * @brief Termine la partie
     * @param io Instance du serveur socket.io (utilisée pour envoyer des messages aux clients)
     * @returns {Promise<boolean>} Vrai si les résultats ont été envoyés avec succès, faux sinon
     */
    async endGame(io) {
        // Envoie un message à la room pour indiquer la fin de la partie
        await this.sendDelayedMessage(io, {
            playerName: 'System',
            msg: 'Fin de la partie !'
        }, 1000); // Attend 1 seconde avant d'envoyer le message

        // Envoie un signal à la room pour indiquer la fin de la partie (permet de cacher certains éléments du DOM
        io.to(this._id).emit('end game');

        // Envoie un message à la room pour indiquer le classement final
        await this.sendDelayedMessage(io, {
            playerName: 'System',
            msg: `Classement final :
            - ${this.getLeaderboard()
                .map(player => `${player.username} : ${player.score} point(s)`) // Affiche chacun des membres avec son score
                .join('\n- ')}` // Sépare chaque membre par un retour à la ligne
        }, 2500); // Attend 2.5 secondes avant d'envoyer le message

        // Initialisation de la variable winner
        let winner = null;

        // Vérifie s'il y a au moins un joueur dans la partie
        if (this.getLeaderboard().length === 0) {
            console.error('Aucun joueur n\'a été trouvé dans le classement de la partie ' + this._id);
        } else if (this.getLeaderboard().length === 1) {
            await this.sendDelayedMessage(io, {
                playerName: 'System',
                msg: 'Vous êtes seul dans la partie, que faites-vous ici ?'
            }, 1000);
        } else {
            // Vérification du cas exæquo total (aucun joueur n'a marqué de points ou tous les joueurs ont le même nombre de points)
            if (this.getLeaderboard()[0].score === 0 || this.getLeaderboard()[0].score === this.getLeaderboard()[this.getLeaderboard().length - 1].score) {
                await this.sendDelayedMessage(io, {
                    playerName: 'System',
                    msg: 'Tout le monde a le même score, quelle surprise !'
                }, 1000);
            }

            // Vérification si plusieurs joueurs ont le même nombre de points
            else {
                // Récupère le meilleur score (le classement étant trié par ordre de score décroissant, le meilleur score est le premier)
                let bestScore = this.getLeaderboard()[0].score;

                // Récupère les joueurs ayant le meilleur score en les comparant à bestScore
                winner = this.getLeaderboard().filter(player => player.score === bestScore).map(player => player.uuid);
            }
        }

        // Envoie les résultats de la partie au serveur de Comus Party
        let scores = Object.fromEntries([...this._scores].map(([_, playerData]) => [playerData.uuid, playerData.score]));
        try {
            let request = new FormData();
            request.append('scores', JSON.stringify(scores));
            request.append('winner', JSON.stringify(winner));

            const response = await fetch(`${config.URL_COMUS}/game/${this._id}/end`, {
                method: 'POST',
                body: request
            }).then(response => response.json());

            if (!response.success) {
                throw new Error(response.message);
            }

            console.log(`Résultat de la partie ${this._id} envoyé au serveur de Comus Party avec succès`);
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi du résultat de la partie ${this._id} au serveur de Comus Party:`, error);
            return false;
        }
    }

    /**
     * @brief Envoie un message à la room après un certain délai
     * @param io Instance du serveur socket.io (utilisée pour envoyer des messages aux clients)
     * @param message Message à envoyer
     * @param delay Délai avant l'envoi du message
     * @returns {Promise<unknown>} Promesse résolue lorsque le message est envoyé
     */
    sendDelayedMessage(io, message, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                io.to(this._id).emit('message', {
                    playerName: message.playerName,
                    msg: message.msg
                });
                resolve();
            }, delay);
        });
    }
}