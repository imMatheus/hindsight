export type CommitStats = {
  hash: string
  author: string
  date: string
  added: number
  removed: number
  message: string
}

export type CommitStatsAPI = {
  h: string // hash
  a: string // author
  d: number // date
  '+': number // added
  '-': number // removed
  m: string // message
}

export type FileTouchCount = {
  file: string
  count: number
}

export type Repository = {
  username: string
  repoName: string
  totalAdditions: number
  totalLines: number
  totalRemovals: number
  views: number
  linesHistogram: number[]
  totalStars: number
  totalCommits: number
}

export type GitHubRepo = {
  stargazers_count: number
  language: string
  size: number
}

export type GitHubPullRequest = {
  id: number
  number: number
  title: string
  body: string
  user: GitHubUser
  created_at: string
  state: string
  html_url: string
  comments: number
  pull_request?: GitHubPullRequestInfo
  reactions: GitHubReactions
}

export type GitHubPullRequestInfo = {
  merged_at?: string
}

export type GitHubReactions = {
  total_count: number
  '+1': number
  '-1': number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export type GitHubUser = {
  login: string
  avatar_url: string
  html_url: string
}
