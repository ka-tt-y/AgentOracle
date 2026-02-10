#!/bin/bash
set -e

# ─── Configuration ────────────────────────────────────────────────────
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BACKEND_REPO="agentoracle-backend"
ECR_FRONTEND_REPO="agentoracle-frontend"
STACK_NAME="agentoracle-production"

# ─── Load env vars ───────────────────────────────────────────────────
if [ -f .env ]; then
  echo "📄 Loading .env..."
  set -a
  source .env
  set +a
fi

# ─── Validate required env vars ──────────────────────────────────────
MISSING=""
[ -z "$MONGODB_URI" ] || [[ "$MONGODB_URI" == *"CHANGE_ME"* ]] && MISSING="$MISSING MONGODB_URI"
[ -z "$PRIVATE_KEY" ] && MISSING="$MISSING PRIVATE_KEY"
[ -z "$GROQ_API_KEY" ] && MISSING="$MISSING GROQ_API_KEY"
[ -z "$THEGRAPH_URL" ] && MISSING="$MISSING THEGRAPH_URL"
[ -z "$PINATA_JWT" ] && MISSING="$MISSING PINATA_JWT"

if [ -n "$MISSING" ]; then
  echo "❌ Missing required env vars in .env:$MISSING"
  echo ""
  echo "   Set them in .env before deploying."
  [ -z "$MONGODB_URI" ] || [[ "$MONGODB_URI" == *"CHANGE_ME"* ]] && echo "   💡 MONGODB_URI: Create free cluster at https://cloud.mongodb.com (M0 tier)"
  exit 1
fi

# Generate API_SECRET_KEY if not set
if [ -z "$API_SECRET_KEY" ]; then
  API_SECRET_KEY=$(openssl rand -hex 32)
  echo "🔑 Generated API_SECRET_KEY: $API_SECRET_KEY"
  echo "   Save this in your .env for future deployments."
fi

echo "🚀 Deploying AgentOracle to AWS..."
echo "   Region: $AWS_REGION"
echo "   Account: $AWS_ACCOUNT_ID"

# ─── ECR Setup ───────────────────────────────────────────────────────
echo "📦 Creating ECR repositories..."
aws ecr describe-repositories --repository-names $ECR_BACKEND_REPO 2>/dev/null || \
  aws ecr create-repository --repository-name $ECR_BACKEND_REPO --region $AWS_REGION
aws ecr describe-repositories --repository-names $ECR_FRONTEND_REPO 2>/dev/null || \
  aws ecr create-repository --repository-name $ECR_FRONTEND_REPO --region $AWS_REGION

aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com 2>/dev/null || true

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# ═══════════════════════════════════════════════════════════════════════
#  PHASE 1: Build & push images
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "🔨 [Phase 1/3] Building images..."
docker build --platform linux/amd64 -t $ECR_BACKEND_REPO -f Dockerfile .
docker tag $ECR_BACKEND_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_BACKEND_REPO:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_BACKEND_REPO:latest

docker build --platform linux/amd64 -t $ECR_FRONTEND_REPO -f Dockerfile.frontend .
docker tag $ECR_FRONTEND_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO:latest

# ═══════════════════════════════════════════════════════════════════════
#  PHASE 2: Deploy CloudFormation
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "☁️  [Phase 2/3] Deploying infrastructure..."

# Handle stuck/failed stacks
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
  echo "⏳ Stack is $STACK_STATUS — waiting..."
  aws cloudformation wait stack-create-complete --stack-name $STACK_NAME 2>/dev/null || \
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME 2>/dev/null || true
  STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
fi
if [[ "$STACK_STATUS" == *"ROLLBACK_COMPLETE"* || "$STACK_STATUS" == *"FAILED"* ]]; then
  echo "🗑️  Previous stack failed ($STACK_STATUS). Deleting..."
  aws cloudformation delete-stack --stack-name $STACK_NAME
  aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
fi

# Deploy
aws cloudformation deploy \
  --template-file aws/cloudformation.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    EnvironmentName=production \
    BackendImage=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_BACKEND_REPO:latest \
    FrontendImage=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO:latest \
    MongoDBUri="$MONGODB_URI" \
    PrivateKey="$PRIVATE_KEY" \
    GroqApiKey="$GROQ_API_KEY" \
    TheGraphUrl="$THEGRAPH_URL" \
    PinataJwt="$PINATA_JWT" \
    PinataGatewayUrl="$PINATA_GATEWAY_URL" \
    IdentityRegistryAddress="$IDENTITY_REGISTRY_ADDRESS" \
    HealthMonitorAddress="$HEALTH_MONITOR_ADDRESS" \
    ReputationRegistryAddress="$REPUTATION_REGISTRY_ADDRESS" \
    ApiSecretKey="$API_SECRET_KEY"

