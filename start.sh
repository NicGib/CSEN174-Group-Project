#!/usr/bin/env bash

set +e  # Don't exit on error, we want to handle cleanup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_PID=""
CURRENT_MODE="None"
CURRENT_SCRIPT=""

# Cleanup function
cleanup() {
    if [ -n "$CURRENT_PID" ]; then
        echo ""
        echo "Stopping current process (PID: $CURRENT_PID)..."
        # Kill the process and its children
        pkill -P "$CURRENT_PID" 2>/dev/null || true
        kill "$CURRENT_PID" 2>/dev/null || true
        wait "$CURRENT_PID" 2>/dev/null || true
    fi
    echo "Stopping Docker containers..."
    cd "$SCRIPT_DIR"
    docker-compose down --remove-orphans >/dev/null 2>&1 || true
    exit 0
}

trap cleanup INT TERM EXIT

# Function to stop current process
stop_current() {
    if [ -n "$CURRENT_PID" ]; then
        echo "Stopping current process (PID: $CURRENT_PID)..."
        # Kill the process group to stop all child processes
        pkill -P "$CURRENT_PID" 2>/dev/null || true
        kill "$CURRENT_PID" 2>/dev/null || true
        wait "$CURRENT_PID" 2>/dev/null || true
        CURRENT_PID=""
        CURRENT_SCRIPT=""
        CURRENT_MODE="None"
        sleep 1
    fi
}

# Function to show menu
show_menu() {
    clear
    echo "========================================"
    echo "  TrailMix Master Start Script"
    echo "========================================"
    echo ""
    echo "  Select an option:"
    echo ""
    echo "  1. Start with Tunnel Mode (cloudflared + Expo tunnel)"
    echo "  2. Start with LAN Mode (cloudflared + Expo LAN)"
    echo "  3. Start Local Mode (cloudflared + Expo local)"
    echo "  4. Direct Docker Mode"
    echo "  5. Stop Current and Exit"
    echo ""
    echo "  Current: $CURRENT_MODE"
    if [ -n "$CURRENT_PID" ]; then
        if kill -0 "$CURRENT_PID" 2>/dev/null; then
            echo "  Status: Running (PID: $CURRENT_PID)"
        else
            echo "  Status: Stopped"
            CURRENT_PID=""
            CURRENT_MODE="None"
        fi
    fi
    echo ""
}

# Main menu loop
while true; do
    show_menu
    
    read -p "  Select option (1-5): " choice
    
    case $choice in
        1)
            stop_current
            CURRENT_MODE="Tunnel Mode"
            CURRENT_SCRIPT="start-tunnel-docker.sh"
            echo ""
            echo "Starting Tunnel Mode..."
            echo "  (Output will appear in this terminal)"
            echo ""
            # Run in background but capture output
            bash "$SCRIPT_DIR/$CURRENT_SCRIPT" &
            CURRENT_PID=$!
            sleep 2
            ;;
        2)
            stop_current
            CURRENT_MODE="LAN Mode"
            CURRENT_SCRIPT="start-lan-docker.sh"
            echo ""
            echo "Starting LAN Mode..."
            echo "  (Output will appear in this terminal)"
            echo ""
            bash "$SCRIPT_DIR/$CURRENT_SCRIPT" &
            CURRENT_PID=$!
            sleep 2
            ;;
        3)
            stop_current
            CURRENT_MODE="Local Mode"
            CURRENT_SCRIPT="start-docker.sh"
            echo ""
            echo "Starting Local Mode..."
            echo "  (Output will appear in this terminal)"
            echo ""
            bash "$SCRIPT_DIR/$CURRENT_SCRIPT" &
            CURRENT_PID=$!
            sleep 2
            ;;
        4)
            docker_menu
            ;;
        5)
            stop_current
            echo "Stopping Docker containers..."
            cd "$SCRIPT_DIR"
            docker-compose down --remove-orphans >/dev/null 2>&1 || true
            echo ""
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option. Please select 1-5."
            sleep 2
            ;;
    esac
done

# Docker management menu
docker_menu() {
    while true; do
        clear
        echo "========================================"
        echo "  Direct Docker Mode"
        echo "========================================"
        echo ""
        echo "  Select an option:"
        echo ""
        echo "  1. Manage All Containers"
        echo "  2. Manage Individual Container"
        echo "  3. View Container Status"
        echo "  4. View Container Logs"
        echo "  5. Back to Main Menu"
        echo ""
        read -p "  Select option (1-5): " choice
        
        case $choice in
            1) manage_all_containers ;;
            2) manage_individual_container ;;
            3) view_container_status ;;
            4) view_container_logs_menu ;;
            5) return ;;
            *) echo "Invalid option. Please select 1-5."; sleep 2 ;;
        esac
    done
}

