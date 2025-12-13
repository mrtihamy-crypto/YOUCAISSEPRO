# 🔧 DÉPLOIEMENT MANUEL SUR RENDER (Si Blueprint ne fonctionne pas)

## Si vous ne trouvez pas le dépôt dans Blueprint

Créez les services manuellement en suivant ces étapes :

---

## ÉTAPE 1 : Créer la Base de Données PostgreSQL

1. Dans Render Dashboard, cliquez **"New +"** → **"PostgreSQL"**
2. Configurez :
   - **Name** : `you-caisse-db`
   - **Database** : `youcaisse`
   - **User** : `youcaisse_user`
   - **Region** : Europe (Frankfurt)
   - **Plan** : Free
3. Cliquez **"Create Database"**
4. ⏱️ Attendez 1-2 minutes que la DB soit créée
5. **Copiez l'URL de connexion** (Internal Database URL)

---

## ÉTAPE 2 : Déployer le Backend

1. Cliquez **"New +"** → **"Web Service"**
2. Connectez votre dépôt GitHub **`YOUCAISSEPRO`**
3. Configurez :
   - **Name** : `you-caisse-backend`
   - **Region** : Europe (Frankfurt)
   - **Branch** : `main`
   - **Root Directory** : `backend`
   - **Runtime** : Docker
   - **Docker Command** : (laisser vide, utilise le Dockerfile)

4. **Variables d'environnement** (onglet "Environment") :
   ```
   NODE_ENV = production
   PORT = 3001
   DATABASE_URL = [Collez l'URL de la DB créée à l'étape 1]
   JWT_SECRET = [Générez une clé aléatoire ou utilisez: render-jwt-secret-2024]
   ```

5. **Plan** : Free
6. Cliquez **"Create Web Service"**
7. ⏱️ Attendez 5-10 minutes que le build se termine

---

## ÉTAPE 3 : Déployer le Frontend

1. Cliquez **"New +"** → **"Web Service"**
2. Connectez votre dépôt GitHub **`YOUCAISSEPRO`**
3. Configurez :
   - **Name** : `you-caisse-frontend`
   - **Region** : Europe (Frankfurt)
   - **Branch** : `main`
   - **Root Directory** : `frontend`
   - **Runtime** : Docker
   - **Docker Command** : (laisser vide)

4. **Variables d'environnement** :
   ```
   VITE_API_URL = https://you-caisse-backend.onrender.com
   ```
   ⚠️ Remplacez par l'URL exacte de votre backend (copiez depuis l'étape 2)

5. **Plan** : Free
6. Cliquez **"Create Web Service"**
7. ⏱️ Attendez 5-10 minutes

---

## ÉTAPE 4 : Vérifier le Déploiement

Une fois tous les services créés :

1. Ouvrez le **Frontend URL** (ex: `https://you-caisse-frontend.onrender.com`)
2. Testez la connexion :
   - Username : `admin`
   - Password : `admin123`

---

## ✅ CHECKLIST POST-DÉPLOIEMENT

- [ ] Base de données créée et active
- [ ] Backend déployé sans erreur
- [ ] Frontend déployé sans erreur
- [ ] Frontend peut communiquer avec le Backend
- [ ] Connexion admin fonctionne

---

## 🆘 DÉPANNAGE

### Backend ne démarre pas
→ Vérifiez les logs dans Render Dashboard → Backend → Logs
→ Vérifiez que DATABASE_URL est bien défini

### Frontend ne charge pas
→ Vérifiez que VITE_API_URL pointe vers le bon backend
→ Ouvrez la console navigateur (F12) pour voir les erreurs

### Erreur CORS
→ Le backend doit accepter les requêtes du frontend
→ Vérifiez que CORS_ORIGIN est bien configuré dans le backend

---

## 📞 LIENS UTILES

- **Render Dashboard** : https://dashboard.render.com
- **Render Docs** : https://render.com/docs
- **GitHub Repo** : https://github.com/mrtihamy-crypto/YOUCAISSEPRO

---

**Temps total estimé : 15-20 minutes**
