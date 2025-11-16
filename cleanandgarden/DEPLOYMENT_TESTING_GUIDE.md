# WebSocket Chat - Deployment & Testing Guide

## 🎯 Problem Summary
After Railway backend migration, WebSocket chat stopped working because:
1. Hardcoded `ws://localhost:3001/ws` URLs couldn't connect to HTTPS Railway domain
2. Railway requires WSS (secure WebSocket), not WS
3. No retry logic for connection failures
4. Single URL meant code couldn't adapt to different environments

## ✅ Solution Implemented
- ✅ Created `getWebSocketURL()` function to dynamically convert protocols
- ✅ Implemented retry logic with exponential backoff (5 attempts, 2s delay)
- ✅ Updated all fetch calls to use environment variables
- ✅ Applied fixes to both `useChatRealtime.ts` and `mensajes/page.tsx`

---

## 📋 Files Modified

### 1. `web/src/hooks/useChatRealtime.ts`
- Added `getWebSocketURL()` function (lines 6-12)
- Updated WebSocket connection with retry logic (lines 64-141)
- Updated `fetchMensajes()` to use `${apiUrl}` (line 32)
- Updated `sendMessage()` to use `${apiUrl}/mensajes` (line 157)

### 2. `web/src/app/mensajes/page.tsx`
- Added `getWebSocketURL()` function (lines 8-13)
- Updated WebSocket connection with retry logic (lines 92-166)

---

## 🚀 Local Testing (Development)

### Prerequisites
```bash
# 1. Backend running
cd backend
npm run dev
# Should be on http://localhost:3001

# 2. Frontend environment
cd web
cat .env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:3001

# 3. Start frontend
npm run dev
# Should be on http://localhost:3000
```

### Test Procedure
1. **Open Chat Page**
   - Navigate to http://localhost:3000/mensajes
   - Check browser console for logs

2. **Verify WebSocket Connection**
   ```
   Expected console logs:
   ✓ "Conectando a WebSocket: ws://localhost:3001/ws"
   ✓ "Conectado al WebSocket en conversaciones"
   ```

3. **Send Test Message**
   - Open message composer
   - Type: "Test message at [TIME]"
   - Send message
   - Expected: Message appears instantly
   - Check console: `WebSocket recibido: { tipo: 'mensaje', ... }`

4. **Test Retry Logic** (optional)
   - Restart backend
   - Chat should show retry attempts in console
   - When backend comes back online, chat reconnects automatically

5. **Open Detail Conversation**
   - Click on a conversation to open detail view
   - Should connect to WebSocket for real-time updates
   - Console should show: `"Conectando a WebSocket: ws://localhost:3001/ws"`

### Verification Checklist
- [ ] Chat page loads without errors
- [ ] WebSocket logs show `ws://localhost:3001/ws` URL
- [ ] Sending message works instantly
- [ ] Receiving messages in real-time works
- [ ] No 404 or connection errors in console
- [ ] Network tab shows WebSocket connection
- [ ] Browser DevTools → Network → WS shows "Connected"

---

## 🌐 Staging/Production Testing (Railway)

### Prerequisites
1. **Backend on Railway**
   - URL: `https://believable-victory-production.up.railway.app`
   - `/ws` endpoint should be accessible

2. **Vercel Environment Variables**
   - Project: cleanandgarden web
   - Environment: Production
   - Variable: `NEXT_PUBLIC_API_URL`
   - Value: `https://believable-victory-production.up.railway.app`

3. **Verify Backend Configuration**
   ```bash
   # Check Railway backend logs
   # Should show: "Port: 8080" or configured port
   # Should show: ChatWebSocket instance created
   ```

### Test Procedure
1. **Check Vercel Build**
   - Deploy to Vercel
   - Check build logs for errors
   - Build should complete successfully with both files compiling

2. **Open Chat on Production**
   - Navigate to https://cleanandgarden-web.vercel.app/mensajes
   - Open browser DevTools

