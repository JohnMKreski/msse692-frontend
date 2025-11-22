export interface AppUserDto {
  id: number | null;
  firebaseUid: string | null;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  roles: string[] | null;
  createdAt: string | null; // ISO string
  updatedAt: string | null; // ISO string
}
