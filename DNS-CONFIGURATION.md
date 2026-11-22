# Chase Mail — Authoritative DNS Configuration Specification

This document provides the exact RFC-standard DNS record templates for establishing deliverability for **Chase Mail** domains (`mail.chase-studios.org` or `chasemail.com`).

> **CRITICAL COMPLIANCE NOTICE**:
> DNS records must be added to your domain registrar / DNS provider (e.g. Cloudflare, Namecheap, AWS Route 53) where your domain is registered. Do not publish until you hold verified registrar control.

---

## 1. MX Records (Inbound Delivery)

| Type | Name / Host | Priority | Target / Destination | TTL |
| :--- | :--- | :---: | :--- | :--- |
| `MX` | `mail` (or `@`) | `10` | `feedback-smtp.us-east-1.amazonses.com` (or Resend MX) | Auto / 3600 |

---

## 2. SPF Record (Sender Authentication)

Authorizes Resend / mail servers to send email on behalf of your domain:

| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `mail` (or `@`) | `v=spf1 include:amazonses.com ~all` | Auto / 3600 |

---

## 3. DKIM Records (Cryptographic Signing)

Resend generates three CNAME records for 2048-bit DKIM key rotation:

| Type | Name / Host | Target Value |
| :--- | :--- | :--- |
| `CNAME` | `resend._domainkey` | `dkim.resend.com` |
| `CNAME` | `resend2._domainkey` | `dkim2.resend.com` |
| `CNAME` | `resend3._domainkey` | `dkim3.resend.com` |

---

## 4. DMARC Policy Record

Enforces protection against domain spoofing and phishing:

| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@chase-studios.org` | Auto / 3600 |

- `p=quarantine`: Soft-fails unauthenticated emails to Spam without dropping genuine messages during rollout.
- `pct=100`: Applies to all outbound traffic.
- `rua`: Aggregate deliverability reports destination.
