export interface ProfileResponse {
  id: number;
  userId: number;
  displayName: string;
  completed: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRequest {
  displayName: string;
}
