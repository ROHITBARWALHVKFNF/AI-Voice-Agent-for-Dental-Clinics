import { apiJson } from "./api";

export interface CurrentUser {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string;
  timezone: string;
  currency: string;
  description?: string | null;
}

export interface CurrentUserResponse {
  user: CurrentUser;
  organization: Organization;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiJson<CurrentUserResponse>("/organizations/me/user");
}