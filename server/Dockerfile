# server/Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app

# Copy go.mod and go.sum from current directory
COPY go.* ./
RUN go mod download

# Copy everything from server/ folder
COPY . .
RUN go build -o gitback

FROM alpine:latest
RUN apk --no-cache add git ca-certificates
WORKDIR /root/
COPY --from=builder /app/gitback .

ENV PORT=8080
EXPOSE 8080
CMD ["./gitback"]