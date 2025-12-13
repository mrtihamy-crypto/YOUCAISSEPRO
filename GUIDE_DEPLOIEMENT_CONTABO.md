# 🚀 Guide de Déploiement YOU CAISSE PRO sur Contabo VPS

## 📋 Prérequis

Vous devez avoir :
- ✅ Votre VPS Contabo activé (Ubuntu 24.04)
- ✅ Email de Contabo avec IP et mot de passe root
- ✅ Connexion Internet

---

## 🔌 Étape 1 : Se connecter au serveur

### Option A : Depuis Windows PowerShell

```powershell
ssh root@VOTRE_IP_SERVEUR
```

Remplacez `VOTRE_IP_SERVEUR` par l'IP reçue par email de Contabo.

### Option B : Avec PuTTY (plus simple pour Windows)

1. Téléchargez PuTTY : https://www.putty.org/
2. Ouvrez PuTTY
3. Dans "Host Name" : entrez votre IP
4. Port : 22
5. Cliquez "Open"
6. Login : `root`
7. Password : celui reçu par email

---

## 📤 Étape 2 : Uploader le script d'installation

### Méthode 1 : Copier-coller (Recommandée)

Une fois connecté en SSH :

```bash
# Créer le fichier
nano deploy-contabo.sh
```

Copiez tout le contenu du fichier `deploy-contabo.sh` depuis votre PC et collez-le dans le terminal :
- **PuTTY** : Clic droit pour coller
- **PowerShell** : Clic droit ou Ctrl+V

Appuyez sur `Ctrl+X`, puis `Y`, puis `Entrée` pour sauvegarder.

### Méthode 2 : Avec WinSCP (Alternative)

1. Téléchargez WinSCP : https://winscp.net/
2. Connectez-vous :
   - Protocole : SCP
   - Host : Votre IP
   - User : root
   - Password : votre mot de passe
3. Uploadez le fichier `deploy-contabo.sh` vers `/root/`

---

## ⚙️ Étape 3 : Lancer l'installation automatique

```bash
# Rendre le script exécutable
chmod +x deploy-contabo.sh

# Lancer l'installation
bash deploy-contabo.sh
```

Le script va vous demander :
1. **IP/Domaine du serveur** : Entrez l'IP de votre VPS
2. **Mot de passe base de données** : Choisissez un mot de passe fort
3. **JWT Secret** : Appuyez sur Entrée pour générer automatiquement
4. **Confirmation** : Tapez `y` et appuyez sur Entrée

⏱️ L'installation prend **5-10 minutes**.

---

## 📦 Étape 4 : Uploader le code de l'application

### Option A : Avec WinSCP (Recommandée - Plus simple)

1. Ouvrez WinSCP et connectez-vous
2. Sur votre PC, naviguez vers `C:\Users\mrtih\Desktop\YOU CAISSE PRO`
3. Sélectionnez les dossiers `backend` et `frontend`
4. Glissez-déposez vers `/var/www/youcaisse/` sur le serveur

### Option B : Avec SCP depuis PowerShell

```powershell
# Sur votre PC Windows
cd "C:\Users\mrtih\Desktop\YOU CAISSE PRO"

# Uploader backend
scp -r backend root@VOTRE_IP:/var/www/youcaisse/

# Uploader frontend
scp -r frontend root@VOTRE_IP:/var/www/youcaisse/
```

### Option C : Avec Git (Si vous avez un repo)

```bash
# Sur le serveur
cd /var/www/youcaisse
git clone https://github.com/VOTRE_USERNAME/YOUCAISSEPRO.git .
```

---

## 🚀 Étape 5 : Déployer l'application

Une fois le code uploadé, sur le serveur :

```bash
cd /var/www/youcaisse
bash deploy.sh
```

Le script va :
- ✅ Installer les dépendances Node.js
- ✅ Compiler le backend TypeScript
- ✅ Exécuter les migrations de base de données
- ✅ Build le frontend React
- ✅ Démarrer l'application avec PM2

