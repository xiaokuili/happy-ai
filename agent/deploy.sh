#!/bin/bash

# 服务器配置
SERVER="ubuntu@124.221.69.225"
REMOTE_PATH="/data/code/happy-ai"
GITHUB_PATH="git@github.com:xiaokuili/happy-ai.git"

# 部署函数
deploy() {
    echo "开始部署..."
    
    # 连接到服务器并执行部署命令
    ssh $SERVER << EOF
        # 确保所有命令都在sudo环境下执行
        sudo sh -c '
        set -e  # 如果任何命令失败，立即退出
        
        if [ ! -d "$REMOTE_PATH" ]; then
            mkdir -p $REMOTE_PATH
            git clone $GITHUB_PATH $REMOTE_PATH
        fi
        
        cd $REMOTE_PATH
        git pull
        
        cd agent
        make build
        make start
        
        # 只有当所有命令都成功执行后，才会运行到这里
        echo "部署完成!"
        '
EOF
}
# 停止服务
stop() {
    echo "停止服务..."
    ssh $SERVER "sudo -i && cd $REMOTE_PATH && make stop"
}

# 重启服务
restart() {
    echo "重启服务..."
    ssh $SERVER "sudo -i && cd $REMOTE_PATH && make restart"
}

# 根据参数执行相应操作
case "$1" in
    "deploy")
        deploy
        ;;
    "stop")
        stop
        ;;
    "restart")
        restart
        ;;
    *)
        echo "用法: $0 {deploy|stop|restart}"
        exit 1
        ;;
esac
