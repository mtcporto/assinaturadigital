import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Only Google accounts authenticated via the configured Umbrella OAuth client.
// A Google account proves control of that account, not civil identity.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
});