3. **Verify WebSocket Connection**
   ```
   Expected console logs:
   ✓ "Conectando a WebSocket: wss://believable-victory-production.up.railway.app/ws"
   ✓ "Conectado al WebSocket en conversaciones"
   ```

4. **Network Inspection**
   - DevTools → Network tab
   - Filter by "WS"
   - Should show WebSocket connection (appears as "ws" or "wss")
   - Response headers should show:
     ```
     Connection: Upgrade
     Upgrade: websocket
     ```

5. **Send Test Message**
   - Type: "Test from production at [TIME]"
   - Send message
   - Expected: Appears instantly
   - Check console: `WebSocket recibido: { tipo: 'mensaje', ... }`

6. **Multi-User Test** (if possible)
   - Open chat in 2 different browsers/incognito windows
   - Send message from one
   - Should appear instantly in the other
   - Unread counter should update

### Verification Checklist
- [ ] Chat page loads without errors
- [ ] WebSocket logs show `wss://believable-victory-production.up.railway.app/ws` URL
- [ ] Network tab shows WebSocket connection with proper headers
- [ ] Sending message works instantly
- [ ] Receiving messages in real-time works
- [ ] No CORS errors in console
- [ ] No "Connection refused" errors
- [ ] Browser DevTools → Network → WS shows "Connected"

---

## 🔍 Troubleshooting

### Issue: WebSocket connects to `ws://` instead of `wss://`
**Symptom:** Console shows `ws://believable-victory-production...`
**Cause:** `NEXT_PUBLIC_API_URL` not updated in Vercel
**Fix:**
```bash
# 1. Check Vercel environment variables
vercel env pull

# 2. Should show:
NEXT_PUBLIC_API_URL=https://believable-victory-production.up.railway.app

# 3. If missing, add it:
vercel env add NEXT_PUBLIC_API_URL

# 4. Redeploy:
vercel deploy --prod
```

### Issue: WebSocket connection fails with 403/401
**Symptom:** `socket.onerror` fires immediately
**Cause:** Authentication or CORS issue
**Fix:**
```bash
# 1. Check backend CORS settings
# backend/src/server.ts line ~41
# Ensure Vercel domain is in allowed origins

# 2. Verify credentials in fetch:
credentials: 'include' ✓

# 3. Check cookies are being sent:
# DevTools → Application → Cookies
# Should show auth session cookie

# 4. If issue persists:
git commit
vercel deploy --prod --force
```

### Issue: WebSocket connects but messages don't sync
**Symptom:** WebSocket shows "Connected" but messages don't appear
**Cause:** Backend not broadcasting to all clients
**Fix:**
```bash
# 1. Check backend WebSocket implementation
# backend/src/lib/websocket.ts

# 2. Verify message broadcasting logic:
# - onMessage handler should parse message type
# - Should broadcast to all clients in conversation
# - Should NOT duplicate messages

# 3. Check browser console for errors:
# Look for "Error procesando mensaje WebSocket"

# 4. Restart backend:
railway down && railway up
```

### Issue: Connection drops and doesn't reconnect
**Symptom:** Chat stops working after a few minutes
**Cause:** Connection timeout, no ping/pong
**Fix:**
```typescript
// Already implemented in new code:
- MAX_RECONNECT_ATTEMPTS = 5 ✓
- RECONNECT_DELAY_MS = 2000 ✓
- Automatic retry on close ✓

// If still dropping, add heartbeat (future enhancement):
// Send ping every 30 seconds
// Backend sends pong
```

### Issue: `"Error al procesar mensaje WebSocket"` in console
**Symptom:** Messages received but error logged
**Cause:** Message format mismatch or parsing error
**Fix:**
```bash
# 1. Check message format from backend
# DevTools → Network → WS → Messages
# Should show: { tipo: 'mensaje', conversacionId, cuerpo, ... }

# 2. Verify field names in backend:
# Should be camelCase: conversacionId, remitenteId, creadoEn

# 3. Check frontend schema:
# web/src/hooks/useChatRealtime.ts line 18-22
# Ensure all fields are mapped
```

---

