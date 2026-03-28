#!/bin/bash
set -e

# SaaS Africa Monitoring Script
# Usage: ./monitor.sh [environment] [action]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-production}
ACTION=${2:-status}
NAMESPACE="saas-africa"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SaaS Africa Monitoring Dashboard${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Action: ${ACTION}${NC}"
echo ""

# Function to display pod status
show_pods() {
    echo -e "${CYAN}=== Pod Status ===${NC}"
    kubectl get pods -n ${NAMESPACE} -o wide
    echo ""
}

# Function to display deployment status
show_deployments() {
    echo -e "${CYAN}=== Deployment Status ===${NC}"
    kubectl get deployments -n ${NAMESPACE}
    echo ""
}

# Function to display services
show_services() {
    echo -e "${CYAN}=== Services ===${NC}"
    kubectl get services -n ${NAMESPACE}
    echo ""
}

# Function to display ingress
show_ingress() {
    echo -e "${CYAN}=== Ingress ===${NC}"
    kubectl get ingress -n ${NAMESPACE}
    echo ""
}

# Function to display HPA status
show_hpa() {
    echo -e "${CYAN}=== Horizontal Pod Autoscalers ===${NC}"
    kubectl get hpa -n ${NAMESPACE} 2>/dev/null || echo "No HPAs configured"
    echo ""
}

# Function to display resource usage
show_resources() {
    echo -e "${CYAN}=== Resource Usage ===${NC}"
    kubectl top pods -n ${NAMESPACE} 2>/dev/null || echo "Metrics server not available"
    echo ""
    kubectl top nodes
    echo ""
}

# Function to display recent events
show_events() {
    echo -e "${CYAN}=== Recent Events ===${NC}"
    kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -30
    echo ""
}

# Function to display logs
show_logs() {
    local deployment=$1
    local tail=${2:-100}
    
    if [ -z "$deployment" ]; then
        echo -e "${RED}Error: Deployment name required${NC}"
        echo "Usage: $0 $ENVIRONMENT logs <deployment-name> [lines]"
        return 1
    fi
    
    echo -e "${CYAN}=== Logs for ${deployment} (last ${tail} lines) ===${NC}"
    kubectl logs -l app=${deployment} -n ${NAMESPACE} --tail=${tail} --all-containers
    echo ""
}

# Function to display pod details
describe_pod() {
    local pod=$1
    
    if [ -z "$pod" ]; then
        echo -e "${RED}Error: Pod name required${NC}"
        echo "Usage: $0 $ENVIRONMENT describe <pod-name>"
        return 1
    fi
    
    echo -e "${CYAN}=== Pod Details: ${pod} ===${NC}"
    kubectl describe pod ${pod} -n ${NAMESPACE}
    echo ""
}

# Function to check health endpoints
check_health() {
    echo -e "${CYAN}=== Health Check ===${NC}"
    
    local services=(
        "facturepro-backend:8000"
        "savanaflow-backend:8000"
        "schoolflow-backend:8000"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        echo -e "${YELLOW}Checking ${name}...${NC}"
        kubectl exec -n ${NAMESPACE} deploy/${name} -- curl -s http://localhost:${port}/health 2>/dev/null || {
            echo -e "${RED}${name}: Health check failed${NC}"
        }
    done
    echo ""
}

# Function to show database connections
show_db_status() {
    echo -e "${CYAN}=== Database Status ===${NC}"
    
    # PostgreSQL
    echo -e "${YELLOW}PostgreSQL:${NC}"
    kubectl exec -n ${NAMESPACE} statefulset/postgres -- pg_isready -U postgres 2>/dev/null || {
        echo -e "${RED}PostgreSQL: Not ready${NC}"
    }
    
    # Redis
    echo -e "${YELLOW}Redis:${NC}"
    kubectl exec -n ${NAMESPACE} statefulset/redis -- redis-cli ping 2>/dev/null || {
        echo -e "${RED}Redis: Not ready${NC}"
    }
    echo ""
}

# Function to display persistent volumes
show_pvc() {
    echo -e "${CYAN}=== Persistent Volume Claims ===${NC}"
    kubectl get pvc -n ${NAMESPACE}
    echo ""
}

# Function to display network policies
show_network_policies() {
    echo -e "${CYAN}=== Network Policies ===${NC}"
    kubectl get networkpolicies -n ${NAMESPACE} 2>/dev/null || echo "No network policies configured"
    echo ""
}

# Function to display full dashboard
show_dashboard() {
    clear
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}SaaS Africa Monitoring Dashboard${NC}"
    echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
    echo -e "${BLUE}Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    show_pods
    show_deployments
    show_hpa
    show_resources
}

