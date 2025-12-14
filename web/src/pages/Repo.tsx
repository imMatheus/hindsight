import { useParams } from 'react-router'

export default function Repo() {
  const { username, repo } = useParams<{ username: string; repo: string }>()

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Repository</h1>
        <div className="space-y-2">
          <p className="text-xl">
            <span className="text-neutral-400">Username:</span>{' '}
            <span className="text-blue-400 font-semibold">{username}</span>
          </p>
          <p className="text-xl">
            <span className="text-neutral-400">Repository:</span>{' '}
            <span className="text-blue-400 font-semibold">{repo}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
