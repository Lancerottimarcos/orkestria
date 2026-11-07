import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    userType: "staff" | "client";
    role?: "ADMIN" | "MEMBER";
    clientId?: string;
    /** true = login principal do Client (vê a aba Serviços); false = pessoa adicional (ClientPortalUser). */
    isClientOwner?: boolean;
  }

  interface Session {
    user: {
      id: string;
      userType: "staff" | "client";
      role: "ADMIN" | "MEMBER";
      clientId?: string;
      isClientOwner?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: "staff" | "client";
    role?: "ADMIN" | "MEMBER";
    clientId?: string;
    isClientOwner?: boolean;
  }
}