## 📊 Expected Browser Console Output

### Successful Connection (Local)
```
Conectando a WebSocket: ws://localhost:3001/ws
Conectado al WebSocket en conversaciones
✓ Chat ready for messaging
```

### Successful Connection (Production)
```
Conectando a WebSocket: wss://believable-victory-production.up.railway.app/ws
Conectado al WebSocket en conversaciones
✓ Chat ready for messaging
```

### Sending Message
```
WebSocket recibido: {tipo: 'mensaje', conversacionId: 1, remitenteId: 123, ...}
```

### Connection Lost & Retry
```
Conexión WebSocket cerrada
Reintentando conexión WebSocket (intento 1/5) en 2000ms...
Reconectando a WebSocket: ws://localhost:3001/ws
Conectado al WebSocket
```

### Max Retries Exceeded
```
Conexión WebSocket cerrada
Reintentando conexión WebSocket (intento 1/5) en 2000ms...
Reconectando a WebSocket: ws://localhost:3001/ws
Error creando WebSocket: Network error
... (repeats 5 times)
Max WebSocket reconnection attempts reached
✗ Chat disconnected, manual refresh required
```

---

## 🔧 Performance Metrics to Monitor

1. **Connection Time**
   - From page load to "Conectado al WebSocket"
   - Target: < 500ms
   - If > 2s, check network latency

2. **Message Delivery Time**
   - From send to receive (same browser)
   - Target: < 100ms
   - If > 500ms, check server processing

3. **Memory Usage**
   - Check DevTools → Memory
   - Should not increase over time
   - If increasing, check for memory leaks in message handling

4. **CPU Usage**
   - During message exchange
   - Should remain low (< 5%)
   - If high, check for unnecessary re-renders

---

## 📝 Testing Scenarios

### Scenario 1: Normal Chat Flow
```
1. User A opens chat page
   → WebSocket connects
   
2. User A composes message
   → Sends "Hello from A"
   
3. User B receives message
   → WebSocket delivers in < 100ms
   → Message appears with timestamp
   
4. User B replies
   → Sends "Hello from B"
   
5. User A receives reply
   → WebSocket delivers in < 100ms
   → Conversation updates
   
Result: ✅ PASS
```

### Scenario 2: Connection Loss & Recovery
```
1. Chat connected normally
   → Can send/receive messages
   
2. Backend restarts (simulated network loss)
   → Console shows retry attempts
   → After restart, reconnects automatically
   → Previous messages still visible
   
3. Send new message
   → Works normally
   
Result: ✅ PASS
```

### Scenario 3: High Load
```
1. Rapid message exchange (10 messages/sec)
   → No missed messages
   → All messages delivered in order
   → No duplicates
   
2. Monitor memory
   → Should stay stable
   → No memory leaks
   
Result: ✅ PASS
```

### Scenario 4: Multi-Device Sync
```
1. User logs in from Device A
   → WebSocket connected
   
2. Same user opens Device B
   → WebSocket connected
   → Both devices receive messages
   
3. Message from external user
   → Appears on both devices simultaneously
   
Result: ✅ PASS
```

---

## 🚨 Rollback Plan

If critical issues occur:

```bash
# 1. Revert to previous commit
git revert HEAD~1

# 2. Redeploy
vercel deploy --prod --force

# 3. Clear browser cache
# DevTools → Application → Clear Storage
```

---

## 📞 Support Contacts

- **Backend Issues**: Check `backend/src/server.ts` and `backend/src/lib/websocket.ts`
- **Frontend Issues**: Check browser console logs
- **Railway Issues**: https://docs.railway.app/guides/websockets
- **Network Issues**: Check CORS and firewall settings

---

## ✨ Success Criteria

✅ WebSocket connects on first page load  
✅ Messages sync instantly between users  
✅ Connection recovers automatically on failure  
✅ No console errors or warnings  
✅ Works on both localhost and Railway  
✅ Supports production HTTPS/WSS  
✅ Handles rapid message exchange  
✅ No memory leaks over time  

