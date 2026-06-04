export interface AuthClient {
  getUserGroups(userId: string): Promise<string[]>;
  healthCheck(): Promise<{ status: string; error?: string }>;
  searchUsers(search: string): Promise<Array<{ id: string; name: string }>>;
  searchGroups(search: string): Promise<Array<{ id: string; name: string }>>;
}
