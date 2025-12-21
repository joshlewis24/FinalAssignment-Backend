3️⃣ Node + Express Backend (API)

The backend must be Dockerized and deployed to AWS ECS, with CI/CD pipeline in GitHub Actions.

Prerequisites

Docker installed

AWS CLI installed and configured

GitHub repository with GitHub Actions enabled

AWS ECR repository created

ECS cluster and service created

Step 1: Dockerize Backend
1. Clone repository
git clone <BACKEND_REPO_URL>
cd backend

2. Create Dockerfile
FROM node:18-alpine

# Install Redis
RUN apk add --no-cache redis

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose ports
EXPOSE 5000 6379

# Start Redis + backend
CMD redis-server --daemonize yes && npm start

3. Build Docker image locally
docker build -t fleet-backend .

4. Test Docker container locally
docker run -p 5000:5000 fleet-backend


Ensure API works at http://localhost:5000.

Step 2: Push Backend Code to GitHub
git add .
git commit -m "Dockerized backend"
git push origin main

Step 3: CI/CD Pipeline (GitHub Actions)
3.1 Add GitHub Secrets

Go to GitHub → Settings → Secrets → Actions and add:

AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_ACCOUNT_ID

3.2 Create workflow .github/workflows/ecr.yml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: aws-actions/configure-aws-credentials@v3
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - uses: aws-actions/amazon-ecr-login@v2

      - name: Build Docker image
        run: docker build -t fleet-backend .

      - name: Tag Docker image
        run: |
          docker tag fleet-backend:latest \
          ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/fleet-backend:latest

      - name: Push Docker image
        run: |
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/fleet-backend:latest


✅ This will build and push Docker image to AWS ECR automatically when main branch is updated.

Step 4: Manual ECS Deployment

Go to ECS → Task Definitions → Create new revision

Update container image URI:

<AWS_ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/fleet-backend:latest


Go to ECS Service → Update service → Force new deployment

Wait for service to start running → copy ALB DNS URL

Step 5: Update Frontend Apps

Update .env.production in both Next.js and React Admin with ECS ALB URL

Rebuild and redeploy S3 frontends

✅ Connectivity Notes

Both frontends must point to ECS backend ALB URL.

Enable CORS in backend:

app.use(cors({ origin: "*" }));
