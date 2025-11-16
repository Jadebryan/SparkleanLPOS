// Simple API utility for landing page (public endpoints)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface Station {
  _id?: string
  id?: string
  stationId: string
  name: string
  address?: string
  phone?: string
  isActive?: boolean
  isArchived?: boolean
  notes?: string
}

export const stationAPI = {
  getAll: async (params?: { showArchived?: boolean }): Promise<Station[]> => {
    try {
      const queryParams = new URLSearchParams()
      // For public landing page, only show active, non-archived stations
      queryParams.append('showArchived', 'false')
      
      const query = queryParams.toString()
      // Use public endpoint that doesn't require authentication
      const endpoint = `${API_URL}/stations/public${query ? `?${query}` : ''}`
      
      console.log('[API] Fetching stations from:', endpoint)
      console.log('[API] API_URL:', API_URL)
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('[API] Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[API] Error response:', errorText)
        throw new Error(`Failed to fetch stations: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[API] Response data:', data)
      
      // Handle different response formats
      let stations: Station[] = []
      if (data && data.data && Array.isArray(data.data)) {
        stations = data.data
      } else if (Array.isArray(data)) {
        stations = data
      }
      
      console.log('[API] Parsed stations:', stations)
      
      // Filter active, non-archived stations
      const filtered = stations.filter((station: Station) => 
        station.isActive !== false && 
        !station.isArchived &&
        station.address &&
        station.address.trim() !== ''
      )
      
      console.log('[API] Filtered stations (with addresses):', filtered)
      
      return filtered
    } catch (error: any) {
      console.error('[API] Error fetching stations:', error)
      console.error('[API] Error details:', {
        message: error.message,
        stack: error.stack
      })
      // Return empty array on error so the page still renders
      return []
    }
  },
}

