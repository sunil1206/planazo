/**
 * NextAuth v5 configuration.
 * Google provider + Credentials provider.
 * After Google login → exchanges Google token with Django → stores JWT.
 */
import NextAuth from "next-auth";
import Google      from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login/`,
            {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify(credentials),
            }
          );
          if (!res.ok) return null;
          const data = await res.json();
          return {
            id:            data.user.id,
            email:         data.user.email,
            name:          data.user.full_name,
            image:         data.user.avatar_url,
            role:          data.user.role,
            access_token:  data.access,
            refresh_token: data.refresh,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // For Google login: exchange Google id_token with Django
      if (account?.provider === "google" && account.id_token) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/`,
            {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ id_token: account.id_token }),
            }
          );
          if (!res.ok) return false;
          const data = await res.json();
          // Attach Django tokens to user object for jwt callback
          (user as any).access_token  = data.access;
          (user as any).refresh_token = data.refresh;
          (user as any).role          = data.user.role;
          (user as any).django_id     = data.user.id;
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.access_token  = (user as any).access_token;
        token.refresh_token = (user as any).refresh_token;
        token.role          = (user as any).role;
        token.django_id     = (user as any).id;
      }
      return token;
    },

    async session({ session, token }) {
      (session.user as any).role          = token.role as string;
      (session.user as any).django_id     = token.django_id as number;
      (session as any).access_token  = token.access_token;
      (session as any).refresh_token = token.refresh_token;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: { strategy: "jwt" },
});
