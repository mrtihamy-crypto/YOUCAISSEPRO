# 📦 GUIDE D'INSTALLATION - YOU CAISSE PRO
## Installation chez le Client

---

## ✅ PRÉREQUIS

Avant l'installation, le PC client doit avoir :

1. **Windows 10/11** (64-bit)
2. **Node.js 20.x** installé
   - Télécharger : https://nodejs.org/
   - Choisir la version LTS (Long Term Support)
3. **Connexion Internet** (pour la première installation uniquement)
4. **Droits administrateur** sur le PC

---

## 📋 ÉTAPES D'INSTALLATION

### **1️⃣ Copier les fichiers**

1. Copiez le fichier `YOU-CAISSE-PRO-INSTALLATION.zip` sur une clé USB
2. Allez sur le PC client
3. Copiez le ZIP sur le Bureau ou dans `C:\YOU-CAISSE-PRO`
4. **Clic droit** → **Extraire tout...**
5. Attendez la fin de l'extraction

### **2️⃣ Installer Node.js** (si pas déjà installé)

1. Ouvrez un terminal PowerShell
2. Tapez : `node --version`
3. Si erreur → Installez Node.js depuis https://nodejs.org/
4. Redémarrez le PC après installation

### **3️⃣ Installer les dépendances**

1. Ouvrez **PowerShell** en tant qu'administrateur
2. Allez dans le dossier :
   ```powershell
   cd "C:\YOU-CAISSE-PRO"
   ```

3. Installez le backend :
   ```powershell
   cd backend
   npm install
   cd ..
   ```

4. Installez le frontend :
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

### **4️⃣ Tester l'installation**

Double-cliquez sur `DEMARRER.bat`

✅ Si tout fonctionne, vous verrez :
```
Backend:  http://localhost:3001
Frontend: http://localhost:5173
```

Ouvrez http://localhost:5173 dans le navigateur

**Connexion par défaut :**
- Username : `admin`
- Password : `admin123`

### **5️⃣ Configuration réseau** (pour tablettes)

Pour que les tablettes/téléphones se connectent :

1. Notez l'adresse IP du PC (affichée au démarrage)
   Exemple : `http://192.168.1.100:5173`

2. Sur chaque tablette :
   - Ouvrez le navigateur
   - Entrez l'adresse IP du PC
   - Connectez-vous avec les identifiants

### **6️⃣ Démarrage automatique** (Optionnel)

Pour démarrer automatiquement au démarrage Windows :

1. Appuyez sur **Windows + R**
2. Tapez : `shell:startup`
3. Créez un raccourci vers `DEMARRER.bat` dans ce dossier

---

## 🔧 CONFIGURATION

### **Modifier le port (si besoin)**

Si le port 3001 ou 5173 est déjà utilisé :

1. Ouvrez `backend\.env` (créez-le si inexistant)
2. Ajoutez :
   ```
   PORT=3002
   ```

### **Base de données**

Par défaut, SQLite est utilisé (fichier `database.sqlite`)
- Pas de configuration nécessaire
- Les données sont dans `backend/database.sqlite`

### **Imprimantes thermiques**

1. Connectez l'imprimante (USB ou réseau)
2. Dans l'application : **Admin** → **Paramètres** → **Imprimantes**
3. Configurez l'imprimante BAR et CUISINE

---

## ❌ DÉPANNAGE

### **Erreur "Node.js non reconnu"**
➡️ Installez Node.js depuis https://nodejs.org/ et redémarrez le PC

### **Erreur "Port déjà utilisé"**
➡️ Changez le port dans `backend\.env`

### **Application ne démarre pas**
1. Ouvrez PowerShell dans le dossier
2. Tapez : `.\DEMARRER.bat`
3. Lisez les erreurs affichées

### **Tablettes ne se connectent pas**
1. Vérifiez que PC et tablettes sont sur le même réseau WiFi
2. Désactivez temporairement le pare-feu Windows
3. Vérifiez l'adresse IP du PC

### **Base de données corrompue**
➡️ Supprimez `backend/database.sqlite` et redémarrez
   (⚠️ Perd toutes les données !)

---

## 📞 SUPPORT

Pour toute assistance :
- Email : support@youcaisse.pro
- Tel : [VOTRE NUMÉRO]

---

## 🔒 SÉCURITÉ

**⚠️ IMPORTANT :**

1. **Changez le mot de passe admin** dès la première connexion
2. **Sauvegardez régulièrement** la base de données :
   - Copiez `backend/database.sqlite` sur clé USB
   - Ou utilisez le script `backend/backup-database.ps1`

3. **Limitez l'accès réseau** si nécessaire

---

## 📦 CONTENU DU PACKAGE

```
YOU-CAISSE-PRO/
├── backend/          → API + Base de données
├── frontend/         → Interface utilisateur
├── DEMARRER.bat      → Lance l'application
├── ARRETER.bat       → Arrête l'application
└── README.md         → Documentation
```

---

## ✅ CHECKLIST POST-INSTALLATION

- [ ] Node.js installé et fonctionnel
- [ ] Application démarre correctement
- [ ] Connexion admin fonctionne
- [ ] Mot de passe admin changé
- [ ] Tablettes/téléphones connectés
- [ ] Imprimantes configurées (si utilisées)
- [ ] Première sauvegarde effectuée
- [ ] Formation utilisateurs effectuée

---

**Version :** 1.0  
**Date :** Décembre 2025  
**Développeur :** YOU VOYAGE COMPANY
