# Backend Deployment to AWS ECS

## Features Implemented

### Core Functionality
- ✅ User Authentication (JWT-based)
- ✅ Role-based Access Control (Admin, Owner, Driver, Customer)
- ✅ Vehicle Management (CRUD operations)
- ✅ Booking System (Create, Update, Track bookings)
- ✅ Admin Dashboard APIs
- ✅ Email Notifications (SMTP)
- ✅ Redis Caching for performance
- ✅ MongoDB Database integration
- ✅ RESTful API design
- ✅ Error handling and validation
- ✅ Health check endpoint

### Security Features
- ✅ JWT token authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS configuration
- ✅ Input validation
- ✅ Secure environment variable handling

### DevOps Features
- ✅ Dockerized application
- ✅ CI/CD pipeline with GitHub Actions
- ✅ AWS ECS deployment
- ✅ Container health checks
- ✅ CloudWatch logging

---

## Environment Variables

### Development (.env)
```env
# Environment
NODE_ENV=development

# Server Configuration
PORT=5000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/fleet_management

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=Fleet Management <your-email@gmail.com>

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Production (AWS Secrets Manager)
```env
# Environment
NODE_ENV=production

# Server Configuration
PORT=5000

# MongoDB Configuration (DocumentDB or MongoDB Atlas)
MONGO_URI=mongodb://username:password@docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/fleet_management?retryWrites=false&tls=true&tlsCAFile=global-bundle.pem

# Redis Configuration (ElastiCache)
REDIS_URL=redis://your-elasticache-cluster.xxxxx.0001.use1.cache.amazonaws.com:6379

# JWT Configuration
JWT_SECRET=production-super-secret-key-min-32-characters-long

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=production-email@gmail.com
SMTP_PASS=production-app-password
SMTP_FROM=Fleet Management <production-email@gmail.com>

# CORS Configuration (Production Frontend URLs)
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

---

## Deployment Steps

### Step 1: Project Structure
```
FinalAssignment-Backend/
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── bookingController.js
│   └── vehicleController.js
├── middleware/
│   └── auth.js
├── models/
│   ├── Booking.js
│   ├── User.js
│   └── Vehicle.js
├── routes/
│   ├── admin.js
│   ├── auth.js
│   ├── booking.js
│   ├── utils.js
│   └── vehicle.js
├── utils/
│   └── mailer.js
├── .dockerignore
├── .env
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── index.js
├── package.json
├── README.md
└── seed.js
```

### Step 2: Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
```

### Step 3: Create .dockerignore
```
node_modules
npm-debug.log
.env
.env.*
.git
.gitignore
*.md
.DS_Store
.vscode
.idea
coverage
```

### Step 4: Create docker-compose.yml (Local Testing)
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/fleet_management
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=local-dev-secret
      - ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  mongodb_data:
```

### Step 5: Update CORS in index.js
```javascript
// Add this after app initialization
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Step 6: Test Locally with Docker
```bash
# Build and run
docker-compose up --build

# Test API
curl http://localhost:5000

# Stop
docker-compose down
```

### Step 7: Set Up AWS Infrastructure

#### 7.1 Create ECR Repository
```bash
aws ecr create-repository \
  --repository-name fleet-backend \
  --region us-east-1
```

#### 7.2 Set Up MongoDB (Choose One)

**Option A: MongoDB Atlas (Recommended - Free Tier Available)**
1. Go to https://www.mongodb.com/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0`
5. Get connection string

**Option B: AWS DocumentDB**
```bash
# Via AWS Console:
# 1. Amazon DocumentDB → Create cluster
# 2. Instance class: db.t3.medium
# 3. Username/password
# 4. VPC configuration
```

#### 7.3 Set Up Redis (ElastiCache)
```bash
# Via AWS Console:
# 1. ElastiCache → Create Redis cluster
# 2. Node type: cache.t3.micro
# 3. VPC configuration
# 4. Security group: Allow port 6379
```

#### 7.4 Store Secrets in AWS Secrets Manager
```bash
# MongoDB URI
aws secretsmanager create-secret \
  --name fleet/mongodb-uri \
  --secret-string "your-mongodb-connection-string"

# JWT Secret
aws secretsmanager create-secret \
  --name fleet/jwt-secret \
  --secret-string "your-jwt-secret-key"

# Redis URL
aws secretsmanager create-secret \
  --name fleet/redis-url \
  --secret-string "redis://your-elasticache-endpoint:6379"

# SMTP Password
aws secretsmanager create-secret \
  --name fleet/smtp-password \
  --secret-string "your-smtp-password"
```

### Step 8: Create ECS Task Definition

