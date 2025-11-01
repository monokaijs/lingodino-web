import {apiClient} from './client'
import {
  ApiResponse,
  CreateUserDto,
  UpdateUserDto,
  UserListParams,
  UserListResponseDto,
} from './types'
import {User} from '@/lib/types/models/user'

export const userApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/users/me')
    return response.data.data
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
    return response.data.data
  },

  list: async (params?: UserListParams): Promise<UserListResponseDto> => {
    const response = await apiClient.get<ApiResponse<UserListResponseDto>>('/users', {params})
    return response.data.data
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', data)
    return response.data.data
  },

  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data)
    return response.data.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}

