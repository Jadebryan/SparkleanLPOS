const EventEmitter = require('events')

// Singleton event emitter used to broadcast notifications to SSE clients
class NotificationEmitter extends EventEmitter {}

module.exports = new NotificationEmitter()


