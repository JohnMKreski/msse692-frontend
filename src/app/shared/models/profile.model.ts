//TODO: Update Profile DTO response to include all necessary fields added in Request
//TODO: Update Profile Controller to add CRUD API ednpoints for all profile requests. 
export type ProfileType = 'VENUE' | 'ARTIST' | 'OTHER';

export interface ProfileResponse {
  id: number;
  user_id: number; // note: backend may send as user_id
  displayName: string;
  profileType: ProfileType;
  location?: string | null;
  description?: string | null;
  socials?: string[] | null;
  websites?: string[] | null;
  completed: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRequest {
  displayName: string;
  profileType: ProfileType;
  location?: string; // required when profileType === 'VENUE'
  description?: string;
  socials?: string[]; // list of social profile URLs
  websites?: string[]; // list of website URLs
}
