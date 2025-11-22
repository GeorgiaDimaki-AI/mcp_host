/**
 * Certificate Service
 * Handles MCP server certificate verification similar to browser SSL/TLS
 */

import { createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MCPCertificate {
  serverName: string;
  fingerprint: string;
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  publicKey: string;
  trustLevel: 'trusted' | 'verified' | 'unverified';
  selfSigned: boolean;
  verifiedBy?: string; // Authority that verified this certificate
}

export interface CertificateAuthority {
  name: string;
  publicKey: string;
  fingerprint: string;
}

const CERTS_DIR = './certificates';
const CERTS_FILE = join(CERTS_DIR, 'mcp-certificates.json');
const CA_FILE = join(CERTS_DIR, 'certificate-authorities.json');

// Default Certificate Authorities (similar to browser root CAs)
const DEFAULT_CAS: CertificateAuthority[] = [
  {
    name: 'MCP Webview Host CA',
    publicKey: 'mcp-webview-host-root-ca',
    fingerprint: generateFingerprint('mcp-webview-host-root-ca'),
  },
];

/**
 * Generate a fingerprint from public key
 */
function generateFingerprint(publicKey: string): string {
  return createHash('sha256').update(publicKey).digest('hex');
}

export class CertificateService {
  private certificates: Map<string, MCPCertificate> = new Map();
  private certificateAuthorities: Map<string, CertificateAuthority> = new Map();

  constructor() {
    this.loadCertificates();
    this.loadCertificateAuthorities();
  }

  /**
   * Load certificates from disk
   */
  private loadCertificates() {
    try {
      if (existsSync(CERTS_FILE)) {
        const data = readFileSync(CERTS_FILE, 'utf-8');
        const certs = JSON.parse(data) as MCPCertificate[];
        certs.forEach((cert) => {
          this.certificates.set(cert.serverName, cert);
        });
        console.log(`Loaded ${certs.length} MCP certificate(s)`);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
    }
  }

  /**
   * Load certificate authorities from disk
   */
  private loadCertificateAuthorities() {
    try {
      // Load default CAs
      DEFAULT_CAS.forEach((ca) => {
        this.certificateAuthorities.set(ca.fingerprint, ca);
      });

      // Load custom CAs from file
      if (existsSync(CA_FILE)) {
        const data = readFileSync(CA_FILE, 'utf-8');
        const cas = JSON.parse(data) as CertificateAuthority[];
        cas.forEach((ca) => {
          this.certificateAuthorities.set(ca.fingerprint, ca);
        });
        console.log(`Loaded ${cas.length} custom certificate authority(ies)`);
      }
    } catch (error) {
      console.error('Error loading certificate authorities:', error);
    }
  }

  /**
   * Save certificates to disk
   */
  private saveCertificates() {
    try {
      const certs = Array.from(this.certificates.values());
      writeFileSync(CERTS_FILE, JSON.stringify(certs, null, 2));
    } catch (error) {
      console.error('Error saving certificates:', error);
    }
  }

  /**
   * Save certificate authorities to disk
   */
  private saveCertificateAuthorities() {
    try {
      // Save only custom CAs (not defaults)
      const customCas = Array.from(this.certificateAuthorities.values()).filter(
        (ca) => !DEFAULT_CAS.some((defaultCa) => defaultCa.fingerprint === ca.fingerprint)
      );
      writeFileSync(CA_FILE, JSON.stringify(customCas, null, 2));
    } catch (error) {
      console.error('Error saving certificate authorities:', error);
    }
  }

  /**
   * Create a self-signed certificate for an MCP server
   */
  createSelfSignedCertificate(serverName: string): MCPCertificate {
    const publicKey = randomBytes(32).toString('hex');
    const fingerprint = generateFingerprint(publicKey);
    const now = Date.now();

    const cert: MCPCertificate = {
      serverName,
      fingerprint,
      issuer: serverName,
      issuedAt: now,
      expiresAt: now + 365 * 24 * 60 * 60 * 1000, // 1 year
      publicKey,
      trustLevel: 'unverified',
      selfSigned: true,
    };

    this.certificates.set(serverName, cert);
    this.saveCertificates();

    return cert;
  }

  /**
   * Verify a certificate by a certificate authority
   */
  verifyCertificate(serverName: string, caFingerprint: string): MCPCertificate | null {
    const cert = this.certificates.get(serverName);
    if (!cert) {
      return null;
    }

    const ca = this.certificateAuthorities.get(caFingerprint);
    if (!ca) {
      console.error(`Certificate authority not found: ${caFingerprint}`);
      return null;
    }

    // Update certificate to be verified
    cert.trustLevel = 'verified';
    cert.verifiedBy = ca.name;
    cert.selfSigned = false;

    this.certificates.set(serverName, cert);
    this.saveCertificates();

    console.log(`Certificate for ${serverName} verified by ${ca.name}`);
    return cert;
  }

  /**
   * Trust a certificate (manually)
   */
  trustCertificate(serverName: string): MCPCertificate | null {
    const cert = this.certificates.get(serverName);
    if (!cert) {
      return null;
    }

    cert.trustLevel = 'trusted';

    this.certificates.set(serverName, cert);
    this.saveCertificates();

    console.log(`Certificate for ${serverName} manually trusted`);
    return cert;
  }

  /**
   * Untrust a certificate
   */
  untrustCertificate(serverName: string): MCPCertificate | null {
    const cert = this.certificates.get(serverName);
    if (!cert) {
      return null;
    }

    cert.trustLevel = 'unverified';
    cert.verifiedBy = undefined;

    this.certificates.set(serverName, cert);
    this.saveCertificates();

    console.log(`Certificate for ${serverName} untrusted`);
    return cert;
  }

  /**
   * Get certificate for a server
   */
  getCertificate(serverName: string): MCPCertificate | null {
    return this.certificates.get(serverName) || null;
  }

  /**
   * Get all certificates
   */
  getAllCertificates(): MCPCertificate[] {
    return Array.from(this.certificates.values());
  }

  /**
   * Check if certificate is expired
   */
  isExpired(cert: MCPCertificate): boolean {
    return Date.now() > cert.expiresAt;
  }

  /**
   * Get trust level for a server
   * Creates a self-signed certificate if none exists
   */
  getTrustLevel(serverName: string): 'trusted' | 'verified' | 'unverified' {
    let cert = this.certificates.get(serverName);

    if (!cert) {
      // Create self-signed certificate for new servers
      cert = this.createSelfSignedCertificate(serverName);
      console.log(`Created self-signed certificate for ${serverName}`);
    }

    // Check if certificate is expired
    if (this.isExpired(cert)) {
      console.warn(`Certificate for ${serverName} has expired`);
      cert.trustLevel = 'unverified';
      this.saveCertificates();
    }

    return cert.trustLevel;
  }

  /**
   * Add a certificate authority
   */
  addCertificateAuthority(ca: CertificateAuthority): void {
    this.certificateAuthorities.set(ca.fingerprint, ca);
    this.saveCertificateAuthorities();
    console.log(`Added certificate authority: ${ca.name}`);
  }

  /**
   * Get all certificate authorities
   */
  getAllCertificateAuthorities(): CertificateAuthority[] {
    return Array.from(this.certificateAuthorities.values());
  }

  /**
   * Remove a certificate
   */
  removeCertificate(serverName: string): boolean {
    const deleted = this.certificates.delete(serverName);
    if (deleted) {
      this.saveCertificates();
      console.log(`Removed certificate for ${serverName}`);
    }
    return deleted;
  }
}
