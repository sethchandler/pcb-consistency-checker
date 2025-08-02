# Stable Server Launch Guide

## The Recurring Problem
Development servers keep dying during sessions due to:
- Configuration changes while servers are running
- Hot Module Reloading memory leaks in long sessions
- Incomplete process cleanup between changes
- Mixing dev/preview servers causing conflicts

## ✅ STABLE LAUNCH PROCESS (Use This!)

### 1. Complete Environment Reset
```bash
# Kill all Node.js/npm processes
pkill -f "node.*vite" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null 
pkill -f "npm.*preview" 2>/dev/null
sleep 2

# Verify ports are available
lsof -ti:4173 >/dev/null 2>&1 && echo "Port 4173 in use" || echo "Port 4173 available"
```

### 2. Build Production Version
```bash
cd /path/to/modern-consistency-checker
npm run build

# Verify build success
ls -la dist/
```

### 3. Launch Stable Preview Server
```bash
# Start in background with nohup for persistence
nohup npm run preview > preview.log 2>&1 &
echo "Preview server started, PID: $!"

# Wait and verify
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/
```

### 4. Health Check
- Server should respond with HTTP 200
- Check `preview.log` for any startup errors
- App available at `http://localhost:4173/`

## Why This Works

### ✅ Production Build Benefits:
- **No Hot Module Reloading**: Eliminates memory leaks
- **Optimized bundles**: Faster, more stable
- **Static file serving**: Like real web server
- **No file watchers**: No resource conflicts

### ✅ Background Process Benefits:
- **Session independent**: Won't die if terminal closes
- **Process isolation**: Clean environment
- **Persistent**: Survives configuration changes

### ✅ Complete Reset Benefits:
- **Clean ports**: No zombie processes
- **Fresh environment**: No accumulated issues
- **Consistent state**: Predictable starting point

## ❌ AVOID THESE PATTERNS

### Don't Use Dev Server for Long Sessions:
```bash
# UNSTABLE - causes recurring deaths
npm run dev
```

### Don't Make Config Changes While Running:
```bash
# UNSTABLE - confuses hot reloading
# Edit vite.config.ts while server running
```

### Don't Mix Server Types:
```bash
# UNSTABLE - port conflicts
npm run dev &    # Port 5173
npm run preview & # Port 4173 - conflict!
```

## Protocol for Making Changes

### For Small Changes (no config):
1. Keep preview server running
2. Make changes
3. Run `npm run build`
4. Refresh browser (server auto-serves new build)

### For Config Changes:
1. Stop preview server: `pkill -f "npm.*preview"`
2. Make configuration changes
3. Follow complete stable launch process above

### For Major Changes:
1. Complete environment reset (step 1)
2. Make all changes
3. Fresh stable launch (steps 2-4)

## Troubleshooting

### Server Won't Start:
```bash
# Check for port conflicts
lsof -i :4173

# Check build output
ls -la dist/

# Check logs
cat preview.log
```

### App Not Loading:
```bash
# Verify server response
curl -v http://localhost:4173/

# Check for missing files
ls -la dist/assets/
```

### Performance Issues:
- Always use production builds for stability
- Restart server if running >1 hour
- Clear browser cache if needed

## Success Indicators

✅ Server starts without errors  
✅ HTTP 200 response from curl  
✅ App loads in browser  
✅ No console errors  
✅ PDF preview works without CORS errors  
✅ Server survives configuration changes

## Known Issues & Fixes

### PDF.js Worker 404 Error
**Symptom**: `GET http://localhost:4173/assets/pdfjs-dist/build/pdf.worker.min.js net::ERR_ABORTED 404`

**Cause**: Production build doesn't include PDF.js worker at expected path

**Solution**: Use CDN fallback approach in `fileProcessing.ts`  

## Notes for Future Sessions

- **ALWAYS** start with stable launch process
- **NEVER** use dev server for extended work
- **ALWAYS** reset environment before major changes
- Document any deviations that cause instability
- Production builds are your friend - use them!

---
*This process was developed after recurring server instability issues across multiple sessions. It addresses the root causes systematically.*