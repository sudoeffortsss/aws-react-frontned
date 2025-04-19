# 使用 Python 基础镜像
FROM python:3.10

# 设置工作目录
WORKDIR /app

# 先复制 requirements.txt 并安装依赖
COPY requirements.txt .

# Install Tesseract OCR
RUN apt-get update && apt-get install -y tesseract-ocr

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 再复制应用代码
COPY ./app /app

# 暴露端口
EXPOSE 8000

# 启动后端服务
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
