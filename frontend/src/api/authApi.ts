import type { AuthTokenDto, AuthUserDto, LoginDto } from "../types/api";
import { buildPath } from "./endpointRegistry";
import { http } from "./http";

export const authApi = {
  async login(dto: LoginDto): Promise<AuthTokenDto> {
    const response = await http.post<AuthTokenDto>(buildPath("auth.login"), dto);
    return response.data;
  },

  async getCurrentUser(): Promise<AuthUserDto> {
    const response = await http.get<AuthUserDto>(buildPath("auth.me"));
    return response.data;
  },
};
