# 🌈 ChatIA - Contrôleur LEDs RGB

Application Node.js pour contrôler des LEDs RGB via Ollama et llama3.2 avec des commandes en langage naturel.

## 🚀 Fonctionnalités

- **Contrôle vocal naturel** : "Allume en rouge", "Couleur bleue", "Éteins les LEDs"
- **Interface responsive** : Compatible desktop et mobile
- **Historique intelligent** : Mémorisation des conversations sur 48h
- **Prévisualisation couleur** : Visualisation en temps réel
- **Actions rapides** : Boutons pour les couleurs courantes
- **Statut en temps réel** : Monitoring des connexions Ollama et LEDs

## 📋 Prérequis

- Node.js 18+ ou Docker
- Ollama avec llama3.2 sur `192.168.0.200:11434`
- Contrôleur LEDs WebSocket sur `192.168.0.90:1800`

## 🛠️ Installation

### Méthode 1 : Node.js direct

```bash
# Installer les dépendances
npm install

# Démarrer l'application
npm start
```

### Méthode 2 : Docker

```bash
# Construire et démarrer avec Docker Compose
docker-compose up -d

# Ou construire manuellement
docker build -t chatia-led-controller .
docker run -p 3000:3000 -v $(pwd)/data:/app/data chatia-led-controller
```

## 🌐 Utilisation

1. Ouvrir http://localhost:3000 dans votre navigateur
2. Vérifier que les statuts Ollama et LEDs sont verts
3. Taper des commandes comme :
   - "Allume en rouge"
   - "Couleur bleue"
   - "Violet"
   - "Éteins les LEDs"
   - "Orange"
   - "Blanc"

## 🔧 Configuration

### Variables d'environnement

- `PORT` : Port du serveur (défaut: 3000)
- `NODE_ENV` : Environnement (production/development)

### Adresses réseau

Modifiez dans `server.js` si nécessaire :
- `OLLAMA_URL` : Adresse d'Ollama (défaut: http://192.168.0.200:11434)
- `LED_WEBSOCKET_URL` : Adresse WebSocket LEDs (défaut: ws://192.168.0.90:1800)

## 📡 API

### POST /api/chat
Envoie une commande en langage naturel
```json
{
  "message": "Allume en rouge"
}
```

### GET /api/history
Récupère l'historique des 48 dernières heures

### GET /api/test-ollama
Teste la connexion à Ollama

### POST /api/test-led
Teste les LEDs avec des valeurs RGB
```json
{
  "r": 255,
  "g": 0,
  "b": 0
}
```

## 🎨 Format des trames LEDs

Le contrôleur envoie des trames au format :
```json
{
  "DataTrame": {
    "Description": "LED",
    "IdReseau": 0,
    "IdEmetteur": 10,
    "TypeValeur": 0,
    "Unite": "",
    "ValeurMin": 0,
    "ValeurMax": 255,
    "ValeurMinMesure": 0,
    "ValeurMaxMesure": 255,
    "IdData": 0,
    "ValeurMesure": 255
  },
  "Version": 4,
  "TypeDonnee": 18
}
```

Où :
- `IdData` : 0=Rouge, 1=Vert, 2=Bleu
- `ValeurMesure` : Intensité (0-255)

## 🗄️ Base de données

L'historique est stocké dans SQLite (`conversations.db`) avec :
- Nettoyage automatique après 48h
- Sauvegarde des messages et valeurs RGB
- Horodatage des conversations

## 🐛 Dépannage

### Ollama non connecté
- Vérifier que Ollama fonctionne sur 192.168.0.200:11434
- Tester : `curl http://192.168.0.200:11434/api/tags`

### LEDs non connectées
- Vérifier l'adresse WebSocket 192.168.0.90:1800
- Contrôler les logs du serveur

### Interface non accessible
- Vérifier que le port 3000 est libre
- Tester : `curl http://localhost:3000`

## 📱 Utilisation mobile

L'interface est optimisée pour mobile avec :
- Design responsive
- Boutons tactiles adaptés
- Clavier virtuel optimisé
- Gestes de navigation fluides

## 🔄 Développement

```bash
# Mode développement avec rechargement automatique
npm run dev

# Structure du projet
├── server.js          # Serveur principal
├── package.json       # Dépendances
├── public/           # Interface web
│   ├── index.html    # Page principale
│   ├── style.css     # Styles
│   └── script.js     # JavaScript client
├── Dockerfile        # Image Docker
└── docker-compose.yml # Orchestration
```

## 📄 Licence

MIT License
