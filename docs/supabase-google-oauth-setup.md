# Google OAuth Setup for Supabase

## 1. Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project or select existing
3. "Create Credentials" → "OAuth 2.0 Client ID"
4. Application type: "Web application"
5. Name: "Milheiro"
6. **Authorized redirect URIs** (IMPORTANTE: o Google redireciona para o Supabase, nao para o Vercel):
   - `https://tcrxfeczxlohsdhkhgyq.supabase.co/auth/v1/callback`
7. Create and copy Client ID and Client Secret

## 2. Supabase Cloud Dashboard — Auth Providers

1. Go to https://supabase.com/dashboard/project/tcrxfeczxlohsdhkhgyq
2. Authentication → Providers → Google
3. Enable Google provider
4. Paste Client ID and Client Secret from Google Cloud Console
5. Save

## 3. Supabase Cloud Dashboard — URL Configuration

1. Authentication → URL Configuration
2. **Site URL**: `https://web-alpha-ashy-0yn7kj4k5v.vercel.app`
3. **Redirect URLs**: adicione (um por linha):
   - `https://web-alpha-ashy-0yn7kj4k5v.vercel.app/auth/callback`
   - `https://web-*.vercel.app/auth/callback`
4. Save

## 3. Local Development

For local Supabase, add to `supabase/.env`:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<your-client-id>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<your-client-secret>
```

Then restart Supabase:
```bash
npx supabase stop && npx supabase start
```

Note: Google OAuth requires a public URL for the redirect. For local dev with Google login to work, you may need to:
- Use `localhost` (not `127.0.0.1`) in the redirect URI
- Or use a tunnel service like ngrok and update the redirect URI accordingly

## 4. Verify

1. Start dev server: `cd apps/web && npx next dev -p 3000`
2. Navigate to `http://localhost:3000`
3. Should redirect to `/login`
4. Click "Entrar com Google"
5. Complete Google OAuth flow
6. Should redirect back to Dashboard
7. Sidebar should show your Google avatar and name
