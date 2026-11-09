FROM eclipse-temurin:17-jre
VOLUME /tmp
EXPOSE 8081
ARG JAR_FILE=target/demo-0.0.1.jar
ADD ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
