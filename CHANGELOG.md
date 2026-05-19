# Sprint Timer - Changelog

## Version 62 (Latest) - 2026-05-19

### ✅ Implemented Features

#### 1. Motion Detection Threshold Adjustment
- **Changed:** Threshold increased from 25 to 30
- **Location:** `js/detector.js` line 17
- **Reason:** Reduced false triggers from standing/small movements
- **Status:** ✅ Complete

#### 2. Photo Modal Viewer
- **Feature:** Click any photo to view it in a large modal
- **Implementation:**
  - Added photo modal HTML in `index.html`
  - Added `showPhotoModal()` function in `js/app.js`
  - Added click handlers to all photos in `displayAllPhotos()`
  - Added modal CSS styles in `css/style.css`
- **User Experience:** 
  - Click any race photo to see it full-screen
  - Click overlay or X button to close
- **Status:** ✅ Complete

#### 3. PDF Download Functionality
- **Feature:** Download result screen as PDF with photos
- **Implementation:**
  - Added jsPDF library (CDN) in `index.html`
  - Created `generatePDF()` function in `js/app.js`
  - Connected to "PDF İndir" button
- **PDF Contents:**
  - Race title and total time
  - Distance, date, time
  - Athlete name and notes (if provided)
  - Split times (for 3+ phone races)
  - All race photos with labels
- **Status:** ✅ Complete

#### 4. Vertical Photo Layout
- **Changed:** Photos now display vertically (alt alta) instead of horizontal grid
- **Location:** `css/style.css` - `.race-photos` section
- **Layout:**
  - Flex column direction
  - Max height: 300px with scroll
  - Photo height: 100px each
  - Cursor pointer with hover effects
- **Status:** ✅ Complete

### Technical Details

**Files Modified:**
1. `js/detector.js` - Threshold: 25 → 30
2. `js/app.js` - Added photo modal and PDF generation
3. `css/style.css` - Photo modal styles
4. `index.html` - Photo modal HTML + jsPDF library
5. `service-worker.js` - Cache version: v61 → v62

**Deployment:**
- Pushed to GitHub: ✅
- Render auto-deploy: In progress
- URL: https://sprint-timer.onrender.com

### Testing Checklist

- [ ] Test motion detection with threshold 30
- [ ] Click photos to open modal
- [ ] Close modal with X button
- [ ] Close modal by clicking overlay
- [ ] Download PDF with all race data
- [ ] Verify PDF contains photos
- [ ] Check vertical photo layout with scroll

### Next Steps (Future Improvements)

1. **Photo Quality:** Consider higher resolution captures
2. **PDF Customization:** Add logo, custom branding
3. **Photo Editing:** Crop, rotate, annotate photos
4. **Cloud Storage:** Save results to cloud
5. **Statistics:** Track athlete progress over time
6. **Export Options:** CSV, JSON export

---

## Previous Versions

### Version 61
- Fixed camera initialization on Start phone
- Added detailed error logging
- Improved camera startup tracking

### Version 60
- Vertical photo layout implementation
- Improved photo display with captions

### Version 59
- Initial photo capture feature
- Split times display

---

**Last Updated:** 2026-05-19
**Deployed URL:** https://sprint-timer.onrender.com
**Repository:** https://github.com/key3-glitch/sprint-timer
