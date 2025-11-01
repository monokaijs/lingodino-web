import {User, UserRole} from '@/lib/types/models/user'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T = any> {
  data: T
  pagination?: PaginationMeta
  code: number
  message: string
}

export interface ApiErrorResponse {
  data: null
  pagination?: undefined
  code: number
  message: string
}

export interface LoginDto {
  username: string
  password: string
}

export interface LoginResponseDto {
  user: {
    id: string
    username: string
    fullName: string
    role: UserRole
    photo?: string
  }
  token?: string
}

export interface RegisterDto {
  username: string
  password: string
  fullName: string
}

export interface RegisterResponseDto {
  message: string
  user: {
    username: string
    fullName: string
    role: UserRole
  }
}

export interface UpdateUserDto {
  fullName?: string
  phoneNumber?: string
  photo?: string
}

export interface CreateUserDto {
  username: string
  password: string
  fullName: string
  role: UserRole
  phoneNumber?: string
  photo?: string
}

export interface UserListParams {
  page?: number
  limit?: number
  role?: UserRole
  search?: string
}

export interface UserListResponseDto {
  users: User[]
  pagination: PaginationMeta
}

