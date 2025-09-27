const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.0.200:11434';
const LED_WEBSOCKET_URL = process.env.LED_WEBSOCKET_URL || 'ws://192.168.0.90:1800';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuration des types MIME pour les fichiers statiques
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Base de données pour l'historique
const db = new sqlite3.Database('conversations.db');

// Initialiser la base de données
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_message TEXT,
        ai_response TEXT,
        rgb_values TEXT
    )`);
});

// Nettoyer les conversations de plus de 48h
function cleanOldConversations() {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    db.run('DELETE FROM conversations WHERE timestamp < ?', [twoDaysAgo]);
}

// Nettoyer toutes les heures
setInterval(cleanOldConversations, 60 * 60 * 1000);

// Classe pour gérer les LEDs
class LEDController {
    constructor() {
        this.ws = null;
        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket(LED_WEBSOCKET_URL);
            
            this.ws.on('open', () => {
                console.log('Connecté au contrôleur LED');
            });

            this.ws.on('error', (error) => {
                console.error('Erreur WebSocket LED:', error);
            });

            this.ws.on('close', () => {
                console.log('Connexion LED fermée, tentative de reconnexion...');
                setTimeout(() => this.connect(), 5000);
            });
        } catch (error) {
            console.error('Erreur de connexion LED:', error);
            setTimeout(() => this.connect(), 5000);
        }
    }

    sendRGBValues(r, g, b) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket LED non connecté');
            return false;
        }

        const colors = [
            { idData: 0, value: r }, // Rouge
            { idData: 1, value: g }, // Vert
            { idData: 2, value: b }  // Bleu
        ];

        colors.forEach(color => {
            const trame = {
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
                    "IdData": color.idData,
                    "ValeurMesure": color.value
                },
                "Version": 4,
                "TypeDonnee": 18
            };

            this.ws.send(JSON.stringify(trame));
        });

        console.log(`LEDs mises à jour: R=${r}, G=${g}, B=${b}`);
        return true;
    }
}

const ledController = new LEDController();

// Fonction pour communiquer avec Ollama
async function askOllama(message, conversationHistory = []) {
    try {
        // Construire le prompt avec l'historique et les instructions
        const systemPrompt = `Tu es un assistant pour contrôler des LEDs RGB. 
Tu dois répondre UNIQUEMENT avec un objet JSON contenant les valeurs RGB.
Format de réponse attendu: {"r": 0-255, "g": 0-255, "b": 0-255}

Exemples:
- "allume en rouge" -> {"r": 255, "g": 0, "b": 0}
- "éteins les LEDs" -> {"r": 0, "g": 0, "b": 0}
- "couleur bleue" -> {"r": 0, "g": 0, "b": 255}
- "violet" -> {"r": 128, "g": 0, "b": 128}
- "orange" -> {"r": 255, "g": 165, "b": 0}
- "blanc" -> {"r": 255, "g": 255, "b": 255}