# ═══════════════════════════════════════════════════════════════════════
#  PHASE 3: Associate Elastic IP with backend
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "🔗 [Phase 3/3] Associating Elastic IP with backend..."

# Get the Elastic IP allocation ID from CloudFormation
BACKEND_EIP=$(aws cloudformation describe-stacks --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='BackendElasticIP'].OutputValue" --output text)

BACKEND_EIP_ALLOC=$(aws ec2 describe-addresses --public-ips "$BACKEND_EIP" \
  --query "Addresses[0].AllocationId" --output text 2>/dev/null || echo "")

# Get the backend task's ENI
BACKEND_TASK_ARN=$(aws ecs list-tasks --cluster production-cluster --service-name production-backend \
  --query "taskArns[0]" --output text 2>/dev/null || echo "")

if [ -n "$BACKEND_TASK_ARN" ] && [ "$BACKEND_TASK_ARN" != "None" ] && [ -n "$BACKEND_EIP_ALLOC" ]; then
  BACKEND_ENI=$(aws ecs describe-tasks --cluster production-cluster --tasks "$BACKEND_TASK_ARN" \
    --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

  if [ -n "$BACKEND_ENI" ] && [ "$BACKEND_ENI" != "None" ]; then
    # Disassociate if already associated somewhere
    EXISTING_ASSOC=$(aws ec2 describe-addresses --allocation-ids "$BACKEND_EIP_ALLOC" \
      --query "Addresses[0].AssociationId" --output text 2>/dev/null || echo "")
    if [ -n "$EXISTING_ASSOC" ] && [ "$EXISTING_ASSOC" != "None" ]; then
      aws ec2 disassociate-address --association-id "$EXISTING_ASSOC" 2>/dev/null || true
    fi

    aws ec2 associate-address --allocation-id "$BACKEND_EIP_ALLOC" --network-interface-id "$BACKEND_ENI"
    echo "✅ Elastic IP $BACKEND_EIP associated with backend ENI $BACKEND_ENI"
  else
    echo "⚠️  Backend ENI not found yet. You may need to re-run EIP association after task starts."
  fi
else
  echo "⚠️  Backend task not running yet or EIP not allocated. EIP association will need to be done manually."
fi

# ═══════════════════════════════════════════════════════════════════════
#  DONE
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Static IPs & Domain Setup:"
echo ""
echo "   Backend Elastic IP: $BACKEND_EIP"
echo "   → Point your domain's A record to this IP"
echo "   → e.g. api.yourdomain.com → $BACKEND_EIP"
echo "   → Backend URL: http://$BACKEND_EIP:4000"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Update frontend/.env with static backend IP:"
echo "   echo \"VITE_API_URL=http://$BACKEND_EIP:4000\" > frontend/.env"
echo "   echo \"VITE_API_SECRET_KEY=$API_SECRET_KEY\" >> frontend/.env"
echo ""
echo "2️⃣  Get test-agent IP for VITE_TEST_AGENT_URL:"
echo '   TEST_AGENT_IP=$(aws ecs list-tasks --cluster production-cluster --service-name production-test-agent --query "taskArns[0]" --output text | xargs -I{} aws ecs describe-tasks --cluster production-cluster --tasks {} --query "tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value" --output text | xargs -I{} aws ec2 describe-network-interfaces --network-interface-ids {} --query "NetworkInterfaces[0].Association.PublicIp" --output text)'
echo '   echo "VITE_TEST_AGENT_URL=http://$TEST_AGENT_IP:3001" >> frontend/.env'
echo ""
echo "3️⃣  Rebuild & redeploy frontend with correct URLs:"
echo "   docker build --platform linux/amd64 -t $ECR_FRONTEND_REPO -f Dockerfile.frontend ."
echo "   docker tag $ECR_FRONTEND_REPO:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO:latest"
echo "   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO:latest"
echo "   aws ecs update-service --cluster production-cluster --service production-frontend --force-new-deployment --no-cli-pager"
echo ""
echo "4️⃣  Get frontend IP:"
echo '   FRONTEND_IP=$(aws ecs list-tasks --cluster production-cluster --service-name production-frontend --query "taskArns[0]" --output text | xargs -I{} aws ecs describe-tasks --cluster production-cluster --tasks {} --query "tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value" --output text | xargs -I{} aws ec2 describe-network-interfaces --network-interface-ids {} --query "NetworkInterfaces[0].Association.PublicIp" --output text)'
echo '   echo "Frontend: http://$FRONTEND_IP"'
echo ""
echo "💡 The backend Elastic IP ($BACKEND_EIP) is STATIC — it survives redeployments."
echo "   Point your domain A record to it and you're set."
echo ""
echo "⚠️  Note: After backend task restarts, re-run this script or manually re-associate the EIP:"
echo "   aws ec2 associate-address --allocation-id <ALLOC_ID> --network-interface-id <ENI_ID>"
