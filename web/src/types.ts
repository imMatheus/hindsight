export type CommitStats = {
  hash: string
  author: string
  date: string
  added: number
  removed: number
  message: string
}

export type FileTouchCount = {
  file: string
  count: number
}
