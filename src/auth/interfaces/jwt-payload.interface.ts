export interface JwtPayload {
  sub: string;
  email: string;
  role: 'CASHIER' | 'ADMIN';
  outletId?: string;
}

export interface RequestWithUser {
  user?: JwtPayload;
}
