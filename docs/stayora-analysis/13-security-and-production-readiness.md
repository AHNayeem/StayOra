# 13 — Security & Production Readiness

> **Headline finding: Otithee is not production-ready and must not be deployed publicly with real users, real money or real personal data in its current form.**
>
> This is not a criticism of the work. It is a **prototype by design**, and the code says so about itself repeatedly and honestly. The purpose of this section is to make the gap explicit and specific.

---

## Why there is effectively no security

Security controls protect a boundary between a trusted server and an untrusted client. **Otithee has no server**, so there is no boundary. Every control in the codebase runs in the browser, where the user can inspect and change it.

---

## Audit

| Control | Status | Finding |
|---|---|---|
| **Authentication** | 🔴 Not real | Passwords compared with `account.password !== password` — plain-text, no hashing, no salt. Seed passwords are in the repository (`Passw0rd!`). |
| **Password policy** | 🔴 | Zod validation on the form only; no strength rules enforced anywhere authoritative, no breach checking, no rotation, no history. |
| **OTP / email verification** | 🔴 | The accepted code is the constant `123456`, exported as `MOCK_OTP`. |
| **Session management** | 🔴 | Session is a JSON object in `localStorage` (XSS-readable) plus a mirrored cookie. The token is `mock.` + base64 of `userId:expiry` — **decodable and forgeable by anyone**. No server-side session store, no revocation, no refresh, no device list. |
| **Cookie security** | 🔴 | `otithee_session` is set with `path=/; max-age=…; samesite=lax` — **no `httpOnly`, no `Secure`, no signature**. Contains the role in plain text. Editing `"role":"merchant"` → `"role":"super_admin"` in DevTools grants every permission. |
| **Authorization / RBAC** | 🟡 Designed well, unenforced | Three client-side layers, correctly built. Server helpers exist and derive permissions from the role rather than the cookie — the right pattern. But the role itself comes from an unsigned cookie. |
| **Input validation** | 🟡 | Zod schemas throughout for forms — good UX validation. There is no boundary to validate at, so no server-side validation exists. |
| **Output encoding / XSS** | 🟡 | React escapes by default and no `dangerouslySetInnerHTML` was found in application code. But session data in `localStorage` means any XSS is a full account takeover. |
| **CSRF** | 🔴 | No tokens. Not currently exploitable (no state-changing server endpoints), but the cookie is `SameSite=Lax` rather than `Strict`. |
| **API security** | 🔴 | No APIs. The HTTP client supports bearer tokens and is well built; nothing consumes it. |
| **Rate limiting** | 🔴 | None anywhere. Login, OTP, promo-code validation and search are all unthrottled. |
| **Brute-force protection** | 🔴 | No lockout, no backoff, no CAPTCHA. |
| **MFA** | 🔴 | Not present. A security page exists with no MFA behind it. |
| **Sensitive data handling** | 🟡 Mixed | **Good:** no card number is ever captured or stored — only brand, last-4 and expiry label, exactly as a tokenised instrument would be. **Bad:** full personal data (names, emails, phones, passport-shaped traveller documents) sits unencrypted in `localStorage`. |
| **Payment security** | 🔵 N/A | No real payment. No PCI scope has been assessed. When a gateway lands, hosted fields must be used to keep scope at SAQ-A. |
| **Admin security** | 🔴 | No separate admin authentication, no IP allow-listing, no step-up auth for financial actions, no session timeout on inactivity. |
| **Audit logging** | ✅ Good design | Every financial and lifecycle change records actor, action, entity, before and after — and it is tested. But the log is in `localStorage` and can be deleted by the user it would incriminate. |
| **Secrets management** | ✅ N/A today | No secrets exist because no integrations exist. No `.env` file, nothing committed. |
| **Transport security** | 🔴 | No HTTPS enforcement, HSTS, CSP, `X-Frame-Options` or any security headers configured. `next.config.ts` contains only image patterns. |
| **Dependency security** | 🟡 | 12 runtime dependencies, all mainstream and current. No automated vulnerability scanning configured. |
| **Data isolation** | 🔴 | Multi-tenancy is by client-side filter (`merchantId`, `organizationId`). Correct in design, unenforceable in practice. |
| **GDPR / privacy** | 🔴 | No consent management, no cookie banner, no privacy policy page, no data export, no right-to-erasure, no retention policy, no processing records. |

---

## Concrete vulnerabilities in the current build

