import type { ProducerApi } from '../shared/producer-api'

declare global {
  interface Window {
    producerApi: ProducerApi
  }
}

export {}
