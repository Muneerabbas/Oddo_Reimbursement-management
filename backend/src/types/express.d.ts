export type AuthContext = {
  userId: number;
  companyId: number;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
