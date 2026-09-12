# 多阶段构建 - 构建阶段
FROM maven:3.8.6-jdk-8-slim AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# 运行阶段
FROM openjdk:8-jre-alpine
WORKDIR /app
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
COPY --from=builder /app/target/fishing-backend.jar .
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "fishing-backend.jar"]
