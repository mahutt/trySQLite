export interface Log {
  query: string
  status: 'success' | 'error'
}

export default function Logs({ logs }: { logs: Log[] }) {
  return (
    <div className="flex flex-col gap-2">
      {logs.map((log, i) => (
        <div
          key={i}
          className="p-4 bg-white shadow-sm border border-gray-200 rounded-xl"
        >
          <p className="text-sm text-gray-500">
            {log.query.replace(/\s+/g, ' ')}
          </p>
          <p
            className={`text-sm ${
              log.status === 'success' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {log.status}
          </p>
        </div>
      ))}
    </div>
  )
}
