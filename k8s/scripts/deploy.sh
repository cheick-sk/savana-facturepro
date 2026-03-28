#!/bin/bash
set -e

# SaaS Africa Deployment Script
# Usage: ./deploy.sh [environment] [version]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
METHOD=${3:-kustomize}  # kustomize or helm
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
NAMESPACE="saas-africa"
TIMEOUT="600s"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SaaS Africa Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Version: ${VERSION}${NC}"
echo -e "${GREEN}Method: ${METHOD}${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}Error: kubectl is not installed${NC}"
        exit 1
    fi
    
    # Check if cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    
    # Check helm if using helm deployment
    if [ "$METHOD" == "helm" ]; then
        if ! command -v helm &> /dev/null; then
            echo -e "${RED}Error: helm is not installed${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}All prerequisites met!${NC}"
}

# Deploy using Kustomize
deploy_kustomize() {
    echo -e "${YELLOW}Deploying using Kustomize...${NC}"
    
    # Set the Kubernetes context
    echo -e "${YELLOW}Setting Kubernetes context to saas-africa-${ENVIRONMENT}...${NC}"
    kubectl config use-context saas-africa-${ENVIRONMENT} 2>/dev/null || {
        echo -e "${YELLOW}Context not found, using current context${NC}"
    }
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply secrets first (they should be created before deployments)
    echo -e "${YELLOW}Applying secrets...${NC}"
    kubectl apply -k ${PROJECT_ROOT}/k8s/base/secrets -n ${NAMESPACE} --dry-run=client 2>/dev/null || true
    
    # Apply the kustomize configuration
    echo -e "${YELLOW}Applying Kustomize configuration for ${ENVIRONMENT}...${NC}"
    kubectl apply -k ${PROJECT_ROOT}/k8s/overlays/${ENVIRONMENT}
    
    # Update image versions if not 'latest'
    if [ "$VERSION" != "latest" ]; then
        echo -e "${YELLOW}Updating image versions to ${VERSION}...${NC}"
        
        # Update FacturePro
        kubectl set image deployment/facturepro-backend \
            backend=saasafrica/facturepro-backend:${VERSION} \
            -n ${NAMESPACE}
        kubectl set image deployment/facturepro-frontend \
            frontend=saasafrica/facturepro-frontend:${VERSION} \
            -n ${NAMESPACE}
        
        # Update SavanaFlow
        kubectl set image deployment/savanaflow-backend \
            backend=saasafrica/savanaflow-backend:${VERSION} \
            -n ${NAMESPACE}
        kubectl set image deployment/savanaflow-frontend \
            frontend=saasafrica/savanaflow-frontend:${VERSION} \
            -n ${NAMESPACE}
        
        # Update SchoolFlow
        kubectl set image deployment/schoolflow-backend \
            backend=saasafrica/schoolflow-backend:${VERSION} \
            -n ${NAMESPACE}
        kubectl set image deployment/schoolflow-frontend \
            frontend=saasafrica/schoolflow-frontend:${VERSION} \
            -n ${NAMESPACE}
        
        # Update Celery workers
        kubectl set image deployment/celery-worker \
            celery-worker=saasafrica/facturepro-backend:${VERSION} \
            -n ${NAMESPACE}
    fi
    
    # Wait for deployments to roll out
    echo -e "${YELLOW}Waiting for deployments to roll out...${NC}"
    wait_for_deployments
}

