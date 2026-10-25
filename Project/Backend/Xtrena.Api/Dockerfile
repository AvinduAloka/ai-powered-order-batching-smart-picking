# ── Stage 1: build (SDK image ~1.2 GB — temporary) ────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore Xtrena.Api.csproj
RUN dotnet publish Xtrena.Api.csproj -c Release -o /app --no-restore

# ── Stage 2: runtime (aspnet image ~220 MB — final image) ─────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Xtrena.Api.dll"]
