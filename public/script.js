class LEDController {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.checkStatus();
        this.loadHistory();
        
        // Vérifier le statut toutes les 30 secondes
        setInterval(() => this.checkStatus(), 30000);
        
        // Recharger l'historique toutes les minutes
        setInterval(() => this.loadHistory(), 60000);
    }

    initializeElements() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.voiceButton = document.getElementById('voiceButton');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.browserInfo = document.getElementById('browserInfo');
        this.chatMessages = document.getElementById('chatMessages');
        this.colorCircle = document.getElementById('colorCircle');
        this.rgbValues = document.getElementById('rgbValues');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.ollamaStatus = document.getElementById('ollamaStatus');
        this.ledStatus = document.getElementById('ledStatus');
        this.historyList = document.getElementById('historyList');
        
        // Boutons rapides
        this.quickButtons = document.querySelectorAll('.quick-btn');
        
        // Reconnaissance vocale
        this.recognition = null;
        this.isListening = false;
        this.initVoiceRecognition();
    }

    bindEvents() {
        // Envoi de message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Reconnaissance vocale
        this.voiceButton.addEventListener('click', () => this.toggleVoiceRecognition());

        // Boutons rapides
        this.quickButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.messageInput.value = color;
                this.sendMessage();
            });
        });

        // Auto-resize du textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Désactiver l'interface
        this.setLoading(true);
        this.messageInput.value = '';

        // Ajouter le message utilisateur
        this.addMessage(message, 'user');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (response.ok) {
                // Mettre à jour la couleur
                this.updateColor(data.rgb);
                
                // Ajouter la réponse du bot
                this.addMessage(`✅ ${data.message}`, 'bot');
                
                // Recharger l'historique
                this.loadHistory();
            } else {
                this.addMessage(`❌ Erreur: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur:', error);
            this.addMessage(`❌ Erreur de connexion: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll vers le bas
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateColor(rgb) {
        const { r, g, b } = rgb;
        
        // Mettre à jour le cercle de couleur
        this.colorCircle.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        
        // Mettre à jour les valeurs RGB
        this.rgbValues.textContent = `R: ${r}, G: ${g}, B: ${b}`;
        
        // Animation de pulsation
        this.colorCircle.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.colorCircle.style.transform = 'scale(1)';
        }, 200);
    }

    setLoading(loading) {
        if (loading) {
            this.loadingOverlay.classList.add('show');
            this.sendButton.disabled = true;
            this.messageInput.disabled = true;
        } else {
            this.loadingOverlay.classList.remove('show');
            this.sendButton.disabled = false;
            this.messageInput.disabled = false;
            this.messageInput.focus();
        }
    }

    async checkStatus() {
        try {
            // Vérifier Ollama
            const ollamaResponse = await fetch('/api/test-ollama');
            if (ollamaResponse.ok) {
                this.ollamaStatus.textContent = '🟢 Connecté';
                this.ollamaStatus.style.color = '#28a745';
            } else {
                throw new Error('Ollama non disponible');
            }
        } catch (error) {
            this.ollamaStatus.textContent = '🔴 Déconnecté';
            this.ollamaStatus.style.color = '#dc3545';
        }

        try {
            // Test de connexion LED (sans modifier les LEDs)
            const ledResponse = await fetch('/api/test-led-connection');
            
            if (ledResponse.ok) {
                this.ledStatus.textContent = '🟢 Connecté';
                this.ledStatus.style.color = '#28a745';
            } else {
                throw new Error('LEDs non disponibles');
            }
        } catch (error) {
            this.ledStatus.textContent = '🔴 Déconnecté';
            this.ledStatus.style.color = '#dc3545';
        }
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const history = await response.json();
            
            this.historyList.innerHTML = '';
            
            if (history.length === 0) {
                this.historyList.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">Aucun historique</p>';
                return;
            }

            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const time = new Date(item.timestamp).toLocaleString('fr-FR');
                const rgb = JSON.parse(item.rgb_values);
                
                historyItem.innerHTML = `
                    <div class="history-time">${time}</div>
                    <div class="history-message">${item.user_message}</div>
                    <div class="history-rgb">RGB(${rgb.r}, ${rgb.g}, ${rgb.b})</div>
                `;
                
                this.historyList.appendChild(historyItem);
            });
        } catch (error) {
            console.error('Erreur chargement historique:', error);
            this.historyList.innerHTML = '<p style="text-align: center; color: #dc3545;">Erreur de chargement</p>';
        }
    }

    // Reconnaissance vocale
    initVoiceRecognition() {
        // Détection du navigateur
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        const isChrome = navigator.userAgent.toLowerCase().includes('chrome');
        const isEdge = navigator.userAgent.toLowerCase().includes('edg');
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Reconnaissance vocale non supportée');
            this.voiceButton.disabled = true;
            
            if (isFirefox) {
                this.voiceButton.title = 'Firefox: Reconnaissance vocale limitée. Utilisez Chrome/Edge pour une meilleure expérience';
                this.browserInfo.textContent = '⚠️ Pour la reconnaissance vocale, utilisez Chrome ou Edge';
                this.browserInfo.classList.add('show');
            } else {
                this.voiceButton.title = 'Reconnaissance vocale non supportée par ce navigateur';
                this.browserInfo.textContent = '❌ Reconnaissance vocale non supportée par ce navigateur';
                this.browserInfo.classList.add('show');
            }
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = 'fr-FR';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.voiceButton.classList.add('listening');
            this.voiceStatus.textContent = '🎤 Écoute en cours... Parlez maintenant !';
            console.log('Reconnaissance vocale démarrée');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Texte reconnu:', transcript);
            this.messageInput.value = transcript;
            this.voiceStatus.textContent = `✅ Reconnu: "${transcript}"`;
            
            // Envoyer automatiquement le message après reconnaissance
            setTimeout(() => {
                this.sendMessage();
            }, 500);
        };

        this.recognition.onerror = (event) => {
            console.error('Erreur reconnaissance vocale:', event.error);
            this.isListening = false;
            this.voiceButton.classList.remove('listening');
            
            let errorMessage = 'Erreur de reconnaissance vocale';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = '❌ Aucune parole détectée';
                    break;
                case 'audio-capture':
                    errorMessage = '❌ Microphone non accessible';
                    break;
                case 'not-allowed':
                    errorMessage = '❌ Permission microphone refusée';
                    break;
                case 'network':
                    errorMessage = '❌ Erreur réseau';
                    break;
                default:
                    errorMessage = `❌ Erreur: ${event.error}`;
            }
            
            this.voiceStatus.textContent = errorMessage;
            setTimeout(() => {
                this.voiceStatus.textContent = '';
            }, 3000);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.voiceButton.classList.remove('listening');
            if (this.voiceStatus.textContent.includes('Écoute en cours')) {
                this.voiceStatus.textContent = '🔇 Écoute terminée';
                setTimeout(() => {
                    this.voiceStatus.textContent = '';
                }, 2000);
            }
            console.log('Reconnaissance vocale terminée');
        };
    }

    toggleVoiceRecognition() {
        if (!this.recognition) {
            this.voiceStatus.textContent = '❌ Reconnaissance vocale non disponible';
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            this.voiceStatus.textContent = '🔇 Arrêt de l\'écoute...';
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Erreur démarrage reconnaissance:', error);
                this.voiceStatus.textContent = '❌ Impossible de démarrer l\'écoute';
            }
        }
    }

    // Méthodes utilitaires pour les tests
    async testConnection() {
        console.log('Test de connexion...');
        await this.checkStatus();
    }

    async testLED(r = 255, g = 0, b = 0) {
        console.log(`Test LED: R=${r}, G=${g}, B=${b}`);
        try {
            const response = await fetch('/api/test-led', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ r, g, b })
            });
            
            const data = await response.json();
            console.log('Réponse test LED:', data);
            
            if (response.ok) {
                this.updateColor({ r, g, b });
            }
        } catch (error) {
            console.error('Erreur test LED:', error);
        }
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.ledController = new LEDController();
    
    // Exposer quelques fonctions pour le debug
    window.testLED = (r, g, b) => window.ledController.testLED(r, g, b);
    window.testConnection = () => window.ledController.testConnection();
    
    console.log('🌈 Contrôleur LEDs RGB initialisé');
    console.log('Commandes de debug disponibles:');
    console.log('- testLED(r, g, b) : Tester les LEDs avec des valeurs RGB');
    console.log('- testConnection() : Tester les connexions');
});
