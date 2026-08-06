export type UserRole = "client" | "attorney";

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferred_language?: string;
}

export interface AuthTokenDto {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUserDto;
}

export interface AIHealthStatus {
  status: string;
  provider: string;
  model: string;
  available: boolean;
}