# Deploy using Helm
deploy_helm() {
    echo -e "${YELLOW}Deploying using Helm...${NC}"
    
    # Set values file based on environment
    VALUES_FILE="${PROJECT_ROOT}/k8s/helm/values-${ENVIRONMENT}.yaml"
    if [ ! -f "$VALUES_FILE" ]; then
        echo -e "${YELLOW}No environment-specific values file found, using default${NC}"
        VALUES_FILE="${PROJECT_ROOT}/k8s/helm/values.yaml"
    fi
    
    # Deploy with Helm
    helm upgrade --install saas-africa ${PROJECT_ROOT}/k8s/helm \
        --namespace ${NAMESPACE} \
        --create-namespace \
        -f ${VALUES_FILE} \
        --set global.environment=${ENVIRONMENT} \
        --set facturepro.backend.image.tag=${VERSION} \
        --set facturepro.frontend.image.tag=${VERSION} \
        --set savanaflow.backend.image.tag=${VERSION} \
        --set savanaflow.frontend.image.tag=${VERSION} \
        --set schoolflow.backend.image.tag=${VERSION} \
        --set schoolflow.frontend.image.tag=${VERSION} \
        --set celery.worker.image.tag=${VERSION} \
        --timeout ${TIMEOUT} \
        --wait \
        --atomic
    
    echo -e "${GREEN}Helm deployment complete!${NC}"
}

# Wait for all deployments to be ready
wait_for_deployments() {
    local deployments=(
        "facturepro-backend"
        "facturepro-frontend"
        "savanaflow-backend"
        "savanaflow-frontend"
        "schoolflow-backend"
        "schoolflow-frontend"
        "celery-worker"
        "celery-beat"
    )
    
    for deployment in "${deployments[@]}"; do
        echo -e "${YELLOW}Waiting for ${deployment}...${NC}"
        kubectl rollout status deployment/${deployment} -n ${NAMESPACE} --timeout=${TIMEOUT} || {
            echo -e "${RED}Error: ${deployment} failed to roll out${NC}"
            kubectl describe deployment ${deployment} -n ${NAMESPACE}
            exit 1
        }
        echo -e "${GREEN}${deployment} is ready!${NC}"
    done
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Check pods are running
    local pods_not_ready=$(kubectl get pods -n ${NAMESPACE} --field-selector=status.phase!=Running -o json | jq -r '.items | length')
    if [ "$pods_not_ready" -gt 0 ]; then
        echo -e "${RED}Warning: ${pods_not_ready} pods are not running${NC}"
        kubectl get pods -n ${NAMESPACE} --field-selector=status.phase!=Running
    else
        echo -e "${GREEN}All pods are running!${NC}"
    fi
    
    # Check services
    echo -e "${YELLOW}Services:${NC}"
    kubectl get services -n ${NAMESPACE}
    
    # Check ingress
    echo -e "${YELLOW}Ingress:${NC}"
    kubectl get ingress -n ${NAMESPACE}
    
    # Check HPA
    echo -e "${YELLOW}Horizontal Pod Autoscalers:${NC}"
    kubectl get hpa -n ${NAMESPACE} 2>/dev/null || echo "No HPAs found"
    
    # Display deployment summary
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Summary${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Namespace: ${NAMESPACE}${NC}"
    echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
    echo -e "${GREEN}Version: ${VERSION}${NC}"
    echo -e "${GREEN}Method: ${METHOD}${NC}"
    
    # Get public endpoints
    echo ""
    echo -e "${BLUE}Access your applications:${NC}"
    case ${ENVIRONMENT} in
        production)
            echo -e "  FacturePro: https://facturepro.africa"
            echo -e "  SavanaFlow: https://savanaflow.africa"
            echo -e "  SchoolFlow: https://schoolflow.africa"
            ;;
        staging)
            echo -e "  FacturePro: https://staging.facturepro.africa"
            echo -e "  SavanaFlow: https://staging.savanaflow.africa"
            echo -e "  SchoolFlow: https://staging.schoolflow.africa"
            ;;
        *)
            echo -e "  Run: kubectl get ingress -n ${NAMESPACE} to see endpoints"
            ;;
    esac
}

# Main deployment function
main() {
    check_prerequisites
    
    case ${METHOD} in
        kustomize)
            deploy_kustomize
            ;;
        helm)
            deploy_helm
            ;;
        *)
            echo -e "${RED}Unknown deployment method: ${METHOD}${NC}"
            echo "Usage: $0 [environment] [version] [kustomize|helm]"
            exit 1
            ;;
    esac
    
    verify_deployment
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main
