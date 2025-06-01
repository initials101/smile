// Debug middleware to log request details
export const requestLogger = (req, res, next) => {
    console.log(`\n🔍 DEBUG REQUEST: ${new Date().toISOString()}`)
    console.log(`📌 ${req.method} ${req.originalUrl}`)
  
    // Log request headers
    console.log("📋 Headers:", JSON.stringify(req.headers, null, 2))
  
    // Log request body if present
    if (req.body && Object.keys(req.body).length > 0) {
      console.log("📦 Body:", JSON.stringify(req.body, null, 2))
    }
  
    // Log query parameters if present
    if (req.query && Object.keys(req.query).length > 0) {
      console.log("❓ Query:", JSON.stringify(req.query, null, 2))
    }
  
    // Log route parameters if present
    if (req.params && Object.keys(req.params).length > 0) {
      console.log("🔑 Params:", JSON.stringify(req.params, null, 2))
    }
  
    // Capture the original send method
    const originalSend = res.send
  
    // Override the send method to log the response
    res.send = function (body) {
      console.log(`\n📤 RESPONSE: ${res.statusCode}`)
      try {
        const parsedBody = JSON.parse(body)
        console.log("📄 Body:", JSON.stringify(parsedBody, null, 2))
      } catch (e) {
        console.log("📄 Body:", body)
      }
  
      // Call the original send method
      return originalSend.call(this, body)
    }
  
    next()
  }
  