manage_all_containers() {
    while true; do
        clear
        echo "========================================"
        echo "  Manage All Containers"
        echo "========================================"
        echo ""
        echo "  1. Restart All Containers"
        echo "  2. Start All Containers"
        echo "  3. Stop All Containers"
        echo "  4. Back"
        echo ""
        read -p "  Select option (1-4): " choice
        
        case $choice in
            1)
                echo "Restarting all Docker containers..."
                cd "$SCRIPT_DIR"
                docker-compose down --remove-orphans
                docker-compose up -d
                echo ""
                read -p "Press Enter to continue..."
                ;;
            2)
                echo "Starting all Docker containers..."
                cd "$SCRIPT_DIR"
                docker-compose up -d
                echo ""
                read -p "Press Enter to continue..."
                ;;
            3)
                echo "Stopping all Docker containers..."
                cd "$SCRIPT_DIR"
                docker-compose down --remove-orphans
                echo ""
                read -p "Press Enter to continue..."
                ;;
            4) return ;;
            *) echo "Invalid option."; sleep 1 ;;
        esac
    done
}

manage_individual_container() {
    while true; do
        clear
        echo "========================================"
        echo "  Manage Individual Container"
        echo "========================================"
        echo ""
        echo "  Select container:"
        echo ""
        echo "  1. postgres"
        echo "  2. redis"
        echo "  3. backend"
        echo "  4. cloudflared"
        echo "  5. frontend"
        echo "  6. tunnel-url-extractor"
        echo "  7. Back"
        echo ""
        read -p "  Select container (1-7): " choice
        
        case $choice in
            1) container_name="postgres"; container_actions ;;
            2) container_name="redis"; container_actions ;;
            3) container_name="backend"; container_actions ;;
            4) container_name="cloudflared"; container_actions ;;
            5) container_name="frontend"; container_actions ;;
            6) container_name="tunnel-url-extractor"; container_actions ;;
            7) return ;;
            *) echo "Invalid option."; sleep 1 ;;
        esac
    done
}

container_actions() {
    while true; do
        clear
        echo "========================================"
        echo "  Manage: $container_name"
        echo "========================================"
        echo ""
        echo "  1. Restart Container"
        echo "  2. Start Container"
        echo "  3. Stop Container"
        echo "  4. View Logs"
        echo "  5. Back"
        echo ""
        read -p "  Select action (1-5): " choice
        
        case $choice in
            1)
                echo "Restarting $container_name..."
                cd "$SCRIPT_DIR"
                docker-compose restart "$container_name"
                echo ""
                read -p "Press Enter to continue..."
                ;;
            2)
                echo "Starting $container_name..."
                cd "$SCRIPT_DIR"
                docker-compose up -d "$container_name"
                echo ""
                read -p "Press Enter to continue..."
                ;;
            3)
                echo "Stopping $container_name..."
                cd "$SCRIPT_DIR"
                docker-compose stop "$container_name"
                echo ""
                read -p "Press Enter to continue..."
                ;;
            4)
                echo "Viewing logs for $container_name..."
                echo "Press Ctrl+C to return to menu"
                cd "$SCRIPT_DIR"
                docker-compose logs -f "$container_name"
                ;;
            5) return ;;
            *) echo "Invalid option."; sleep 1 ;;
        esac
    done
}

view_container_status() {
    clear
    echo "========================================"
    echo "  Container Status"
    echo "========================================"
    echo ""
    cd "$SCRIPT_DIR"
    docker-compose ps
    echo ""
    read -p "Press Enter to continue..."
}

view_container_logs_menu() {
    while true; do
        clear
        echo "========================================"
        echo "  View Container Logs"
        echo "========================================"
        echo ""
        echo "  Select container:"
        echo ""
        echo "  1. postgres"
        echo "  2. redis"
        echo "  3. backend"
        echo "  4. cloudflared"
        echo "  5. frontend"
        echo "  6. tunnel-url-extractor"
        echo "  7. all (all containers)"
        echo "  8. Back"
        echo ""
        read -p "  Select container (1-8): " choice
        
        case $choice in
            1) log_container="postgres"; show_logs ;;
            2) log_container="redis"; show_logs ;;
            3) log_container="backend"; show_logs ;;
            4) log_container="cloudflared"; show_logs ;;
            5) log_container="frontend"; show_logs ;;
            6) log_container="tunnel-url-extractor"; show_logs ;;
            7) log_container=""; show_logs ;;
            8) return ;;
            *) echo "Invalid option."; sleep 1 ;;
        esac
    done
}

show_logs() {
    echo "Viewing logs..."
    echo "Press Ctrl+C to return to menu"
    cd "$SCRIPT_DIR"
    if [ -z "$log_container" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$log_container"
    fi
}

