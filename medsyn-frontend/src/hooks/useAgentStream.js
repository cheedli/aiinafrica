import { useState, useCallback } from 'react'

export default function useAgentStream() {
  const [events, setEvents] = useState([])
  const [report, setReport] = useState({})
  const [fullReport, setFullReport] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)

  const startAnalysis = useCallback(async (formData) => {
    setEvents([])
    setReport({})
    setFullReport(null)
    setError(null)
    setIsRunning(true)

    try {
      const response = await fetch('http://localhost:8000/analyze', {
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
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const event = JSON.parse(raw)
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

  return { events, report, fullReport, isRunning, error, startAnalysis }
}
