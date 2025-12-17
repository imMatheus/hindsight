FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum from current directory
COPY go.* ./
RUN go mod download

# Copy everything from server/ folder
COPY . .
RUN go build -o gitback

FROM alpine:latest

# Install git with all necessary tools
RUN apk --no-cache add \
    git \
    git-lfs \
    ca-certificates \
    openssh-client

# Configure Git for better performance
RUN git config --global protocol.version 2 && \
    git config --global core.compression 1 && \
    git config --global pack.windowMemory "100m" && \
    git config --global pack.packSizeLimit "100m" && \
    git config --global pack.threads "1"

WORKDIR /root/
COPY --from=builder /app/gitback .

ENV PORT=8080
ENV GIT_PROTOCOL=version=2

EXPOSE 8080
CMD ["./gitback"]