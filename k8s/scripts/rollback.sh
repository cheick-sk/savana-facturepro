#!/bin/bash
set -e

# SaaS Africa Rollback Script
# Usage: ./rollback.sh [environment] [deployment] [revision]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-staging}
DEPLOYMENT=${2:-all}
REVISION=${3:-}
METHOD=${4:-kustomize}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
NAMESPACE="saas-africa"
TIMEOUT="300s"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SaaS Africa Rollback Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Deployment: ${DEPLOYMENT}${NC}"
echo -e "${GREEN}Revision: ${REVISION:-"previous"}${NC}"
echo -e "${GREEN}Method: ${METHOD}${NC}"
echo ""

# All deployments
ALL_DEPLOYMENTS=(
    "facturepro-backend"
    "facturepro-frontend"
    "savanaflow-backend"
    "savanaflow-frontend"
    "schoolflow-backend"
    "schoolflow-frontend"
    "celery-worker"
    "celery-beat"
)

# Show rollout history
show_history() {
    local deployment=$1
    
    echo -e "${YELLOW}Rollout history for ${deployment}:${NC}"
    kubectl rollout history deployment/${deployment} -n ${NAMESPACE}
}

# Rollback using kubectl
rollback_kubectl() {
    local deployment=$1
    local revision=$2
    
    if [ -n "$revision" ]; then
        echo -e "${YELLOW}Rolling back ${deployment} to revision ${revision}...${NC}"
        kubectl rollout undo deployment/${deployment} -n ${NAMESPACE} --to-revision=${revision}
    else
        echo -e "${YELLOW}Rolling back ${deployment} to previous version...${NC}"
        kubectl rollout undo deployment/${deployment} -n ${NAMESPACE}
    fi
    
    # Wait for rollback to complete
    echo -e "${YELLOW}Waiting for rollback to complete...${NC}"
    kubectl rollout status deployment/${deployment} -n ${NAMESPACE} --timeout=${TIMEOUT}
    
    echo -e "${GREEN}Rollback of ${deployment} complete!${NC}"
}

# Rollback using Helm
rollback_helm() {
    local revision=$1
    
    if [ -n "$revision" ]; then
        echo -e "${YELLOW}Rolling back Helm release to revision ${revision}...${NC}"
        helm rollback saas-africa ${revision} -n ${NAMESPACE}
    else
        echo -e "${YELLOW}Rolling back Helm release to previous version...${NC}"
        helm rollback saas-africa -n ${NAMESPACE}
    fi
    
    echo -e "${GREEN}Helm rollback complete!${NC}"
}

# Verify rollback
verify_rollback() {
    local deployment=$1
    
    echo -e "${YELLOW}Verifying rollback for ${deployment}...${NC}"
    
    # Check pod status
    local ready_pods=$(kubectl get pods -n ${NAMESPACE} -l app=${deployment} -o json | jq -r '.items | map(select(.status.phase=="Running")) | length')
    local total_pods=$(kubectl get pods -n ${NAMESPACE} -l app=${deployment} -o json | jq -r '.items | length')
    
    if [ "$ready_pods" == "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
        echo -e "${GREEN}${deployment}: ${ready_pods}/${total_pods} pods running${NC}"
        return 0
    else
        echo -e "${RED}${deployment}: ${ready_pods}/${total_pods} pods running${NC}"
        return 1
    fi
}

# Main rollback function
main() {
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}Error: kubectl is not installed${NC}"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
        echo -e "${RED}Error: Namespace ${NAMESPACE} does not exist${NC}"
        exit 1
    fi
    
    # Handle Helm rollback
    if [ "$METHOD" == "helm" ]; then
        if [ "$DEPLOYMENT" != "all" ]; then
            echo -e "${YELLOW}Note: Helm rollback affects the entire release, not individual deployments${NC}"
        fi
        
        # Show current history
        echo -e "${YELLOW}Current Helm history:${NC}"
        helm history saas-africa -n ${NAMESPACE} --max 10
        
        # Perform rollback
        rollback_helm ${REVISION}
        exit 0
    fi
    
    # Handle kubectl rollback
    if [ "$DEPLOYMENT" == "all" ]; then
        echo -e "${YELLOW}Rolling back all deployments...${NC}"
        
        for deployment in "${ALL_DEPLOYMENTS[@]}"; do
            # Check if deployment exists
            if kubectl get deployment ${deployment} -n ${NAMESPACE} &> /dev/null; then
                echo ""
                echo -e "${BLUE}Processing ${deployment}...${NC}"
                
                # Show history if specific revision requested
                if [ -n "$REVISION" ]; then
                    show_history ${deployment}
                fi
                
                # Perform rollback
                rollback_kubectl ${deployment} ${REVISION}
                
                # Verify
                verify_rollback ${deployment}
            else
                echo -e "${YELLOW}Skipping ${deployment} (not found)${NC}"
            fi
        done
    else
        # Rollback specific deployment
        if ! kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE} &> /dev/null; then
            echo -e "${RED}Error: Deployment ${DEPLOYMENT} does not exist${NC}"
            echo -e "${YELLOW}Available deployments:${NC}"
            for d in "${ALL_DEPLOYMENTS[@]}"; do
                echo "  - ${d}"
            done
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}Processing ${DEPLOYMENT}...${NC}"
        
        # Show history
        show_history ${DEPLOYMENT}
        
        # Perform rollback
        rollback_kubectl ${DEPLOYMENT} ${REVISION}
        
        # Verify
        verify_rollback ${DEPLOYMENT}
    fi
    
    # Show final status
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Rollback Summary${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    echo -e "${YELLOW}Current pod status:${NC}"
    kubectl get pods -n ${NAMESPACE} -o wide
    
    echo ""
    echo -e "${YELLOW}Recent events:${NC}"
    kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20
    
    echo ""
    echo -e "${GREEN}Rollback complete!${NC}"
}

# Run main function
main
