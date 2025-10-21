# 🔒 Security Guidelines

## Critical Security Checklist

Before deploying or committing code, ensure:

- [ ] ✅ All secrets are in `.env.local` (NEVER in code)
- [ ] ✅ `.env.local` is in `.gitignore`
- [ ] ✅ `.env.example` has only placeholder values
- [ ] ✅ No API keys, tokens, or passwords in source code
- [ ] ✅ All environment variables use `process.env.NEXT_PUBLIC_*`
- [ ] ✅ Service role keys are NEVER exposed to browser
- [ ] ✅ Different credentials for dev/staging/production

---

## 🚨 Environment Variables Security

### ✅ DO's

```typescript
// ✅ CORRECT: Use environment variables
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### ❌ DON'Ts

```typescript
// ❌ WRONG: Never hardcode secrets
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const apiUrl = "https://njejsagzeebvsupzffpd.supabase.co";
```

---

## 📁 File Security

### Files that MUST be in `.gitignore`:

```gitignore
.env.local
.env.*.local
.env.development.local
.env.test.local
.env.production.local
```

### Files safe to commit:

```
✅ .env.example (placeholder values only)
✅ next.config.js (no secrets)
✅ Source code (.ts, .tsx files with env vars)
```

---

## 🔑 API Keys & Tokens

### Supabase Keys

- **Anon Key**: Safe for browser (read-only with RLS)
- **Service Role Key**: ⚠️ NEVER expose to browser
  - Only use server-side
  - Has admin privileges
  - Store in server-only env vars

### OpenAI / Anthropic / xAI Keys

- ⚠️ **NEVER** expose in browser code
- Only use server-side API routes
- Rotate immediately if exposed
- Monitor usage for anomalies

---

## 🛡️ Security Headers

The `next.config.js` includes security headers:

- **Strict-Transport-Security**: Force HTTPS
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **X-XSS-Protection**: XSS attack prevention
- **Referrer-Policy**: Control referrer information

---

## 🚀 Deployment Security

### Before deploying:

1. **Audit all environment variables**
   ```bash
   # Check for exposed secrets
   grep -r "api.*key\|secret\|password" --include="*.ts" --include="*.tsx" .
   ```

2. **Verify .gitignore**
   ```bash
   git status --ignored
   # Ensure .env.local is NOT tracked
   ```

3. **Use different credentials per environment**
   - Development: Separate Supabase project
   - Staging: Separate project with test data
   - Production: Production project with real data

4. **Enable RLS (Row Level Security) in Supabase**
   - Protect all tables with policies
   - Never trust client-side requests

---

## 🔄 Credential Rotation

### If a secret is exposed:

1. **Immediately rotate the key/token**
2. **Review git history** for the exposure
3. **Check logs** for unauthorized access
4. **Update `.env.local`** with new credentials
5. **Deploy** with new credentials
6. **Notify team** of the incident

### Rotation schedule:

- **Every 90 days**: Rotate API keys (recommended)
- **After team member leaves**: Rotate all keys
- **After suspected breach**: Rotate immediately

---

## 📊 Security Monitoring

### Monitor for:

- Unusual API usage patterns
- High costs from API providers
- Failed authentication attempts
- Unauthorized database access

### Tools:

- Supabase Dashboard → Logs & Analytics
- OpenAI Usage Dashboard
- Vercel Analytics (if deployed there)

---

## 🧪 Security Testing

### Before each release:

```bash
# 1. Check for secrets in code
npm run audit:secrets

# 2. Verify environment variables
npm run check:env

# 3. Test with production-like data
npm run test:security
```

---

## 📞 Incident Response

### If credentials are compromised:

1. **Rotate immediately** (< 15 minutes)
2. **Revoke old keys** in provider dashboard
3. **Review access logs** for unauthorized use
4. **Document the incident**
5. **Update security procedures**

---

## ✅ Security Checklist Summary

### Development
- [ ] Use `.env.local` for all secrets
- [ ] Never commit `.env.local`
- [ ] Keep `.env.example` updated
- [ ] Use `NEXT_PUBLIC_` prefix correctly
- [ ] Test with placeholder credentials first

### Pre-Commit
- [ ] Run `git status --ignored`
- [ ] Verify no secrets in staged files
- [ ] Check `.gitignore` is working
- [ ] Review diff for sensitive data

### Deployment
- [ ] Different credentials per environment
- [ ] RLS enabled on all Supabase tables
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] API rate limiting enabled

### Maintenance
- [ ] Rotate keys every 90 days
- [ ] Monitor API usage
- [ ] Review access logs monthly
- [ ] Update dependencies regularly

---

## 📚 Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/managing-user-data#security-best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

## 🆘 Questions?

If you're unsure about security:
1. **Ask the team** before committing
2. **Use .env.local** when in doubt
3. **Test in dev environment** first
4. **Review this guide** regularly

**Remember: It's better to ask than to expose credentials!** 🔐
