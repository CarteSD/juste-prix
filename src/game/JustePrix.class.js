/**
 * @brief Classe JustePrix
 * @details Classe permettant de gérer une partie de juste prix
 */
export class JustePrix {
    constructor(id, nbRounds = 5, players = []) {
        this._id = id;                          // Identifiant de la partie
        this._currentRound = 0;                 // Numéro de la manche actuelle
        this._isRoundActive = false;            // Indique si une manche est en cours
        this._nbRounds = nbRounds;               // Nombre de manches
        this._scores = new Map();               // Scores et autres informations à propos des participants
        this._price = null;                     // Prix à deviner

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
     * @returns {number}
     */
    getRandomPrice() {
        return Math.floor(Math.random() * 100);
    }
}