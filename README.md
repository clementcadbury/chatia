# ChatIA - Interface Web pour Ollama

Interface de chat simple et moderne pour votre modèle Llama 3.2 sur Raspberry Pi.

## 🚀 Installation Rapide

### Option 1 : Ollama déjà installé (votre cas)

```bash
# Utilisez le docker-compose pour Ollama existant
docker-compose -f docker-compose-existing-ollama.yml up -d
```

### Option 2 : Installation complète (Ollama + Open WebUI)

```bash
# Installation complète
docker-compose up -d
```

## 📋 Étapes d'installation

### 1. Cloner ou télécharger les fichiers
```bash
# Dans votre dossier de projet
wget https://raw.githubusercontent.com/.../docker-compose-existing-ollama.yml
```

### 2. Vérifier que votre Ollama fonctionne
```bash
# Tester votre container Ollama
curl http://localhost:11434/api/tags
```

### 3. Lancer Open WebUI
```bash
docker-compose -f docker-compose-existing-ollama.yml up -d
```

### 4. Accéder à l'interface
Ouvrez votre navigateur : **http://localhost:3000**

## 🔧 Configuration

### Variables d'environnement importantes :

- `OLLAMA_BASE_URL` : URL de votre service Ollama
- `WEBUI_NAME` : Nom de votre interface
- `DEFAULT_MODELS` : Modèle par défaut (llama3.2)
- `ENABLE_SIGNUP` : Autoriser les inscriptions (false par défaut)

### Ports utilisés :
- **3000** : Interface Web Open WebUI
- **11434** : API Ollama (votre container existant)

## 🛠️ Commandes utiles

```bash
# Voir les logs
docker-compose -f docker-compose-existing-ollama.yml logs -f

# Arrêter les services
docker-compose -f docker-compose-existing-ollama.yml down

# Redémarrer
docker-compose -f docker-compose-existing-ollama.yml restart

# Mettre à jour Open WebUI
docker-compose -f docker-compose-existing-ollama.yml pull
docker-compose -f docker-compose-existing-ollama.yml up -d
```

## 🔍 Dépannage

### Problème de connexion à Ollama :
1. Vérifiez que votre container Ollama fonctionne : `docker ps`
2. Testez l'API : `curl http://localhost:11434/api/tags`
3. Vérifiez les logs : `docker logs open-webui`

### Changer l'URL d'Ollama :
Si votre Ollama est sur une autre adresse, modifiez dans le docker-compose :
```yaml
- OLLAMA_BASE_URL=http://VOTRE_IP:11434
```

## 📱 Fonctionnalités

- ✅ Interface moderne similaire à ChatGPT
- ✅ Historique des conversations
- ✅ Support multi-modèles
- ✅ Paramètres de génération ajustables
- ✅ Import/Export des conversations
- ✅ Mode sombre/clair
- ✅ Responsive (mobile-friendly)

## 🎯 Première utilisation

1. Accédez à http://localhost:3000
2. Créez un compte administrateur
3. Sélectionnez le modèle "llama3.2"
4. Commencez à chatter !

Profitez de votre assistant IA local ! 🤖
