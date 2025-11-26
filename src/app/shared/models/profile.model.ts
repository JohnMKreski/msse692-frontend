//TODO: Update Profile DTO response to include all necessary fields added in Request
//TODO: Update Profile Controller to add CRUD API ednpoints for all profile requests. 
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
  profileType?: 'VENUE' | 'ARTIST' | 'OTHER';
  location?: string; // only if VENUE
  description?: string;
  socials?: string[]; // list of social profile URLs
  websites?: string[]; // list of website URLs
}
