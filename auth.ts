import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Google authentication establishes control of an account, not civil identity.
// Keep the provider's stable Google subject in the JWT and expose it as session.user.id.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'google' && account.providerAccountId) {
        token.signerId = `google:${account.providerAccountId}`;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.signerId === 'string') {
        session.user.id = token.signerId;
      }
      return session;
    },
  },
});