# Function to watch status
watch_status() {
    while true; do
        show_dashboard
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        sleep 5
    done
}

# Function to port-forward services
port_forward() {
    local service=$1
    local local_port=$2
    local remote_port=$3
    
    if [ -z "$service" ] || [ -z "$local_port" ] || [ -z "$remote_port" ]; then
        echo -e "${RED}Error: Service name, local port, and remote port required${NC}"
        echo "Usage: $0 $ENVIRONMENT port-forward <service-name> <local-port> <remote-port>"
        echo ""
        echo "Examples:"
        echo "  $0 $ENVIRONMENT port-forward facturepro-backend 8080 8000"
        echo "  $0 $ENVIRONMENT port-forward postgres 5432 5432"
        return 1
    fi
    
    echo -e "${CYAN}Port-forwarding ${service}:${remote_port} to localhost:${local_port}${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    kubectl port-forward -n ${NAMESPACE} svc/${service} ${local_port}:${remote_port}
}

# Function to execute command in pod
exec_in_pod() {
    local deployment=$1
    shift
    local cmd=$@
    
    if [ -z "$deployment" ]; then
        echo -e "${RED}Error: Deployment name required${NC}"
        echo "Usage: $0 $ENVIRONMENT exec <deployment> <command>"
        return 1
    fi
    
    echo -e "${CYAN}Executing command in ${deployment}${NC}"
    kubectl exec -n ${NAMESPACE} -it deploy/${deployment} -- ${cmd:-/bin/sh}
}

# Function to scale deployment
scale_deployment() {
    local deployment=$1
    local replicas=$2
    
    if [ -z "$deployment" ] || [ -z "$replicas" ]; then
        echo -e "${RED}Error: Deployment name and replica count required${NC}"
        echo "Usage: $0 $ENVIRONMENT scale <deployment> <replicas>"
        return 1
    fi
    
    echo -e "${CYAN}Scaling ${deployment} to ${replicas} replicas${NC}"
    kubectl scale deployment ${deployment} -n ${NAMESPACE} --replicas=${replicas}
    echo -e "${GREEN}Scaling complete${NC}"
}

# Main function
main() {
    case ${ACTION} in
        status)
            show_pods
            show_deployments
            show_services
            show_hpa
            ;;
        full)
            show_dashboard
            ;;
        watch)
            watch_status
            ;;
        pods)
            show_pods
            ;;
        deployments)
            show_deployments
            ;;
        services)
            show_services
            ;;
        ingress)
            show_ingress
            ;;
        hpa)
            show_hpa
            ;;
        resources)
            show_resources
            ;;
        events)
            show_events
            ;;
        logs)
            show_logs $3 $4
            ;;
        describe)
            describe_pod $3
            ;;
        health)
            check_health
            ;;
        db)
            show_db_status
            ;;
        pvc)
            show_pvc
            ;;
        network)
            show_network_policies
            ;;
        port-forward)
            port_forward $3 $4 $5
            ;;
        exec)
            exec_in_pod $3 ${@:4}
            ;;
        scale)
            scale_deployment $3 $4
            ;;
        all)
            show_pods
            show_deployments
            show_services
            show_ingress
            show_hpa
            show_resources
            show_events
            show_pvc
            ;;
        *)
            echo -e "${YELLOW}Unknown action: ${ACTION}${NC}"
            echo ""
            echo "Available actions:"
            echo "  status        - Show pod and deployment status"
            echo "  full          - Show full dashboard"
            echo "  watch         - Continuously monitor status"
            echo "  pods          - Show pod status"
            echo "  deployments   - Show deployment status"
            echo "  services      - Show services"
            echo "  ingress       - Show ingress rules"
            echo "  hpa           - Show HPA status"
            echo "  resources     - Show resource usage"
            echo "  events        - Show recent events"
            echo "  logs <pod>    - Show logs for deployment"
            echo "  describe <pod>- Describe pod"
            echo "  health        - Check health endpoints"
            echo "  db            - Show database status"
            echo "  pvc           - Show persistent volume claims"
            echo "  network       - Show network policies"
            echo "  port-forward  - Port-forward a service"
            echo "  exec          - Execute command in pod"
            echo "  scale         - Scale a deployment"
            echo "  all           - Show all information"
            ;;
    esac
}

# Run main function
main