Réponds SEULEMENT avec le JSON, aucun autre texte.`;

        // Construire les messages avec l'historique
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        console.log(`Requête Ollama: ${OLLAMA_URL}/api/chat`);
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: 'llama3.2:1b',
            messages: messages,
            stream: false
        });

        return response.data.message.content.trim();
    } catch (error) {
        console.error('Erreur Ollama:', error.response?.status, error.response?.data || error.message);
        console.error('URL tentée:', `${OLLAMA_URL}/api/chat`);
        throw new Error(`Impossible de communiquer avec Ollama: ${error.message}`);
    }
}

// Récupérer l'historique des conversations
function getConversationHistory(callback) {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    db.all(
        'SELECT user_message, ai_response FROM conversations WHERE timestamp > ? ORDER BY timestamp ASC',
        [twoDaysAgo],
        (err, rows) => {
            if (err) {
                console.error('Erreur base de données:', err);
                callback([]);
                return;
            }

            const history = [];
            rows.forEach(row => {
                history.push({ role: 'user', content: row.user_message });
                history.push({ role: 'assistant', content: row.ai_response });
            });

            callback(history);
        }
    );
}

// Sauvegarder une conversation
function saveConversation(userMessage, aiResponse, rgbValues) {
    db.run(
        'INSERT INTO conversations (user_message, ai_response, rgb_values) VALUES (?, ?, ?)',
        [userMessage, aiResponse, JSON.stringify(rgbValues)]
    );
}

// Route principale pour traiter les demandes
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message requis' });
    }

    try {
        // Récupérer l'historique
        getConversationHistory(async (history) => {
            try {
                // Demander à Ollama
                const aiResponse = await askOllama(message, history);
                
                // Parser la réponse JSON
                let rgbValues;
                try {
                    rgbValues = JSON.parse(aiResponse);
                    
                    // Valider les valeurs RGB
                    if (typeof rgbValues.r !== 'number' || typeof rgbValues.g !== 'number' || typeof rgbValues.b !== 'number') {
                        console.error('Valeurs RGB invalides - types:', typeof rgbValues.r, typeof rgbValues.g, typeof rgbValues.b);
                        console.error('Réponse IA brute:', aiResponse);
                        throw new Error('Valeurs RGB invalides');
                    }
                    
                    // Limiter les valeurs entre 0 et 255
                    rgbValues.r = Math.max(0, Math.min(255, Math.round(rgbValues.r)));
                    rgbValues.g = Math.max(0, Math.min(255, Math.round(rgbValues.g)));
                    rgbValues.b = Math.max(0, Math.min(255, Math.round(rgbValues.b)));
                    
                } catch (parseError) {
                    console.error('Erreur parsing JSON:', parseError);
                    console.error('Réponse IA brute:', aiResponse);
                    return res.status(500).json({ error: 'Réponse IA invalide' });
                }

                // Envoyer les valeurs aux LEDs
                const success = ledController.sendRGBValues(rgbValues.r, rgbValues.g, rgbValues.b);
                
                if (!success) {
                    return res.status(500).json({ error: 'Erreur communication LEDs' });
                }

                // Sauvegarder la conversation
                saveConversation(message, aiResponse, rgbValues);

                res.json({
                    message: 'LEDs mises à jour avec succès',
                    rgb: rgbValues,
                    aiResponse: aiResponse
                });

            } catch (error) {
                console.error('Erreur traitement:', error);
                res.status(500).json({ error: error.message });
            }
        });

    } catch (error) {
        console.error('Erreur générale:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour récupérer l'historique
app.get('/api/history', (req, res) => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    db.all(
        'SELECT timestamp, user_message, rgb_values FROM conversations WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 50',
        [twoDaysAgo],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur base de données' });
            }
            res.json(rows);
        }
    );
});

// Route pour tester la connexion Ollama
app.get('/api/test-ollama', async (req, res) => {
    try {
        console.log(`Test connexion Ollama: ${OLLAMA_URL}/api/tags`);
        const response = await axios.get(`${OLLAMA_URL}/api/tags`);
        res.json({ status: 'OK', models: response.data.models });
    } catch (error) {
        console.error('Erreur test Ollama:', error.response?.status, error.response?.data || error.message);
        res.status(500).json({ 
            status: 'ERROR', 
            message: error.message,
            url: `${OLLAMA_URL}/api/tags`,
            details: error.response?.data || 'Pas de détails'
        });
    }
});

// Route pour tester la connexion LEDs (sans envoyer de données)
app.get('/api/test-led-connection', (req, res) => {
    if (ledController.ws && ledController.ws.readyState === 1) { // WebSocket.OPEN = 1
        res.json({ status: 'OK', message: 'LEDs connectées' });
    } else {
        res.status(500).json({ status: 'ERROR', message: 'LEDs déconnectées' });
    }
});

// Route pour tester les LEDs avec des valeurs (pour debug manuel)
app.post('/api/test-led', (req, res) => {
    const { r = 255, g = 0, b = 0 } = req.body;
    const success = ledController.sendRGBValues(r, g, b);
    
    if (success) {
        res.json({ message: 'Test LED envoyé', rgb: { r, g, b } });
    } else {
        res.status(500).json({ error: 'Erreur communication LEDs' });
    }
});

// Servir l'interface web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Les routes de fallback ne sont pas nécessaires
// Express gère automatiquement les 404 pour les fichiers inexistants

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Interface web: http://localhost:${PORT}`);
    cleanOldConversations(); // Nettoyer au démarrage
});
