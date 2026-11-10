# Deployment — Angular + Spring Boot + MySQL sur Kubernetes

Application de démonstration full-stack (CRUD utilisateurs) conteneurisée et déployée sur un cluster Kubernetes local.

## Architecture

```
Navigateur
   │
   ▼
Ingress nginx (app-tls)
   ├── /            → angular-service :80   (front Angular servi par nginx)
   └── /api(/|$)(.*) → spring-service :8081  (API Spring Boot, rewrite /$2)
                          │
                          ▼
                    mysql-service :3306 (MySQL 8, PV hostPath)
```

- **angular-app** : frontend Angular 16, build multi-stage (Node 16 → nginx).
  Au démarrage, le conteneur génère `/usr/share/nginx/html/config.js` à partir de la variable `API_URL` (ConfigMap `angular-config`), lue par `src/environments/environment.ts`.
- **springboot/app** : API REST Spring Boot (Java 17, Maven), port `8081`.
  Endpoints : `GET /user/all`, `POST /user/add`, `DELETE /user/delete/{id}`.
  Configuration par variables d'environnement (`SPRING_DATASOURCE_*`, `CORS_ALLOWED_ORIGIN`).
- **k8s** : manifests de déploiement (Deployments, Services, ConfigMaps, Secret, PV/PVC, Ingress).

## Structure du projet

```
deployment/
├── angular-app/          # Frontend Angular 16 + Dockerfile + nginx.conf
├── springboot/app/       # API Spring Boot + Dockerfile + mvnw
└── k8s/
    ├── angular-deployment.yaml   # Deployment + Service Angular
    ├── spring-deployment.yaml    # Deployment + Service Spring
    ├── mysql-deployment.yaml     # Deployment + Service MySQL
    ├── mysql-pv-pvc.yaml         # PersistentVolume + PersistentVolumeClaim
    ├── configmap.yaml            # app-config (datasource URL, CORS) + angular-config
    ├── secret.yaml               # app-secret (identifiants MySQL, base64)
    └── ingress.yaml              # Ingress Angular (/) et Spring (/api)
```

## Prérequis

- Docker
- kubectl et un cluster Kubernetes avec l'**ingress-nginx** installé
- Un StorageClass supportant les volumes hostPath (ou adapter `mysql-pv-pvc.yaml`)
- Node.js 16+ et JDK 17 + Maven (pour exécution locale)

## Exécution locale

### API Spring Boot

```bash
cd springboot/app
export SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3306/demo?useSSL=false&allowPublicKeyRetrieval=true"
export SPRING_DATASOURCE_USERNAME=root
export SPRING_DATASOURCE_PASSWORD=<mot_de_passe>
export CORS_ALLOWED_ORIGIN="http://localhost:4200"
./mvnw spring-boot:run
```

### Frontend Angular

```bash
cd angular-app
npm install
npm start
```

Le proxy de développement (`proxy.config.json`) redirige `/api` vers l'API — adaptez la cible si nécessaire.

## Construction des images Docker

```bash
# API Spring Boot (générer d'abord target/demo-0.0.1.jar avec ./mvnw package)
cd springboot/app
docker build -t lotfimakhlouf2/spring-app:1.0 .
docker push lotfimakhlouf2/spring-app:1.0

# Frontend Angular
cd angular-app
docker build -t lotfimakhlouf2/angular-app:1.0 .
docker push lotfimakhlouf2/angular-app:1.0
```

## Déploiement Kubernetes

```bash
# 1. Secret et ConfigMaps
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# 2. Stockage
kubectl apply -f k8s/mysql-pv-pvc.yaml

# 3. Bases de données et applications
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/spring-deployment.yaml
kubectl apply -f k8s/angular-deployment.yaml

# 4. Routage externe
kubectl apply -f k8s/ingress.yaml

# Vérification
kubectl get pods,svc,ingress
```

## Points d'attention

- **Secret TLS** : les Ingress référencent `app-tls` ; créez-le avant l'application (ou retirez la section `tls`) :
  ```bash
  kubectl create secret tls app-tls --cert=tls.crt --key=tls.key
  ```
- **`CORS_ALLOWED_ORIGIN`** dans `configmap.yaml` doit correspondre à l'URL d'accès réelle du frontend.
- **Persistance MySQL** : le PV utilise un `hostPath` `/mnt/data/mysql` avec une `nodeAffinity` sur le nœud `slave` — à adapter à votre cluster.
- Les images sont en `imagePullPolicy: IfNotPresent` ; en cas de cluster multi-nœuds, préférer un registry (Docker Hub / registry privé).
- Le Secret contient des identifiants de démonstration encodés en base64 (non chiffrés) — à remplacer en production.