| # | Issue | Severity today | Severity with a backend |
|---|---|---|---|
| 1 | Session cookie is unsigned, non-`httpOnly` and carries the role → privilege escalation by editing a string | Low (no server data to reach) | **Critical** |
| 2 | Session token is `base64(userId:expiry)` → trivially forgeable | Low | **Critical** |
| 3 | Plain-text password comparison; seed passwords in the repo | Low | **Critical** |
| 4 | Fixed OTP `123456` | Low | **Critical** |
| 5 | Prices computed client-side → a user can change what they are charged | Medium | **Critical** |
| 6 | Full PII in `localStorage`, unencrypted | Medium | High |
| 7 | Audit log deletable by the actor it records | Medium | **Critical** |
| 8 | No rate limiting on any input | Low | High |
| 9 | No security headers / CSP | Medium | High |
| 10 | Tenant isolation by client-side filter | Low | **Critical** |

**The pattern is the important part:** almost every item is *low risk now and critical the moment a backend exists*. These must be fixed **as part of** the backend build, not scheduled after it.

---

## Scalability

| Dimension | Finding |
|---|---|
| **Data volume** | The entire domain dataset serialises into one `localStorage` key. Browser quota (~5–10 MB) is a hard ceiling; the code catches the write failure and degrades silently, so it will fail quietly rather than loudly. |
| **Catalogue size** | ~380 listings are generated at module load and shipped to the client. Real catalogues are 10⁵–10⁶. Search, filtering and the map all operate in memory over the full corpus. |
| **Concurrency** | Not applicable — single browser, single user. The inventory hold mechanism is correctly designed for concurrency but has never faced any. |
| **Bundle size** | All mock data, generators and every module ship together. No bundle analysis has been done. |
| **Rendering** | Server Components used well; SSR is deterministic. This will scale. |
| **Caching** | An in-house query cache with staleness exists client-side. No HTTP caching, CDN strategy or server cache. |

## Reliability

| Dimension | Finding |
|---|---|
| Error handling | ✅ Route-level boundaries, normalised `ApiError` kinds, offline banner, retry paths |
| Data integrity | 🟡 Store merges per-collection so a partial write cannot blank the app; schema-versioned to discard stale state. But no transactions and no atomicity across multi-step operations. |
| Backup / recovery | 🔴 None. Clearing site data destroys everything. |
| Monitoring | 🔴 Telemetry seams exist; nothing is transmitted |
| Alerting | 🔴 None |
| Health checks | 🔴 None |
| Graceful degradation | ✅ Storage failures, geolocation denial and offline state are all handled |

## Operational readiness

| Item | Status |
|---|---|
| CI/CD | 🔴 None |
| Automated tests in a pipeline | 🔴 145 domain tests exist but run only manually |
| Component / integration / E2E tests | 🔴 None; no test framework installed |
| Accessibility tests | 🔴 None |
| Load testing | 🔴 None |
| Containerisation / IaC | 🔴 None |
| Environments (dev/staging/prod) | 🔴 Not configured |
| Runbooks / incident process | 🔴 None |
| Logging | 🔴 None |
| Feature-flag control at runtime | 🟡 Flags exist; all default on; no remote control |
| Maintenance mode | 🟠 A page exists; nothing enforces it |

---

## Production-readiness checklist

### Must have before any public launch

- [ ] Backend API with a real database
- [ ] Server-issued, signed, `httpOnly`, `Secure` sessions
- [ ] Password hashing (argon2/bcrypt) and a real password policy
- [ ] Real OTP generation, delivery and expiry
- [ ] Server-side authorization on every read and write
- [ ] Server-side pricing, availability and commission authority
- [ ] Rate limiting and brute-force protection
- [ ] Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] HTTPS enforcement
- [ ] Real payment gateway with webhooks and idempotency
- [ ] Server-side, immutable audit log
- [ ] Encrypted PII at rest and in transit
- [ ] Backup and restore, tested
- [ ] Error monitoring and alerting
- [ ] CI/CD with automated tests as a gate
- [ ] Privacy policy, terms, cookie consent
- [ ] GDPR data export and erasure
- [ ] Penetration test

### Should have

- [ ] MFA for admin and finance roles
- [ ] Step-up authentication for financial actions
- [ ] Session timeout and device management
- [ ] Automated dependency vulnerability scanning
- [ ] Structured logging with correlation IDs
- [ ] Load testing at expected peak
- [ ] Disaster-recovery plan with RTO/RPO
- [ ] Runtime feature-flag control
- [ ] Accessibility audit against WCAG 2.2 AA
- [ ] E2E test coverage of the critical booking paths

---

## Recommendation

**Do not deploy publicly.** Keep the current build as an internal demonstration and design reference, which is exactly what it is excellent at.

For the backend phase, treat security as **part of the definition of done for each endpoint**, not as a hardening pass afterwards. The tempting sequence — build the API, then secure it — is precisely how prototype auth patterns survive into production, and every one of the ten vulnerabilities above becomes critical the moment there is real data behind them.
