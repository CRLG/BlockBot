# BlockBot
Projet de programmation de robots sans coder basé sur Blockly

---

## Mise en place de l'environnement de développement

### Prérequis

- **Node.js** v20 ou supérieur — [nodejs.org](https://nodejs.org)
- **npm** v10 ou supérieur (installé automatiquement avec Node.js)
- **Git**

Pour vérifier que ces outils sont disponibles :
```bash
node --version
npm --version
```

### Pourquoi `node_modules/` n'est pas dans le dépôt ?

Le dossier `node_modules/` contient toutes les bibliothèques tierces (Blockly, webpack, etc.). Il peut peser plusieurs centaines de Mo et est **régénéré automatiquement** à partir de `package.json` et `package-lock.json` par la commande `npm install`. Le committer serait une mauvaise pratique : dépôt surchargé, conflits fréquents, aucun bénéfice.

### Installation (première fois ou après un `git pull` qui modifie `package.json`)

```bash
# 1. Se placer dans le répertoire BlockBot
cd BlockBot

# 2. Installer toutes les dépendances déclarées dans package.json
#    Cela crée le dossier node_modules/ localement
npm install
```

Cette commande installe notamment :
- **blockly** — la bibliothèque de programmation visuelle
- **webpack** + plugins — le bundler qui compile les sources JS/CSS en un seul fichier `bundle.js`
- **copy-webpack-plugin** — copie les assets Blockly (icônes, sprites, sons) dans le répertoire de sortie pour un fonctionnement **sans connexion internet**

### Utilisation

```bash
# Mode développement — serveur local avec rechargement automatique
# Accessible sur http://localhost:8080
npm start

# Mode production — compile dans dist/
# Génère dist/index.html, dist/bundle.js, dist/media/
npm run build
```

### Intégration avec LaBotBox

LaBotBox charge BlockBot via Qt WebEngine à partir du dossier **`dist/`**. Il faut donc lancer `npm run build` après chaque modification pour que LaBotBox voie les changements.

Le dossier `dist/media/` contient les assets graphiques et sonores de Blockly (poubelle, boutons de zoom, sprites...). Il est généré automatiquement par `npm run build` — sans lui, Blockly tenterait de les charger depuis internet.
