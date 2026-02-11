import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const BACKEND_URL =
  (process.env.BACKEND_URL || "http://localhost:8000") + "/api/v1";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // Store Google tokens
        token.googleAccessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // Register/login with our backend and get a backend JWT
        try {
          const res = await fetch(`${BACKEND_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: token.email,
              name: token.name,
              image: token.picture,
              googleId: account.providerAccountId,
              googleAccessToken: account.access_token,
              googleRefreshToken: account.refresh_token,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.access_token;
            token.backendUserId = data.user?.id;
            token.backendTokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
          } else {
            console.error(
              "[Auth] Backend login failed:",
              res.status,
              await res.text()
            );
          }
        } catch (error) {
          console.error("[Auth] Backend unreachable:", error);
        }
      }

      // Refresh backend token if it's expiring within 1 hour
      const expiry = token.backendTokenExpiry as number | undefined;
      if (
        token.backendUserId &&
        expiry &&
        Date.now() > expiry - 60 * 60 * 1000
      ) {
        try {
          const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token.backendToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.access_token;
            token.backendTokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
          }
        } catch {
          // Refresh failed — keep existing token
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.backendToken = token.backendToken as string;
      session.googleAccessToken = token.googleAccessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
});

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    googleAccessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    backendToken?: string;
    backendUserId?: string;
    backendTokenExpiry?: number;
    googleAccessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
