export enum AttachmentType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
}
export interface Attachment {
  _id: string
  name: string
  type: AttachmentType
  url: string
  createdAt?: Date
  updatedAt?: Date
}
