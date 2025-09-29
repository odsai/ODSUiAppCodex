# Infra (Dev) — Azure Container Apps

This folder contains a minimal Bicep template to provision a dev‑grade Azure Container Apps environment and deploy the LMS API container.

## Prerequisites
- Azure subscription and a resource group (e.g. `rg-odsui-dev`).
- A container image published to a registry (ACR or GHCR). The GitHub workflow below builds/pushes automatically to ACR.

## Deploy via Azure CLI
```bash
az group create -n rg-odsui-dev -l eastus
az deployment group create \
  -g rg-odsui-dev \
  -f infra/bicep/main.bicep \
  -p location=eastus prefix=odsui-lms-dev containerAppName=odsui-lms-api-dev containerImage=<registry>/odsui-lms-api:<tag>
```

The output includes `containerAppFqdn` for testing.

## GitHub Actions (manual deploy)
Use `.github/workflows/deploy-lms-api-dev.yml` with inputs:
- `resourceGroup`: your RG name
- `location`: Azure region
- `prefix`: name prefix (used for LA + CAE)
- `containerAppName`: target app name
- `acrName`: Azure Container Registry name

Secrets required:
- `AZURE_CREDENTIALS` — JSON creds for azure/login (clientId, tenantId, subscriptionId).
- `ACR_LOGIN_SERVER`, `ACR_USERNAME`, `ACR_PASSWORD` — for docker login.