---

## ✅ Étape 6 : Vérifier que tout fonctionne

### Vérifier le statut des services

```bash
# Status de l'application
pm2 status

# Logs en temps réel
pm2 logs youcaisse-backend

# Vérifier Nginx
systemctl status nginx

# Vérifier PostgreSQL
systemctl status postgresql
```

### Tester l'application

Ouvrez votre navigateur et allez sur :
```
http://VOTRE_IP_SERVEUR
```

Vous devriez voir la page de connexion de YOU CAISSE PRO ! 🎉

---

## 🔧 Commandes utiles

### Gestion de l'application

```bash
# Redémarrer le backend
pm2 restart youcaisse-backend

# Voir les logs
pm2 logs youcaisse-backend

# Voir le status
pm2 status

# Arrêter l'application
pm2 stop youcaisse-backend

# Démarrer l'application
pm2 start youcaisse-backend
```

### Mise à jour de l'application

```bash
# 1. Uploader le nouveau code (WinSCP ou SCP)
# 2. Redéployer
cd /var/www/youcaisse
bash deploy.sh
```

### Logs et diagnostics

```bash
# Logs backend
pm2 logs youcaisse-backend

# Logs Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Logs PostgreSQL
tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## 🌐 Étape 7 : Configurer les appareils clients

Une fois le serveur déployé, vous devez configurer vos tablettes/PC pour se connecter au serveur.

### Sur chaque appareil client :

1. Ouvrez le navigateur
2. Allez sur : `http://VOTRE_IP_SERVEUR`
3. Connectez-vous avec vos identifiants

**Pour une application mobile/tablette** :
- Le frontend doit pointer vers l'API du serveur
- Cela se configure automatiquement via `VITE_API_URL`

---

## 🔒 Sécurité (Optionnel mais recommandé)

### Configurer un nom de domaine

Si vous avez un domaine (ex: `youcaisse.com`) :

1. Pointez votre domaine vers l'IP du serveur (DNS A record)
2. Modifiez `/etc/nginx/sites-available/youcaisse` :
   ```nginx
   server_name youcaisse.com www.youcaisse.com;
   ```
3. Redémarrez Nginx : `systemctl reload nginx`

### Installer SSL/HTTPS (Gratuit avec Let's Encrypt)

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL (remplacez par votre domaine)
certbot --nginx -d youcaisse.com -d www.youcaisse.com

# Le certificat se renouvelle automatiquement
```

---

## 🐛 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
pm2 logs youcaisse-backend

# Vérifier la base de données
sudo -u postgres psql -c "\l"

# Vérifier la configuration
cat /var/www/youcaisse/backend/.env
```

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL tourne
systemctl status postgresql

# Réinitialiser la base de données
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS youcaisse;
CREATE DATABASE youcaisse;
GRANT ALL PRIVILEGES ON DATABASE youcaisse TO youcaisse;
EOF

# Relancer les migrations
cd /var/www/youcaisse/backend
npm run migrate
```

### Le frontend ne se charge pas

```bash
# Vérifier Nginx
nginx -t
systemctl status nginx

# Vérifier les permissions
ls -la /var/www/youcaisse/frontend/dist/

# Rebuild le frontend
cd /var/www/youcaisse/frontend
npm run build
systemctl reload nginx
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs : `pm2 logs`
2. Vérifiez que tous les services tournent
3. Vérifiez les configurations dans les fichiers `.env`

---

## 🎉 Félicitations !

Votre application YOU CAISSE PRO est maintenant déployée sur Contabo !

**Accès à votre application :**
- URL : `http://VOTRE_IP_SERVEUR`
- Backend API : `http://VOTRE_IP_SERVEUR:3001/api`

**Prochaines étapes :**
1. Créer vos utilisateurs (admin, caissiers, serveurs)
2. Configurer vos catégories et produits
3. Configurer les imprimantes
4. Former votre équipe

Bon succès avec YOU CAISSE PRO ! 🚀
