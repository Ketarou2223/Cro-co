import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface ProfileData {
  id: string
  email: string
  gender: string | null
  interest_in: string | null
  profile_setup_completed: boolean
  onboarding_completed: boolean
  student_id_submitted: boolean
  submitted_at: string | null
  status: 'pending_review' | 'approved' | 'rejected'
  name: string | null
  year: number | null
  faculty: string | null
  department: string | null
  bio: string | null
  interests: string[]
  clubs: string[]
  looking_for: string | null
  status_message: string | null
  liked_count: number
  identity_verified: boolean
  profile_image_path: string | null
  photos: { id: string; image_path: string; display_order: number; signed_url?: string }[]
}

export function useProfile() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile-me'],
    queryFn: () => api.get<ProfileData>('/api/profile/me').then(r => r.data),
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  })
  return { profile, isLoading }
}