Create `task-definition.json`:
```json
{
  "family": "fleet-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "fleet-backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fleet-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5000"
        },
        {
          "name": "SMTP_HOST",
          "value": "smtp.gmail.com"
        },
        {
          "name": "SMTP_PORT",
          "value": "465"
        },
        {
          "name": "SMTP_SECURE",
          "value": "true"
        },
        {
          "name": "SMTP_USER",
          "value": "your-email@gmail.com"
        },
        {
          "name": "SMTP_FROM",
          "value": "Fleet Management <your-email@gmail.com>"
        },
        {
          "name": "ALLOWED_ORIGINS",
          "value": "https://yourdomain.com,https://admin.yourdomain.com"
        }
      ],
      "secrets": [
        {
          "name": "MONGO_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:fleet/mongodb-uri"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:fleet/jwt-secret"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:fleet/redis-url"
        },
        {
          "name": "SMTP_PASS",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:fleet/smtp-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fleet-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "node -e \"require('http').get('http://localhost:5000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### Step 9: Create Application Load Balancer

Via AWS Console:
1. EC2 → Load Balancers → Create ALB
2. Select public subnets
3. Security group: Allow HTTP (80) and HTTPS (443)
4. Create target group:
   - Target type: IP
   - Protocol: HTTP, Port: 5000
   - Health check path: `/`

### Step 10: Create ECS Cluster and Service
```bash
# Create cluster
aws ecs create-cluster --cluster-name fleet-cluster

# Create service
aws ecs create-service \
  --cluster fleet-cluster \
  --service-name fleet-backend-service \
  --task-definition fleet-backend-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:xxx:targetgroup/fleet-backend/xxx,containerName=fleet-backend,containerPort=5000"
```

### Step 11: Set Up GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: fleet-backend
  ECS_SERVICE: fleet-backend-service
  ECS_CLUSTER: fleet-cluster

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v3
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Force new deployment
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
```

### Step 12: Add GitHub Secrets

Go to GitHub → Settings → Secrets → Actions, add:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ACCOUNT_ID`

### Step 13: Deploy
```bash
git add .
git commit -m "Deploy backend to AWS ECS"
git push origin main
```

GitHub Actions will automatically:
1. Build Docker image
2. Push to ECR
3. Deploy to ECS

### Step 14: Get Backend URL
```bash
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Your backend URL:
# http://your-alb-xxxxx.us-east-1.elb.amazonaws.com
```

### Step 15: Update Frontend Configuration

In Next.js and React Admin apps, update `.env.production`:
```env
NEXT_PUBLIC_API_URL=http://your-alb-xxxxx.us-east-1.elb.amazonaws.com
# Or with custom domain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create vehicle (Owner)
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Admin
- `GET /api/admin/users` - List all users (Admin)
- `GET /api/admin/stats` - Dashboard statistics (Admin)
- `PUT /api/admin/users/:id` - Update user (Admin)
- `DELETE /api/admin/users/:id` - Delete user (Admin)

### Utils
- `GET /api/utils/health` - Health check

---

## Monitoring

### View Logs
```bash
aws logs tail /ecs/fleet-backend --follow
```

### Check Service Status
```bash
aws ecs describe-services \
  --cluster fleet-cluster \
  --services fleet-backend-service
```

---

## Architecture

```
Frontend (S3 + CloudFront)
           ↓
Application Load Balancer
           ↓
    ECS Fargate Cluster
    (Node.js Backend)
       ↙        ↘
ElastiCache   DocumentDB/Atlas
  (Redis)      (MongoDB)
```

---

## Cost Estimate (Monthly)

- ECS Fargate (2 tasks): ~$30
- MongoDB Atlas (Free Tier): $0
- ElastiCache (t3.micro): ~$12
- Application Load Balancer: ~$20
- **Total: ~$62/month**

---

## Technologies Used

### Backend
- Node.js 18
- Express.js
- MongoDB (Mongoose)
- Redis
- JWT Authentication
- Bcrypt
- Nodemailer

### DevOps
- Docker
- GitHub Actions
- AWS ECS (Fargate)
- AWS ECR
- AWS Secrets Manager
- AWS CloudWatch
- AWS Application Load Balancer

### Database
- MongoDB (DocumentDB or Atlas)
- Redis (ElastiCache)

---

## Security Best Practices Implemented

✅ Environment-based CORS configuration  
✅ Secrets stored in AWS Secrets Manager  
✅ Password hashing with bcrypt  
✅ JWT token authentication  
✅ Input validation  
✅ Health check endpoints  
✅ Secure Docker image (production dependencies only)  
✅ Network isolation with security groups  
✅ HTTPS support via ALB  
✅ CloudWatch logging enabled
