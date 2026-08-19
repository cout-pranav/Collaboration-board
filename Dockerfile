# ─── Stage 1: Build Vue 3 frontend ───────────────────────────────────────────
FROM node:20-alpine AS node-build
WORKDIR /app

COPY frontend/collab-whiteboard-ui/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/collab-whiteboard-ui/ .

# Build args for production API URL (injected at build time)
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ─── Stage 2: Build ASP.NET Core backend ─────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS dotnet-build
WORKDIR /src

# Restore dependencies (layer-cached separately for fast rebuilds)
COPY backend/CollabWhiteboard.API/CollabWhiteboard.API.csproj backend/CollabWhiteboard.API/
RUN dotnet restore backend/CollabWhiteboard.API/CollabWhiteboard.API.csproj

# Copy all source
COPY backend/CollabWhiteboard.API/ backend/CollabWhiteboard.API/

# Copy built Vue output into wwwroot (SPA will be served by ASP.NET Core)
COPY --from=node-build /app/dist backend/CollabWhiteboard.API/wwwroot/

RUN dotnet publish backend/CollabWhiteboard.API/CollabWhiteboard.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# ─── Stage 3: Runtime image (minimal) ────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# Install ICU globalization support libraries for SQL Server client
RUN apk add --no-cache icu-libs

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=dotnet-build --chown=appuser:appgroup /app/publish .

# Enable full globalization
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false


EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "CollabWhiteboard.API.dll"]
