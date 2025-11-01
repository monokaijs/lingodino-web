import {apiClient} from './client'
import {
  ApiResponse,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
} from './types'

export const authApi = {
  login: async (data: LoginDto): Promise<LoginResponseDto> => {
    const response = await apiClient.post<ApiResponse<LoginResponseDto>>('/auth/login', data)
    return response.data.data
  },

  register: async (data: RegisterDto): Promise<RegisterResponseDto> => {
    const response = await apiClient.post<ApiResponse<RegisterResponseDto>>('/auth/register', data)
    return response.data.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}

