/**
 * CitationCopilot — feeds live data from the ttruthdesk.claims API into
 * CopilotKit's readable context so the AI assistant can answer questions
 * about the current state of the knowledge base.
 */
import { useQuery } from '@tanstack/react-query'
import { useCopilotReadable } from '@copilotkit/react-core'
import { api } from '@/lib/api'

export function CitationCopilot() {
  const { data: globalStats } = useQuery({
    queryKey: ['globalStats'],
    queryFn: api.globalStats,
    staleTime: 60_000,
  })

  const { data: verticalStats } = useQuery({
    queryKey: ['verticalStats'],
    queryFn: api.verticalStats,
    staleTime: 60_000,
  })

  const { data: verticalDetails } = useQuery({
    queryKey: ['verticalListAll'],
    queryFn: api.verticalListAll,
    staleTime: 60_000,
  })

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.leaderboardTopEntities({ limit: 20 }),
    staleTime: 60_000,
  })

  // Feed global stats to CopilotKit
  useCopilotReadable({
    description: 'Global knowledge base statistics for citation.is',
    value: globalStats
      ? {
          totalDocuments: globalStats.totalDocuments,
          totalClaims: globalStats.totalClaims,
          supportedVerdicts: globalStats.supportedVerdicts,
          verifiedSources: globalStats.verifiedSources,
        }
      : 'Loading...',
  })

  // Feed vertical stats to CopilotKit
  useCopilotReadable({
    description: 'Research verticals with document and claim counts',
    value:
      verticalStats && verticalDetails
        ? verticalStats.map(v => {
            const detail = verticalDetails.find(d => d.domainKey === v.domain)
            return {
              domain: v.domain,
              displayName: detail?.displayName ?? v.domain,
              description: detail?.description?.slice(0, 200),
              totalDocuments: v.totalDocs,
              totalClaims: v.totalClaims,
              supportedClaims: v.supportedClaims,
              supportRate:
                v.totalClaims > 0
                  ? `${Math.round((v.supportedClaims / v.totalClaims) * 100)}%`
                  : '0%',
            }
          })
        : 'Loading...',
  })

  // Feed top entities leaderboard to CopilotKit
  useCopilotReadable({
    description: 'Top 20 most-cited entities in the knowledge base',
    value: leaderboard
      ? leaderboard.slice(0, 20).map(e => ({
          rank: e.rank,
          name: e.canonicalName,
          type: e.entityType,
          totalCitations: e.totalCitations,
          trend: e.trend,
        }))
      : 'Loading...',
  })

  return null
}
