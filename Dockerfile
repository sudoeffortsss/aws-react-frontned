# 使用 Node 作为构建阶段
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 拷贝依赖文件并安装
COPY package*.json ./
RUN npm install

# 拷贝全部代码并构建项目
COPY . .
RUN npm run build

# 使用 nginx 提供静态文件
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# 容器对外暴露的端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
