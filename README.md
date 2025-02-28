## Informations
Ce jeu est dédié et créé pour fonctionner sur la plateforme de mini-jeux en ligne Comus Party.

Comus Party est une application de mini-jeux en ligne, elle est développée dans le cadre de la SAE 3.01 du BUT Informatique à l'IUT de Bayonne et du Pays Basque.

Ce jeu est un jeu de type "Juste prix" mettant en confrontation plusieurs joueurs. Le but est de trouver un nombre aléatoire généré par le serveur de jeu, le plus rapidement possible.

## Déroulé d'une partie
Lorsque l'hôte de la partie décide de lancer la partie sur la plateforme Comus Party, un `<iframe>` est affiché sur l'écran de chacun de joueurs, affichant ainsi le serveur de jeu.

Le jeu attend qu'au moins deux joueurs soient connectés avant de lancer la partie (les joueurs ayant une mauvaise connexion sont par défaut désavantagés). Le serveur génère un nombre aléatoire entre 0 et 100 et tous les joueurs doivent trouver celui-ci le plus rapidement possible. À chaque essai, un pictogramme indique si la valeur à trouver est plus grande ou plus petite que celle proposée.

Dans cette première version, les joueurs ont autant d'essais que possible afin de trouver la bonne réponse.

Si un joueur trouve la bonne réponse, il gagne un point. Ce principe se répète autant de fois qu'il y a demanche

À la fin de la partie, le serveur de jeu affiche le classement final en prenant en compte plusieurs points :
- Si aucun joueur n'a marqué de point, il n'y a pas de vainqueur.
- Si un seul joueur a le score le plus élevé, il est le vainqueur.
- Si plusieurs joueurs ont le score le plus élevé *(exæquo)* ils sont tous vainqueurs.

*N.B : Le serveur de jeu renvoyant uniquement le tableau des scores avec le vainqueur "premier", Comus Party n'est pas exclu de pouvoir traiter ce tableau d'une manière qui lui convient mieux.*

## Informations techniques
Ce jeu est développé en JavaScript, et utilise la librairie Socket.io pour la communication entre le serveur et les clients.

Le serveur de jeu est développé en Node.js, et utilise Express pour la gestion des routes.

L'interface graphique est réalisée en HTML / CSS avec l'utilisation de la bibliothèque CSS TailwindCSS pour simplifier l'utilisation des classes dans le développement.

Afin d'initialiser une partie, le serveur attend la réception d'une pré-requête, permettant ainsi de créer une nouvelle instance d'un quiz dans laquelle l'ensemble des joueurs est répertorié avec leur UUID ainsi qu'un token généré aléatoirement *(ces tokens sont gérés entièrement par Comus Party)*.

Nous utilisons des tokens afin d'éviter tout vol d'identité durant une partie. Dans le cas où nous n'utiliserions pas ces tokens, il serait possible pour un joueur de se connecter à une partie sans y être invité en connaissant simplement l'UUID d'un autre joueur.

Afin de se connecter au serveur de jeu, la requête doit être de la forme `/:gameCode/:token`. C'est ici que le serveur de jeu vérifie que la partie existe bien, et que le joueur est également répertorié dans celle-ci.

Une fois que le joueur est connecté, il peut envoyer des réponses aux questions posées par le serveur. Si la réponse est correcte, le joueur gagne un point, sinon il ne gagne rien.

À la fin de la partie, le serveur de jeu envoi une requête retournant les scores ainsi que le(s) vainqueur(s) de la partie.

## Informations supplémentaires
Ce jeu est une première version, très simple afin de pouvoir réaliser un produit minimum viable pour la présentation de notre projet lors des soutenances de fin d'année. Il est donc possible que des bugs soient présents, et que des améliorations soient nécessaires.

## Développer
Pour déployer ou développer ce jeu, il est nécessaire d'avoir Node.js installé sur votre machine (disponible sur [le site officiel de Node.js](https://nodejs.org/)).

1. Dupliquer le projet
```bash
git clone https://github.com/CarteSD/juste-prix
cd juste-prix
```

2. Installer les dépendances
```bash
npm install
```

3. Compiler le CSS
```bash
npm run build # Pour déployer
npm run watch # Pour développer
```

4. Lancer le serveur de jeu *(À chaque modification du code, il est nécessaire de relancer le serveur, d'exécuter l'étape 5. ci-dessous et de recharger la page du jeu)*
```bash
npm run start
```

5. Lancer une requête d'initialisation de partie *(Cf section 3 - Informations techniques)* en POST sur l'adresse `http://localhost:3001/123/init` avec par exemple le corps de la requête suivant :
```json
{
    "settings": {
        "nbRounds": 5
    },
    "players": [
        { "username": "Jean", "uuid": "abc-123", "token": "token-abc-def" },
        { "username": "Paul", "uuid": "def-456", "token": "token-ghi-jkl" }
    ]
}
```

Le serveur de jeu est maintenant accessible à l'adresse `http://localhost:3001` *(ou bien au port indiqué dans le fichier `config.json`)*.

Pour le rejoindre, il suffit de se connecter à l'adresse :
- `http://localhost:3001/123/token-abc-def` pour le joueur Jean
- `http://localhost:3001/123/token-ghi-jkl` pour le joueur Paul.