# MCP Certificates Directory

This directory contains certificate-related files for MCP server verification.

## Files

- **mcp-certificates.json**: Stores certificates for MCP servers
- **certificate-authorities.json**: Stores custom certificate authorities

## Certificate System

The MCP Webview Host uses a certificate-based trust system similar to browser SSL/TLS certificates:

### Trust Levels

1. **Trusted** (🔒 Green Lock)
   - Manually trusted by the user
   - Full webview capabilities including forms and scripts
   - Similar to accepting a self-signed certificate

2. **Verified** (✓ Blue Checkmark)
   - Verified by a certificate authority
   - Full webview capabilities
   - Similar to a valid SSL certificate from a trusted CA

3. **Unverified** (⚠️ Warning)
   - Self-signed or expired certificate
   - Limited capabilities (static HTML only, no scripts)
   - Similar to an untrusted/self-signed SSL certificate

### Certificate Lifecycle

1. When an MCP server is first connected, a self-signed certificate is automatically created
2. The certificate is initially marked as "unverified"
3. Users can manually trust the certificate (similar to accepting a self-signed cert)
4. Alternatively, the certificate can be verified by a certificate authority
5. Certificates expire after 1 year and must be renewed

### Security

This system prevents:
- Unauthorized MCP servers from running malicious code
- Man-in-the-middle attacks by verifying server identity
- Expired or revoked certificates from being trusted

### Managing Certificates

Use the MCP Server Settings UI to:
- View all MCP server certificates
- Trust/untrust servers
- View certificate details (fingerprint, issuer, expiry)
- Remove certificates

## Certificate Authorities

The system includes a default CA: "MCP Webview Host CA"

You can add custom CAs in the `certificate-authorities.json` file:

```json
[
  {
    "name": "My Custom CA",
    "publicKey": "your-public-key-here",
    "fingerprint": "sha256-hash-of-public-key"
  }
]
```

## Notes

- Certificates are stored in JSON format for easy inspection
- The system is designed for local MCP servers, not internet-facing services
- This is a simplified certificate system focused on trust management
