# Cloudflare Deployment Tool Guide

## Overview

The `SandboxDeployTool` allows you to deploy static websites from your Daytona sandbox directly to Cloudflare Pages using your custom domain `he2.ai`.

## Prerequisites

1. **Cloudflare API Token**: Must be set in your backend `.env` file as `CLOUDFLARE_API_TOKEN`
2. **Custom Domain**: Your Cloudflare account must have the CNAME record for `*.he2.ai` pointing to your Cloudflare Pages
3. **Wrangler CLI**: Automatically installed in the sandbox environment

## Configuration

### Environment Variables

```bash
# In backend/.env
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token-here"
```

### Cloudflare DNS Setup

Ensure you have the following CNAME record in your Cloudflare DNS:

```
Type: CNAME
Name: *
Target: he2.ai
Proxied: Yes
```

## Usage

### Testing Connection

Before deploying, test your Cloudflare connection:

```python
# Test if Cloudflare is properly configured
result = await deploy_tool.test_cloudflare_connection()
```

### Deploying a Website

```python
# Deploy a static website
result = await deploy_tool.deploy(
    name="my-website",           # Will be accessible at my-website.he2.ai
    directory_path="build"       # Path to your static files relative to /workspace
)
```

## Deployment Process

1. **Connection Test**: Verifies Cloudflare API token is working
2. **Project Creation**: Creates a new Cloudflare Pages project if it doesn't exist
3. **File Deployment**: Uploads your static files to Cloudflare Pages
4. **Domain Configuration**: Attempts to configure the custom subdomain

## URL Format

Your deployed websites will be accessible at:
```
https://{name}.he2.ai
```

For example:
- `my-website` → `https://my-website.he2.ai`
- `portfolio` → `https://portfolio.he2.ai`

## Project Naming

Projects are automatically named using the format:
```
{sandbox_id}-{name}
```

This ensures unique project names across different sandbox instances.

## Error Handling

The tool provides detailed error messages for:
- Missing Cloudflare API token
- Failed Cloudflare connection
- Invalid directory paths
- Deployment failures
- Domain configuration issues

## Troubleshooting

### Common Issues

1. **"CLOUDFLARE_API_TOKEN environment variable not set"**
   - Check your backend `.env` file
   - Ensure the token is properly quoted

2. **"Failed to connect to Cloudflare"**
   - Verify your API token has the correct permissions
   - Check if Cloudflare services are accessible

3. **Domain configuration warnings**
   - The tool will still deploy successfully
   - You may need to manually configure the domain in Cloudflare dashboard

### Manual Domain Setup

If automatic domain configuration fails, you can manually add the domain in Cloudflare:

1. Go to Cloudflare Pages dashboard
2. Select your project
3. Go to "Custom domains"
4. Add `{name}.he2.ai`

## Security Notes

- API tokens are stored securely in environment variables
- Each deployment creates a unique project
- Sandbox isolation ensures secure deployment
- Custom domains are validated through Cloudflare

## Best Practices

1. **Test First**: Always test the Cloudflare connection before deployment
2. **Unique Names**: Use descriptive, unique names for your deployments
3. **Build Process**: Ensure your static files are properly built before deployment
4. **Monitoring**: Check Cloudflare Pages dashboard for deployment status
5. **Cleanup**: Remove unused projects from Cloudflare dashboard when no longer needed
