import { useState, useCallback } from 'react'

export default function useAgentStream() {
  const [events, setEvents] = useState([])
  const [report, setReport] = useState({})
  const [fullReport, setFullReport] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)
  const [taskUrl, setTaskUrl] = useState(null)

  const startAnalysis = useCallback(async (formData, url = 'http://localhost:8000/analyze') => {
    setEvents([])
    setReport({})
    setFullReport(null)
    setError(null)
    setTaskUrl(null)
    setIsRunning(true)

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        setError(`Server error: ${response.status}`)
        setIsRunning(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line) console.log('[raw]', JSON.stringify(line.slice(0, 120)))
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const event = JSON.parse(raw)
            console.log('[stream]', event.type, event.message?.slice(0, 80))
            setEvents(prev => [...prev, event])

            if (event.type === 'section') {
              if (event.message === 'differentials' && event.data?.differentials) {
                setReport(prev => ({ ...prev, differentials: event.data.differentials }))
              } else if (event.message === 'evidence' && event.data?.evidence) {
                setReport(prev => ({ ...prev, evidence: event.data.evidence }))
              } else if (event.message === 'action_plan' && event.data?.action_plan) {
                setReport(prev => ({ ...prev, actionPlan: event.data.action_plan }))
              } else if (event.message === 'who_context' && event.data?.who_context) {
                setReport(prev => ({ ...prev, whoContext: event.data.who_context }))
              }
            } else if (event.type === 'tool') {
              // Tool events are added to the events array as-is; frontend animates them
              // (already pushed via setEvents below)
            } else if (event.type === 'data' && event.data?.task_url) {
              setTaskUrl(event.data.task_url)
            } else if (event.type === 'data' && event.data?.language) {
              setReport(prev => ({ ...prev, language: event.data.language }))
            } else if (event.type === 'done' && event.data?.report) {
              setFullReport(event.data.report)
              setIsRunning(false)
            } else if (event.type === 'error') {
              setError(event.message)
              setIsRunning(false)
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      setError(`Connection error: ${e.message}`)
    } finally {
      setIsRunning(false)
    }
  }, [])

  return { events, report, fullReport, isRunning, error, taskUrl, startAnalysis }
}
