import { Button } from '@/components/ui/button'
import { TrashIcon } from '@radix-ui/react-icons'

export interface Log {
  query: string
  error?: string
  executionTime: number
}

export default function Logs({
  logs,
  setLogs,
}: {
  logs: Log[]
  setLogs: (logs: Log[]) => void
}) {
  if (logs.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <p className="text-slate-500">Write a query to populate this space.</p>
      </div>
    )
  }
  return (
    <>
      <div className="flex flex-row gap-2 my-4">
        <Button
          variant="ghost"
          className="text-gray-500"
          onClick={() => setLogs([])}
        >
          <TrashIcon className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {logs.map((log, i) => (
          <div
            key={i}
            className="p-4 bg-white shadow-sm border border-gray-200 rounded-xl"
          >
            <p className="text-sm text-gray-500">
              {log.query.replace(/\s+/g, ' ')}
            </p>
            <div className="flex flex-row justify-between gap-4">
              <p
                className={`text-sm truncate ${
                  log.error === undefined ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {log.error === undefined ? 'Success' : log.error}
              </p>
              <p className="text-sm text-gray-500">{log.executionTime}ms</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
